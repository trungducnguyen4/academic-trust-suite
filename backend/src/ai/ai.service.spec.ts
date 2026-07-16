import { AiService } from './ai.service';

describe('AiService.generateExamQualityReview', () => {
  const questionStats = [
    {
      questionId: 'q1',
      questionVersionId: 'qv1',
      questionText: 'What is 2+2?',
      totalAttempts: 8,
      correctRate: 12.5,
      incorrectRate: 87.5,
      skipRate: 0,
      avgTimeSeconds: 40,
      difficultyIndex: 0.9,
      discriminationIndex: -0.2,
    },
  ];

  const examSummary = { totalSubmissions: 8, avgScorePct: 55, passRate: 40, completionRate: 80 };

  const buildConfigService = (values: Record<string, string>) => ({
    get: (key: string) => values[key],
  });

  describe('success flow (mock provider)', () => {
    it('returns a well-formed overallSummary and suggestions array', async () => {
      const service = new AiService(buildConfigService({ AI_PROVIDER: 'mock' }) as any);

      const result = await service.generateExamQualityReview({
        examTitle: 'Midterm Exam',
        examSummary,
        questionStats,
        language: 'en',
      });

      expect(typeof result.overallSummary).toBe('string');
      expect(result.overallSummary.length).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestions)).toBe(true);
      result.suggestions.forEach((s) => {
        expect(questionStats.some((q) => q.questionId === s.questionId)).toBe(true);
        expect(['high', 'medium', 'low']).toContain(s.severity);
      });
    });

    it('drops suggestions whose questionId is not part of the supplied stats', async () => {
      const service = new AiService(buildConfigService({ AI_PROVIDER: 'mock' }) as any);
      // Force a provider response with a hallucinated question id by monkey-patching the private caller.
      (service as any).provider = 'local';
      (service as any).localUrl = 'http://fake-local-model';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            overallSummary: 'Mixed quality overall.',
            suggestions: [
              { questionId: 'q1', severity: 'high', reasonSummary: 'r1', recommendation: 'rec1' },
              { questionId: 'does-not-exist', severity: 'high', reasonSummary: 'r2', recommendation: 'rec2' },
            ],
          }),
      }) as any;

      const result = await service.generateExamQualityReview({
        examTitle: 'Midterm Exam',
        examSummary,
        questionStats,
        language: 'en',
      });

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].questionId).toBe('q1');
    });
  });

  describe('AI provider error', () => {
    it('throws a descriptive error when the provider request fails', async () => {
      const service = new AiService(buildConfigService({ AI_PROVIDER: 'local' }) as any);
      (service as any).localUrl = 'http://fake-local-model';
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'Service unavailable' }) as any;

      await expect(
        service.generateExamQualityReview({
          examTitle: 'Midterm Exam',
          examSummary,
          questionStats,
          language: 'en',
        }),
      ).rejects.toThrow('AI generation failed');
    });

    it('throws a descriptive error when the provider returns invalid JSON', async () => {
      const service = new AiService(buildConfigService({ AI_PROVIDER: 'local' }) as any);
      (service as any).localUrl = 'http://fake-local-model';
      global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'not json at all' }) as any;

      await expect(
        service.generateExamQualityReview({
          examTitle: 'Midterm Exam',
          examSummary,
          questionStats,
          language: 'en',
        }),
      ).rejects.toThrow('AI generation failed');
    });

    it('throws when the provider returns a JSON shape missing the required fields', async () => {
      const service = new AiService(buildConfigService({ AI_PROVIDER: 'local' }) as any);
      (service as any).localUrl = 'http://fake-local-model';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ unexpected: true }),
      }) as any;

      await expect(
        service.generateExamQualityReview({
          examTitle: 'Midterm Exam',
          examSummary,
          questionStats,
          language: 'en',
        }),
      ).rejects.toThrow('AI generation failed');
    });
  });
});
