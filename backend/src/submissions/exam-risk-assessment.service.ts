import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiJobsService } from '../ai/ai-jobs.service';
import { AISection } from '../questions-v2/dto/question-draft.dto';
import { ReviewAnomalyFlagDto } from './dto/risk-assessment.dto';

interface RequestUser {
  id: string;
  role: string;
}

const TOO_FAST_ANSWER_SECONDS = 3;

@Injectable()
export class ExamRiskAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobsService: AiJobsService,
  ) {}

  async requestAssessment(submissionId: string, user: RequestUser) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        examId: true,
        examInstanceId: true,
        attemptNo: true,
        score: true,
        startedAt: true,
        submittedAt: true,
        exam: { select: { title: true, duration: true, course: { select: { name: true } } } },
        proctoring: {
          select: {
            tabSwitchCount: true,
            mouseAnomalies: true,
            logs: { select: { eventType: true } },
          },
        },
        answers: { select: { timeTaken: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const answers = submission.answers || [];
    const logs = submission.proctoring?.logs || [];

    if (answers.length === 0 && logs.length === 0) {
      throw new BadRequestException(
        'Not enough behavioral data to assess integrity risk. The student has not answered any questions or triggered any proctoring events yet.',
      );
    }

    const eventBreakdown: Record<string, number> = {};
    for (const log of logs) {
      const key = String(log.eventType || 'unknown').toLowerCase();
      eventBreakdown[key] = (eventBreakdown[key] || 0) + 1;
    }

    const tabSwitchCount = submission.proctoring?.tabSwitchCount || 0;
    const mouseAnomalies = submission.proctoring?.mouseAnomalies || 0;
    const fullscreenExitCount = eventBreakdown['fullscreen_exit'] || 0;
    const focusLossCount = eventBreakdown['blur'] || 0;
    const pageHiddenCount = eventBreakdown['tab_switch'] || tabSwitchCount;
    const tooFastAnswerCount = answers.filter(
      (a) => a.timeTaken !== null && a.timeTaken !== undefined && a.timeTaken < TOO_FAST_ANSWER_SECONDS,
    ).length;

    const startedAt = submission.startedAt ? new Date(submission.startedAt) : null;
    const endedAt = submission.submittedAt ? new Date(submission.submittedAt) : new Date();
    const timeSpentMinutes = startedAt
      ? Number(((endedAt.getTime() - startedAt.getTime()) / 60000).toFixed(1))
      : null;

    const record = await this.aiJobsService.createJob({
      task: 'exam-risk-assessment',
      examId: submission.examId,
      submissionId: submission.id,
      section: AISection.RISK_ASSESSMENT,
      payload: {
        examId: submission.examId,
        submissionId: submission.id,
        examInstanceId: submission.examInstanceId,
        submissionSummary: {
          attemptNo: submission.attemptNo,
          score: submission.score ?? null,
          durationMinutes: submission.exam?.duration ?? null,
          timeSpentMinutes,
        },
        signals: {
          tabSwitchCount,
          mouseAnomalies,
          fullscreenExitCount,
          focusLossCount,
          pageHiddenCount,
          tooFastAnswerCount,
          totalAnswers: answers.length,
          totalIntegrityEvents: logs.length,
          eventBreakdown,
        },
        language: 'vi',
      },
      requestedBy: user.id,
    });

    return { jobId: record.id, status: record.status };
  }

  async getJob(submissionId: string, jobId: string, _user: RequestUser) {
    const job = await this.prisma.aIGenerationRecord.findFirst({
      where: { id: jobId, submissionId },
    });
    if (!job) {
      throw new NotFoundException('Risk assessment job not found');
    }

    const flag = await this.prisma.anomalyFlag.findFirst({ where: { jobId: job.id } });

    return { ...job, flag };
  }

  async listFlags(examId: string, _user: RequestUser, status?: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const validStatuses = ['OPEN', 'REVIEWED', 'DISMISSED', 'CONFIRMED'];
    const normalizedStatus = status && validStatuses.includes(status.toUpperCase())
      ? (status.toUpperCase() as 'OPEN' | 'REVIEWED' | 'DISMISSED' | 'CONFIRMED')
      : undefined;

    return this.prisma.anomalyFlag.findMany({
      where: {
        examInstance: { examId },
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
      },
      include: {
        examInstance: {
          select: {
            studentId: true,
            student: { select: { id: true, fullName: true, studentId: true } },
          },
        },
        job: { select: { id: true, submissionId: true, output: true, createdAt: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewFlag(flagId: string, dto: ReviewAnomalyFlagDto, user: RequestUser) {
    const flag = await this.prisma.anomalyFlag.findUnique({ where: { id: flagId } });
    if (!flag) {
      throw new NotFoundException('Anomaly flag not found');
    }

    return this.prisma.anomalyFlag.update({
      where: { id: flagId },
      data: {
        status: dto.status as unknown as 'REVIEWED' | 'DISMISSED' | 'CONFIRMED',
        reviewerId: user.id,
        reviewedAt: new Date(),
        notes: dto.notes ?? null,
      },
    });
  }
}
