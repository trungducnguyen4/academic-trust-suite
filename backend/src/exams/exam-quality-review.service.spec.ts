import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamQualityReviewService } from './exam-quality-review.service';

describe('ExamQualityReviewService', () => {
  const examId = 'exam-1';
  const user = { id: 'lecturer-1', role: 'LECTURER' };

  const buildIntelligence = (overrides: Partial<any> = {}) => ({
    kpis: {
      totalSubmissions: 10,
      analyzedSubmissions: 8,
      avgScorePct: 72.5,
      passRate: 60,
      completionRate: 80,
    },
    questionMetrics: [
      {
        questionId: 'q1',
        questionVersionId: 'qv1',
        questionText: 'What is 2+2?',
        incorrectRate: 80,
        skipRate: 10,
        avgTimeSeconds: 45,
        difficultyIndex: 0.85,
        discriminationIndex: -0.1,
        correctCount: 1,
        incorrectCount: 7,
        skippedCount: 1,
      },
    ],
    ...overrides,
  });

  const buildService = (overrides: {
    intelligence?: any;
    examExists?: boolean;
    createJobResult?: any;
  } = {}) => {
    const prisma = {
      exam: {
        findUnique: jest.fn().mockResolvedValue(
          overrides.examExists === false ? null : { id: examId, title: 'Midterm' },
        ),
      },
      examQualityReviewItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      aIGenerationRecord: {
        findFirst: jest.fn(),
      },
    };
    const submissionsService = {
      getExamIntelligence: jest.fn().mockResolvedValue(
        overrides.intelligence ?? buildIntelligence(),
      ),
    };
    const aiJobsService = {
      createJob: jest.fn().mockResolvedValue(
        overrides.createJobResult ?? { id: 'job-1', status: 'QUEUED' },
      ),
    };

    const service = new ExamQualityReviewService(
      prisma as any,
      submissionsService as any,
      aiJobsService as any,
    );

    return { service, prisma, submissionsService, aiJobsService };
  };

  describe('requestReview - success flow', () => {
    it('creates an AI job seeded with real per-question statistics', async () => {
      const { service, aiJobsService } = buildService();

      const result = await service.requestReview(examId, user);

      expect(result).toEqual({ jobId: 'job-1', status: 'QUEUED' });
      expect(aiJobsService.createJob).toHaveBeenCalledTimes(1);

      const jobArgs = aiJobsService.createJob.mock.calls[0][0];
      expect(jobArgs.task).toBe('exam-quality-review');
      expect(jobArgs.examId).toBe(examId);
      expect(jobArgs.requestedBy).toBe(user.id);
      expect(jobArgs.payload.examSummary.totalSubmissions).toBe(10);
      expect(jobArgs.payload.questionStats).toHaveLength(1);
      expect(jobArgs.payload.questionStats[0]).toMatchObject({
        questionId: 'q1',
        questionVersionId: 'qv1',
        incorrectRate: 80,
        skipRate: 10,
        difficultyIndex: 0.85,
        discriminationIndex: -0.1,
      });
    });

    it('throws NotFoundException when the exam does not exist', async () => {
      const { service, aiJobsService } = buildService({ examExists: false });

      await expect(service.requestReview(examId, user)).rejects.toThrow(NotFoundException);
      expect(aiJobsService.createJob).not.toHaveBeenCalled();
    });
  });

  describe('requestReview - insufficient data', () => {
    it('rejects with BadRequestException and never calls the AI job when there are no completed submissions', async () => {
      const { service, aiJobsService, submissionsService } = buildService({
        intelligence: buildIntelligence({
          kpis: {
            totalSubmissions: 0,
            analyzedSubmissions: 0,
            avgScorePct: 0,
            passRate: 0,
            completionRate: 0,
          },
        }),
      });

      await expect(service.requestReview(examId, user)).rejects.toThrow(BadRequestException);
      expect(submissionsService.getExamIntelligence).toHaveBeenCalledWith(examId);
      expect(aiJobsService.createJob).not.toHaveBeenCalled();
    });
  });

  describe('reviewSuggestion', () => {
    it('records the lecturer decision and reviewer metadata', async () => {
      const { service, prisma } = buildService();
      prisma.examQualityReviewItem.findUnique.mockResolvedValue({ id: 'item-1' });
      prisma.examQualityReviewItem.update.mockResolvedValue({
        id: 'item-1',
        reviewStatus: 'APPROVED',
        reviewNotes: 'Looks good',
      });

      const result = await service.reviewSuggestion(
        'item-1',
        { decision: 'APPROVED' as any, notes: 'Looks good' },
        user,
      );

      expect(prisma.examQualityReviewItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          reviewStatus: 'APPROVED',
          reviewedBy: user.id,
          reviewNotes: 'Looks good',
        }),
      });
      expect(result.reviewStatus).toBe('APPROVED');
    });

    it('throws NotFoundException when the suggestion does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.examQualityReviewItem.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewSuggestion('missing-item', { decision: 'REJECTED' as any }, user),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
