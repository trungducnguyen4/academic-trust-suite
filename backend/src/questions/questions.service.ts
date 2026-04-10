import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';

interface AuthUser {
  id: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  private async assertCourseAccessible(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, lecturerId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role === 'LECTURER' && course.lecturerId !== user.id) {
      throw new ForbiddenException('You are not allowed to use this course');
    }
  }

  private assertCanAccessQuestion(question: { creatorId: string | null; courseId: string | null }, user: AuthUser) {
    if (user.role === 'ADMIN') return;

    if (user.role !== 'LECTURER' || question.creatorId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this question');
    }
  }

  async create(createQuestionDto: CreateQuestionDto, user: AuthUser) {
    const { tags, ...questionData } = createQuestionDto;

    if (questionData.courseId) {
      await this.assertCourseAccessible(questionData.courseId, user);
    } else if (user.role === 'LECTURER') {
      throw new BadRequestException('Course is required for lecturer-created questions');
    }

    return this.prisma.question.create({
      data: {
        ...questionData,
        tags: tags ? JSON.stringify(tags) : null,
        creatorId: user.id,
      },
    });
  }

  async findAll(filters?: {
    creatorId?: string;
    courseId?: string;
    type?: string;
    difficulty?: number;
    search?: string;
  }, pagination?: PaginationDto) {
    const where: any = {};

    if (filters?.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters?.courseId) {
      where.courseId = filters.courseId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters?.search) {
      where.content = {
        contains: filters.search,
      };
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    // Parse tags for each question
    const parsed = questions.map((q) => ({
      ...q,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }));

    return buildPaginatedResult(parsed, total, page, limit);
  }

  async findOne(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);

    return {
      ...question,
      tags: question.tags ? JSON.parse(question.tags) : [],
    };
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto, user: AuthUser) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);

    const { tags, ...questionData } = updateQuestionDto;

    return this.prisma.question.update({
      where: { id },
      data: {
        ...questionData,
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanAccessQuestion(question, user);

    await this.prisma.question.delete({ where: { id } });

    return { message: 'Question deleted successfully' };
  }

  async getQuestionsByTags(tags: string[], creatorId?: string) {
    const questions = await this.prisma.question.findMany({
      where: creatorId ? { creatorId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    // Filter questions that have any of the specified tags
    return questions
      .filter((q) => {
        if (!q.tags) return false;
        const questionTags = JSON.parse(q.tags);
        return tags.some((tag) => questionTags.includes(tag));
      })
      .map((q) => ({
        ...q,
        tags: q.tags ? JSON.parse(q.tags) : [],
      }));
  }

  async getQuestionStats(creatorId?: string) {
    const where = creatorId ? { creatorId } : {};

    const [total, byType, byDifficulty] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.question.groupBy({
        by: ['difficulty'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      byDifficulty: byDifficulty.map((item) => ({
        difficulty: item.difficulty,
        count: item._count,
      })),
    };
  }
}
