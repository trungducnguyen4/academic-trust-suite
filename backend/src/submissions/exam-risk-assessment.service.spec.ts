import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamRiskAssessmentService } from './exam-risk-assessment.service';

describe('ExamRiskAssessmentService', () => {
  const submissionId = 'submission-1';
  const examId = 'exam-1';
  const examInstanceId = 'instance-1';
  const user = { id: 'lecturer-1', role: 'LECTURER' };

  const buildSubmission = (overrides: Partial<any> = {}) => ({
    id: submissionId,
    examId,
    examInstanceId,
    attemptNo: 1,
    score: 70,
    startedAt: new Date('2026-01-01T10:00:00Z'),
    submittedAt: new Date('2026-01-01T10:45:00Z'),
    exam: { title: 'Midterm', duration: 60, course: { name: 'CS101' } },
    proctoring: {
      tabSwitchCount: 3,
      mouseAnomalies: 1,
      logs: [
        { eventType: 'tab_switch' },
        { eventType: 'tab_switch' },
        { eventType: 'fullscreen_exit' },
      ],
    },
    answers: [{ timeTaken: 12 }, { timeTaken: 1 }, { timeTaken: 45 }],
    ...overrides,
  });

  const buildService = (overrides: { submission?: any; createJobResult?: any } = {}) => {
    const prisma = {
      examSubmission: {
        findUnique: jest.fn().mockResolvedValue(
          overrides.submission === null ? null : overrides.submission ?? buildSubmission(),
        ),
      },
      anomalyFlag: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      aIGenerationRecord: {
        findFirst: jest.fn(),
      },
      exam: {
        findUnique: jest.fn().mockResolvedValue({ id: examId }),
      },
    };
    const aiJobsService = {
      createJob: jest.fn().mockResolvedValue(
        overrides.createJobResult ?? { id: 'job-1', status: 'QUEUED' },
      ),
    };

    const service = new ExamRiskAssessmentService(prisma as any, aiJobsService as any);
    return { service, prisma, aiJobsService };
  };

  describe('requestAssessment - success flow', () => {
    it('aggregates real behavioral signals and enqueues an AI job', async () => {
      const { service, aiJobsService } = buildService();

      const result = await service.requestAssessment(submissionId, user);

      expect(result).toEqual({ jobId: 'job-1', status: 'QUEUED' });
      expect(aiJobsService.createJob).toHaveBeenCalledTimes(1);

      const jobArgs = aiJobsService.createJob.mock.calls[0][0];
      expect(jobArgs.task).toBe('exam-risk-assessment');
      expect(jobArgs.examId).toBe(examId);
      expect(jobArgs.submissionId).toBe(submissionId);
      expect(jobArgs.requestedBy).toBe(user.id);
      expect(jobArgs.payload.examInstanceId).toBe(examInstanceId);
      expect(jobArgs.payload.signals).toMatchObject({
        tabSwitchCount: 3,
        mouseAnomalies: 1,
        fullscreenExitCount: 1,
        pageHiddenCount: 2,
        tooFastAnswerCount: 1, // only the 1-second answer is under the 3s threshold
        totalAnswers: 3,
        totalIntegrityEvents: 3,
      });
      expect(jobArgs.payload.submissionSummary).toMatchObject({
        attemptNo: 1,
        score: 70,
        durationMinutes: 60,
      });
    });

    it('throws NotFoundException when the submission does not exist', async () => {
      const { service, aiJobsService } = buildService({ submission: null });

      await expect(service.requestAssessment(submissionId, user)).rejects.toThrow(NotFoundException);
      expect(aiJobsService.createJob).not.toHaveBeenCalled();
    });
  });

  describe('requestAssessment - insufficient data', () => {
    it('rejects with BadRequestException when there are no answers and no proctoring events', async () => {
      const { service, aiJobsService } = buildService({
        submission: buildSubmission({
          proctoring: null,
          answers: [],
        }),
      });

      await expect(service.requestAssessment(submissionId, user)).rejects.toThrow(BadRequestException);
      expect(aiJobsService.createJob).not.toHaveBeenCalled();
    });
  });

  describe('reviewFlag', () => {
    it('records the lecturer decision and reviewer metadata', async () => {
      const { service, prisma } = buildService();
      prisma.anomalyFlag.findUnique.mockResolvedValue({ id: 'flag-1' });
      prisma.anomalyFlag.update.mockResolvedValue({
        id: 'flag-1',
        status: 'CONFIRMED',
        reviewNotes: 'Escalating',
      });

      const result = await service.reviewFlag(
        'flag-1',
        { status: 'CONFIRMED' as any, notes: 'Escalating' },
        user,
      );

      expect(prisma.anomalyFlag.update).toHaveBeenCalledWith({
        where: { id: 'flag-1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          reviewerId: user.id,
          notes: 'Escalating',
        }),
      });
      expect(result.status).toBe('CONFIRMED');
    });

    it('throws NotFoundException when the flag does not exist', async () => {
      const { service, prisma } = buildService();
      prisma.anomalyFlag.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewFlag('missing-flag', { status: 'DISMISSED' as any }, user),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
