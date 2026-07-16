import { AiService } from './ai.service';

describe('AiService.assessExamIntegrityRisk', () => {
  const submissionSummary = { attemptNo: 1, score: 72, durationMinutes: 60, timeSpentMinutes: 45 };
  const signals = {
    tabSwitchCount: 1,
    mouseAnomalies: 0,
    fullscreenExitCount: 0,
    focusLossCount: 0,
    pageHiddenCount: 1,
    tooFastAnswerCount: 0,
    totalAnswers: 10,
    totalIntegrityEvents: 1,
    eventBreakdown: { tab_switch: 1 },
  };

  const buildConfigService = (values: Record<string, string>) => ({
    get: (key: string) => values[key],
  });

  const buildLocalService = () => {
    const service = new AiService(buildConfigService({ AI_PROVIDER: 'local' }) as any);
    (service as any).localUrl = 'http://fake-local-model';
    return service;
  };

  const mockFetchReturning = (payload: any) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(payload),
    }) as any;
  };

  describe('risk level classification', () => {
    it('classifies a low-risk assessment (riskScore < 35)', async () => {
      const service = buildLocalService();
      mockFetchReturning({
        riskScore: 12,
        riskLevel: 'LOW',
        signals: [],
        explanation: 'Behavior is within normal range.',
        recommendReview: false,
      });

      const result = await service.assessExamIntegrityRisk({
        examTitle: 'Midterm',
        submissionSummary,
        signals,
      });

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBe(12);
      expect(result.recommendReview).toBe(false);
    });

    it('classifies a medium-risk assessment (35 <= riskScore < 70)', async () => {
      const service = buildLocalService();
      mockFetchReturning({
        riskScore: 50,
        riskLevel: 'MEDIUM',
        signals: [
          { type: 'tab_switch', description: 'Several tab switches recorded.', weight: 0.4 },
        ],
        explanation: 'Some elevated signals warrant a look.',
        recommendReview: false,
      });

      const result = await service.assessExamIntegrityRisk({
        examTitle: 'Midterm',
        submissionSummary,
        signals,
      });

      expect(result.riskLevel).toBe('MEDIUM');
      // recommendReview must be forced true for MEDIUM/HIGH regardless of the model's own field.
      expect(result.recommendReview).toBe(true);
      expect(result.signals).toHaveLength(1);
    });

    it('classifies a high-risk assessment (riskScore >= 70)', async () => {
      const service = buildLocalService();
      mockFetchReturning({
        riskScore: 88,
        riskLevel: 'HIGH',
        signals: [
          { type: 'fullscreen_exit', description: 'Exited fullscreen 4 times.', weight: 0.6 },
          { type: 'too_fast_answers', description: '5 answers submitted in under 3 seconds.', weight: 0.4 },
        ],
        explanation: 'Multiple elevated signals detected.',
        recommendReview: true,
      });

      const result = await service.assessExamIntegrityRisk({
        examTitle: 'Midterm',
        submissionSummary,
        signals,
      });

      expect(result.riskLevel).toBe('HIGH');
      expect(result.recommendReview).toBe(true);
      expect(result.signals).toHaveLength(2);
    });

    it('recomputes riskLevel from riskScore even if the model mislabels it', async () => {
      const service = buildLocalService();
      mockFetchReturning({
        riskScore: 95,
        riskLevel: 'LOW', // deliberately wrong/inconsistent label from the model
        signals: [],
        explanation: 'Inconsistent label test.',
        recommendReview: false,
      });

      const result = await service.assessExamIntegrityRisk({
        examTitle: 'Midterm',
        submissionSummary,
        signals,
      });

      expect(result.riskLevel).toBe('HIGH');
    });

    it('never claims the student cheated verbatim and never auto-concludes - only structured risk output is trusted', async () => {
      const service = buildLocalService();
      mockFetchReturning({
        riskScore: 80,
        riskLevel: 'HIGH',
        signals: [{ type: 'tab_switch', description: 'Elevated tab-switch frequency.', weight: 0.7 }],
        explanation: 'Elevated tab-switch frequency observed; recommend lecturer review.',
        recommendReview: true,
      });

      const result = await service.assessExamIntegrityRisk({
        examTitle: 'Midterm',
        submissionSummary,
        signals,
      });

      expect(result).not.toHaveProperty('verdict');
      expect(result).not.toHaveProperty('cheated');
      expect(result.riskLevel).toBe('HIGH');
    });
  });

  describe('AI provider error', () => {
    it('throws a descriptive error when the provider request fails', async () => {
      const service = buildLocalService();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' }) as any;

      await expect(
        service.assessExamIntegrityRisk({ examTitle: 'Midterm', submissionSummary, signals }),
      ).rejects.toThrow('AI generation failed');
    });

    it('throws a descriptive error when the provider returns invalid JSON', async () => {
      const service = buildLocalService();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'not json' }) as any;

      await expect(
        service.assessExamIntegrityRisk({ examTitle: 'Midterm', submissionSummary, signals }),
      ).rejects.toThrow('AI generation failed');
    });

    it('throws when the provider response is missing required fields', async () => {
      const service = buildLocalService();
      mockFetchReturning({ unexpected: true });

      await expect(
        service.assessExamIntegrityRisk({ examTitle: 'Midterm', submissionSummary, signals }),
      ).rejects.toThrow('AI generation failed');
    });
  });
});
