import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { AiJobsService } from '../ai/ai-jobs.service';
import { AISection } from '../questions-v2/dto/question-draft.dto';
import { ReviewQualitySuggestionDto } from './dto/exam-quality-review.dto';

interface RequestUser {
  id: string;
  role: string;
}

const MIN_ANALYZED_SUBMISSIONS = 1;

@Injectable()
export class ExamQualityReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionsService: SubmissionsService,
    private readonly aiJobsService: AiJobsService,
  ) {}

  async requestReview(examId: string, user: RequestUser) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const intelligence = await this.submissionsService.getExamIntelligence(examId);
    const analyzedSubmissions = intelligence.kpis?.analyzedSubmissions || 0;

    if (analyzedSubmissions < MIN_ANALYZED_SUBMISSIONS) {
      throw new BadRequestException(
        'Not enough submission data to generate an AI quality review. At least one completed submission is required.',
      );
    }

    const questionStats = (intelligence.questionMetrics || []).map((q: any) => ({
      questionId: q.questionId,
      questionVersionId: q.questionVersionId,
      questionText: q.questionText,
      totalAttempts: q.correctCount + q.incorrectCount + q.skippedCount,
      correctRate: Math.max(0, 100 - q.incorrectRate - q.skipRate),
      incorrectRate: q.incorrectRate,
      skipRate: q.skipRate,
      avgTimeSeconds: q.avgTimeSeconds,
      difficultyIndex: q.difficultyIndex,
      discriminationIndex: q.discriminationIndex,
    }));

    const record = await this.aiJobsService.createJob({
      task: 'exam-quality-review',
      examId,
      section: AISection.QUALITY_REVIEW,
      payload: {
        examId,
        examSummary: {
          totalSubmissions: intelligence.kpis?.totalSubmissions || 0,
          avgScorePct: intelligence.kpis?.avgScorePct ?? null,
          passRate: intelligence.kpis?.passRate ?? null,
          completionRate: intelligence.kpis?.completionRate ?? null,
        },
        questionStats,
        language: 'vi',
      },
      requestedBy: user.id,
    });

    return { jobId: record.id, status: record.status };
  }

  async getJob(examId: string, jobId: string, _user: RequestUser) {
    const job = await this.prisma.aIGenerationRecord.findFirst({
      where: { id: jobId, examId },
      include: {
        qualityReviewItems: {
          include: {
            question: { select: { id: true, content: true, type: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Quality review job not found');
    }

    return job;
  }

  async listSuggestions(examId: string, _user: RequestUser, status?: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'];
    const normalizedStatus = status && validStatuses.includes(status.toUpperCase())
      ? (status.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES')
      : undefined;

    return this.prisma.examQualityReviewItem.findMany({
      where: {
        job: { examId },
        ...(normalizedStatus ? { reviewStatus: normalizedStatus } : {}),
      },
      include: {
        question: { select: { id: true, content: true, type: true } },
        job: { select: { id: true, createdAt: true, output: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewSuggestion(itemId: string, dto: ReviewQualitySuggestionDto, user: RequestUser) {
    const item = await this.prisma.examQualityReviewItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Suggestion not found');
    }

    return this.prisma.examQualityReviewItem.update({
      where: { id: itemId },
      data: {
        reviewStatus: dto.decision as unknown as 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: dto.notes ?? null,
      },
    });
  }
}
