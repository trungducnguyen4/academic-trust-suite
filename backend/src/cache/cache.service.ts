import { Injectable } from '@nestjs/common';
import { RedisService, DEFAULT_REDIS } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CacheService {
  private readonly EXAM_CACHE_TTL = 5 * 60; // 5 minutes
  private readonly QUESTION_CACHE_TTL = 3 * 60; // 3 minutes
  private readonly SUBMISSION_CACHE_TTL = 60; // 1 minute
  private readonly redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.redis = this.redisService.getOrThrow(DEFAULT_REDIS);
  }

  // Exam caching
  async getExamForStudent(examId: string): Promise<any> {
    const cacheKey = `exam:${examId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (exam) {
      await this.redis.setex(
        cacheKey,
        this.EXAM_CACHE_TTL,
        JSON.stringify(exam),
      );
    }

    return exam;
  }

  // Question list caching
  async getQuestionsList(
    creatorId: string,
    courseId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const filtersKey = JSON.stringify(filters);
    const cacheKey = `questions:${creatorId}:${courseId}:${filtersKey}:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch questions with pagination
    const skip = (page - 1) * limit;
    const questions = await this.prisma.question.findMany({
      where: {
        creatorId,
        courseId,
        ...this.buildFilters(filters),
      },
      skip,
      take: limit,
      include: {
        tags: true,
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const total = await this.prisma.question.count({
      where: {
        creatorId,
        courseId,
        ...this.buildFilters(filters),
      },
    });

    const result = {
      items: questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    await this.redis.setex(
      cacheKey,
      this.QUESTION_CACHE_TTL,
      JSON.stringify(result),
    );

    return result;
  }

  // Submission caching
  async getSubmissionAnswers(submissionId: string): Promise<any> {
    const cacheKey = `submission:${submissionId}:answers`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const answers = await this.prisma.submissionAnswer.findMany({
      where: { submissionId },
    });

    await this.redis.setex(
      cacheKey,
      this.SUBMISSION_CACHE_TTL,
      JSON.stringify(answers),
    );

    return answers;
  }

  // Cache invalidation methods
  async invalidateExamCache(examId: string): Promise<void> {
    await this.redis.del(`exam:${examId}`);
  }

  async invalidateQuestionsCacheForCreator(creatorId: string): Promise<void> {
    const pattern = `questions:${creatorId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateSubmissionCache(submissionId: string): Promise<void> {
    await this.redis.del(`submission:${submissionId}:answers`);
  }

  // Clear all caches (use with caution)
  async clearAllCaches(): Promise<void> {
    await this.redis.flushdb();
  }

  private buildFilters(filters: any): any {
    const result: any = {};

    if (filters.status) {
      result.status = filters.status;
    }

    if (filters.courseId) {
      result.courseId = filters.courseId;
    }

    if (filters.tags && filters.tags.length > 0) {
      result.tags = {
        some: {
          id: { in: filters.tags },
        },
      };
    }

    if (filters.search) {
      result.OR = [
        { content: { contains: filters.search } },
        { metadata: { path: ['title'], string_contains: filters.search } },
      ];
    }

    return result;
  }
}
