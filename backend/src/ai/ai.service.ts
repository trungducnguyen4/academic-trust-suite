import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import {
  buildExamTrustPromptHeader,
  ExamTrustAiContext,
  getOllamaGenerationOptions,
  OllamaGenerationOptions,
} from './ai-profile';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private nvidiaAI: OpenAI;
  private openRouterAI: OpenAI;
  private model: any;
  private provider: string;
  private localUrl: string | undefined;
  private ollamaUrl: string;
  private ollamaModel: string;
  private nvidiaModel: string;
  private openRouterModel: string;
  private appName: string;
  private defaultLanguage: string;
  private ollamaTemperature: number;
  private ollamaTopP: number;
  private ollamaRepeatPenalty: number;
  private ollamaNumCtx: number;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.provider = this.configService.get<string>('AI_PROVIDER') || 'google';
    this.localUrl = this.configService.get<string>('AI_LOCAL_URL') || undefined;
    this.ollamaUrl = this.configService.get<string>('AI_OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('AI_OLLAMA_MODEL') || 'gemma3:4b';
    this.nvidiaModel = this.configService.get<string>('AI_NVIDIA_MODEL') || 'z-ai/glm-5.2';
    this.openRouterModel = this.configService.get<string>('AI_OPENROUTER_MODEL') || 'nvidia/nemotron-3-ultra-550b-a55b:free';
    this.appName = this.configService.get<string>('AI_APP_NAME') || 'Academic Trust Suite';
    this.defaultLanguage = this.configService.get<string>('AI_DEFAULT_LANGUAGE') || 'vi';
    this.ollamaTemperature = Number(this.configService.get<string>('AI_OLLAMA_TEMPERATURE') || 0.2);
    this.ollamaTopP = Number(this.configService.get<string>('AI_OLLAMA_TOP_P') || 0.85);
    this.ollamaRepeatPenalty = Number(this.configService.get<string>('AI_OLLAMA_REPEAT_PENALTY') || 1.1);
    this.ollamaNumCtx = Number(this.configService.get<string>('AI_OLLAMA_NUM_CTX') || 8192);

    if (this.provider === 'google') {
      if (!apiKey) {
        this.logger.warn('GOOGLE_AI_API_KEY not set. AI features will not work.');
      }
      this.genAI = new GoogleGenerativeAI(apiKey || '');
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } else if (this.provider === 'ollama') {
      this.logger.log(`AI provider: Ollama @ ${this.ollamaUrl} (model: ${this.ollamaModel})`);
    } else if (this.provider === 'nvidia') {
      const nvidiaApiKey = this.configService.get<string>('NVIDIA_API_KEY');
      const nvidiaBaseUrl = this.configService.get<string>('AI_NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1';
      if (!nvidiaApiKey) {
        this.logger.warn('NVIDIA_API_KEY not set. NVIDIA AI features will not work.');
      }
      this.nvidiaAI = new OpenAI({
        apiKey: nvidiaApiKey || '',
        baseURL: nvidiaBaseUrl,
      });
      this.logger.log(`AI provider: NVIDIA @ ${nvidiaBaseUrl} (model: ${this.nvidiaModel})`);
    } else if (this.provider === 'openrouter') {
      const openRouterApiKey = this.configService.get<string>('OPENROUTER_API_KEY');
      const openRouterBaseUrl = this.configService.get<string>('AI_OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
      const referer = this.configService.get<string>('AI_OPENROUTER_HTTP_REFERER')
        || this.configService.get<string>('APP_BASE_URL')
        || this.configService.get<string>('FRONTEND_URL');
      const title = this.configService.get<string>('AI_OPENROUTER_X_TITLE') || this.appName;
      if (!openRouterApiKey) {
        this.logger.warn('OPENROUTER_API_KEY not set. OpenRouter AI features will not work.');
      }
      this.openRouterAI = new OpenAI({
        apiKey: openRouterApiKey || '',
        baseURL: openRouterBaseUrl,
        defaultHeaders: {
          ...(referer ? { 'HTTP-Referer': referer } : {}),
          ...(title ? { 'X-Title': title } : {}),
        },
      });
      this.logger.log(`AI provider: OpenRouter @ ${openRouterBaseUrl} (model: ${this.openRouterModel})`);
    } else {
      this.logger.log(`AI provider set to '${this.provider}'. Using local/mock mode.`);
    }
  }

  async generateQuestion(params: {
    prompt: string;
    questionType?: string;
    difficulty?: number;
    language?: string;
    courseName?: string;
    useCase?: string;
    context?: ExamTrustAiContext;
  }) {
    const {
      prompt,
      questionType = 'MULTIPLE_CHOICE',
      difficulty = 0.5,
      language,
      courseName,
      useCase = 'question_bank',
      context,
    } = params;

    const targetLanguage = language || this.defaultLanguage;
    const difficultyLabel = difficulty <= 0.4 ? 'Easy' : difficulty <= 0.7 ? 'Medium' : 'Hard';
    const langInstruction = targetLanguage === 'vi'
      ? 'Generate the question and all content in Vietnamese.'
      : 'Generate the question and all content in English.';

    const profilePrompt = buildExamTrustPromptHeader({
      appName: this.appName,
      useCase: 'question_generation',
      language: targetLanguage,
      questionType,
      questionCount: 1,
      context: {
        courseName,
        questionType,
        difficulty,
        currentStem: prompt,
        extra: { useCase },
        ...(context || {}),
      },
    });

    const systemPrompt = `${profilePrompt}
${langInstruction}

Generate a ${this.getTypeLabel(questionType)} question about the following topic:
"${prompt}"

Difficulty level: ${difficultyLabel} (${difficulty}/5)

You MUST respond with a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "content": "The question text",
  "type": "${questionType}",
  "explanation": "Detailed explanation of the correct answer",
  "difficulty": ${difficulty},
  "points": <appropriate points 1-10>,
  "topic": "specific topic name",
  "learningObjective": "Action verb + what students should be able to do",
  ${this.getOptionsInstruction(questionType)}
}

Rules:
- The question must be clear, academically rigorous, and appropriate for university exams
- For multiple choice: provide exactly 4 options (A, B, C, D), only one correct
- For true/false: options should be {"A": "True", "B": "False"}
- For essay/short answer: omit options, set correctAnswer to {"answer": "sample answer guideline"}
- Tags should be relevant academic topics (2-4 tags)
// Tags removed from schema - do not request tags
- Points should reflect difficulty (easy: 1-3, medium: 3-5, hard: 5-10)
- "topic": 1-5 words naming the specific academic topic of this question
- "learningObjective": one sentence starting with an action verb (e.g. "Understand...", "Apply...", "Analyze...")
- Return ONLY the JSON object, no additional text`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(
          systemPrompt,
          this.buildOllamaOptions('question_generation'),
        );
      } else if (this.provider === 'nvidia') {
        responseText = await this._callNvidia(systemPrompt);
      } else if (this.provider === 'openrouter') {
        responseText = await this._callOpenRouter(systemPrompt);
      } else if (this.provider === 'local' && this.localUrl) {
        const resp = await fetch(this.localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: systemPrompt }),
        });
        if (!resp.ok) throw new Error(`Local model server returned ${resp.status}`);
        responseText = await resp.text();
      } else if (this.provider === 'mock') {
        responseText = JSON.stringify({
          content: `Sample question about ${prompt}`,
          type: questionType,
          explanation: 'This is a mocked explanation for development.',
          difficulty: Math.round(difficulty * 4) / 4,
          points: 1,
          options: questionType === 'MULTIPLE_CHOICE' ? { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' } : null,
          correctAnswer: questionType === 'MULTIPLE_CHOICE' ? { answer: 'A' } : null,
        });
      } else {
        const result = await this.model.generateContent(systemPrompt);
        responseText = result.response.text();
      }

      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      const normalizeDifficulty = (val: any): number | undefined => {
        if (val === undefined || val === null) return undefined;
        const n = Number(val);
        if (Number.isNaN(n)) return undefined;
        if (n > 1) {
          return Math.max(0, Math.min(1, (n - 1) / 4));
        }
        return Math.max(0, Math.min(1, n));
      };

      const parsedDifficulty = normalizeDifficulty(parsed.difficulty);

      return {
        content: parsed.content || '',
        type: parsed.type || questionType,
        explanation: parsed.explanation || '',
        difficulty: parsedDifficulty !== undefined ? parsedDifficulty : difficulty,
        points: parsed.points || 1,
        topic: parsed.topic || '',
        learningObjective: parsed.learningObjective || '',
        options: parsed.options || null,
        correctAnswer: parsed.correctAnswer || null,
      };
    } catch (error: any) {
      this.logger.error('Failed to generate question:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async generateExamQuestions(params: {
    prompt: string;
    questionCount: number;
    difficulty?: number;
    questionType?: string;
    language?: string;
    courseName?: string;
    useCase?: string;
    context?: ExamTrustAiContext;
  }) {
    const {
      prompt,
      questionCount,
      difficulty = 0.5,
      questionType,
      language,
      courseName,
      useCase = 'exam',
      context,
    } = params;

    const targetLanguage = language || this.defaultLanguage;
    const diffLabel = difficulty <= 0.3 ? 'Easy' : difficulty <= 0.5 ? 'Medium' : 'Hard';
    const courseContext = courseName ? `for the course "${courseName}"` : '';
    const normalizedType = this.normalizeQuestionType(questionType);
    const typeInstruction = normalizedType === 'MIXED'
      ? '- Mix question types: mostly MULTIPLE_CHOICE, but include some TRUE_FALSE, SHORT_ANSWER, and ESSAY'
      : `- Generate ALL questions as ${normalizedType}`;
    const sampleType = normalizedType === 'MIXED' ? 'MULTIPLE_CHOICE' : normalizedType;
    const langInstruction = targetLanguage === 'vi'
      ? 'Generate the question set in Vietnamese.'
      : 'Generate the question set in English.';

    const profilePrompt = buildExamTrustPromptHeader({
      appName: this.appName,
      useCase: 'exam_generation',
      language: targetLanguage,
      questionType: normalizedType,
      questionCount,
      context: {
        courseName,
        questionType: normalizedType,
        questionCount,
        difficulty,
        extra: { useCase },
        ...(context || {}),
      },
    });

    const systemPrompt = `${profilePrompt}
${langInstruction}

Generate ${questionCount} exam questions ${courseContext} about:
"${prompt}"

Overall difficulty: ${diffLabel}

You MUST respond with a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "questions": [
    {
      "content": "Question text",
      "type": "${sampleType}",
      "explanation": "Explanation of the correct answer",
      "difficulty": <1-5>,
      "points": <1-10>,
      "options": {"A": "Option A text", "B": "Option B text", "C": "Option C text", "D": "Option D text"},
      "correctAnswer": {"answer": "B"}
    }
  ]
}

Rules:
${typeInstruction}
- For MULTIPLE_CHOICE: 4 options (A,B,C,D), one correct, correctAnswer: {"answer": "B"}
- For TRUE_FALSE: options: {"A": "True", "B": "False"}, correctAnswer: {"answer": "A"} or {"answer": "B"}
- For SHORT_ANSWER: no options field, correctAnswer: {"answer": "expected short answer"}
- For ESSAY: no options field, correctAnswer: {"answer": "grading guidelines"}
- Vary difficulty around the ${diffLabel} level
- Each question should cover a different aspect of the topic
- Questions should be academically rigorous and university-level
// Tags removed from schema - do not request tags
- Generate exactly ${questionCount} questions
- Return ONLY the JSON object, no additional text`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(
          systemPrompt,
          this.buildOllamaOptions('exam_generation'),
        );
      } else if (this.provider === 'nvidia') {
        responseText = await this._callNvidia(systemPrompt);
      } else if (this.provider === 'openrouter') {
        responseText = await this._callOpenRouter(systemPrompt);
      } else if (this.provider === 'local' && this.localUrl) {
        const resp = await fetch(this.localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: systemPrompt }),
        });
        if (!resp.ok) throw new Error(`Local model server returned ${resp.status}`);
        responseText = await resp.text();
      } else if (this.provider === 'mock') {
        const sample = {
          questions: Array.from({ length: questionCount }).map((_, i) => ({
            content: `Mock question ${i + 1} about ${prompt}`,
            type: sampleType,
            explanation: 'Mocked explanation',
            difficulty: Math.round(difficulty * 4) / 4,
            points: 1,
            options: { A: 'A', B: 'B', C: 'C', D: 'D' },
            correctAnswer: { answer: 'A' },
          })),
        };
        responseText = JSON.stringify(sample);
      } else {
        const result = await this.model.generateContent(systemPrompt);
        responseText = result.response.text();
      }

      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      const normalizeDifficulty = (val: any): number => {
        const n = Number(val);
        if (Number.isNaN(n)) return difficulty;
        if (n > 1) return Math.max(0, Math.min(1, (n - 1) / 4));
        return Math.max(0, Math.min(1, n));
      };

      return parsed.questions.map((q: any) => ({
        content: q.content || '',
        type: q.type || sampleType,
        explanation: q.explanation || '',
        difficulty: q.difficulty !== undefined ? normalizeDifficulty(q.difficulty) : difficulty,
        points: q.points || 1,
        options: q.options || null,
        correctAnswer: q.correctAnswer || null,
      }));
    } catch (error: any) {
      this.logger.error('Failed to generate exam questions:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async generateExamQualityReview(params: {
    examTitle?: string;
    courseName?: string;
    language?: string;
    examSummary: {
      totalSubmissions: number;
      avgScorePct?: number | null;
      passRate?: number | null;
      completionRate?: number | null;
    };
    questionStats: Array<{
      questionId: string;
      questionVersionId?: string | null;
      questionText: string;
      totalAttempts: number;
      correctRate: number;
      incorrectRate: number;
      skipRate: number;
      avgTimeSeconds: number | null;
      difficultyIndex: number | null;
      discriminationIndex: number | null;
    }>;
    context?: ExamTrustAiContext;
  }) {
    const { examTitle, courseName, language, examSummary, questionStats, context } = params;
    const targetLanguage = language || this.defaultLanguage;
    const langInstruction = targetLanguage === 'vi'
      ? 'Write the overallSummary, reasonSummary and recommendation fields in Vietnamese.'
      : 'Write the overallSummary, reasonSummary and recommendation fields in English.';

    const profilePrompt = buildExamTrustPromptHeader({
      appName: this.appName,
      useCase: 'exam_quality_review',
      language: targetLanguage,
      context: {
        examTitle,
        courseName,
        analytics: {
          totalAttempts: examSummary.totalSubmissions,
          passRate: examSummary.passRate ?? undefined,
          averageScore: examSummary.avgScorePct ?? undefined,
        },
        ...(context || {}),
      },
    });

    const statsTable = questionStats.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText.slice(0, 200),
      totalAttempts: q.totalAttempts,
      correctRatePct: Number(q.correctRate.toFixed(1)),
      incorrectRatePct: Number(q.incorrectRate.toFixed(1)),
      skipRatePct: Number(q.skipRate.toFixed(1)),
      avgTimeSeconds: q.avgTimeSeconds,
      difficultyIndex: q.difficultyIndex,
      discriminationIndex: q.discriminationIndex,
    }));

    const systemPrompt = `${profilePrompt}
${langInstruction}

You are reviewing the real statistical performance of an exam ("${examTitle || 'Untitled exam'}") to help the lecturer improve question quality.

Exam-level summary:
${JSON.stringify({
  totalSubmissions: examSummary.totalSubmissions,
  avgScorePct: examSummary.avgScorePct ?? null,
  passRate: examSummary.passRate ?? null,
  completionRate: examSummary.completionRate ?? null,
}, null, 2)}

Per-question statistics (real attempt data, one entry per question):
${JSON.stringify(statsTable, null, 2)}

You MUST respond with a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "overallSummary": "2-4 sentence overview of the exam's quality based only on the numbers above",
  "suggestions": [
    {
      "questionId": "must be one of the questionId values above",
      "severity": "high" | "medium" | "low",
      "reasonSummary": "explain WHY this question needs review, citing the specific numbers (difficulty index, discrimination index, incorrect/skip rate, avg time)",
      "recommendation": "concrete suggestion to improve the question's content, difficulty calibration, or distractor/answer options"
    }
  ]
}

Rules:
- Base every judgment strictly on the numbers provided. Do not invent statistics.
- Only include a question in "suggestions" if its numbers indicate a real quality concern (e.g. discrimination index near 0 or negative, difficulty index extremely high/low, incorrect rate or skip rate unusually high, abnormal avg time).
- If none of the questions show a concern, return an empty suggestions array.
- Never suggest editing, deleting, or publishing anything yourself — only describe what the lecturer should review.
- Return ONLY the JSON object, no additional text.`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(
          systemPrompt,
          this.buildOllamaOptions('grading_support'),
        );
      } else if (this.provider === 'nvidia') {
        responseText = await this._callNvidia(systemPrompt);
      } else if (this.provider === 'openrouter') {
        responseText = await this._callOpenRouter(systemPrompt);
      } else if (this.provider === 'local' && this.localUrl) {
        const resp = await fetch(this.localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: systemPrompt }),
        });
        if (!resp.ok) throw new Error(`Local model server returned ${resp.status}`);
        responseText = await resp.text();
      } else if (this.provider === 'mock') {
        responseText = JSON.stringify({
          overallSummary: `Mocked quality review summary for ${examTitle || 'this exam'}.`,
          suggestions: questionStats.slice(0, 1).map((q) => ({
            questionId: q.questionId,
            severity: 'medium',
            reasonSummary: 'Mocked reason based on provided stats.',
            recommendation: 'Mocked recommendation for development.',
          })),
        });
      } else {
        const result = await this.model.generateContent(systemPrompt);
        responseText = result.response.text();
      }

      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (typeof parsed.overallSummary !== 'string' || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format: missing overallSummary or suggestions array');
      }

      const validQuestionIds = new Set(questionStats.map((q) => q.questionId));
      const validSeverities = new Set(['high', 'medium', 'low']);

      const suggestions = parsed.suggestions
        .filter((s: any) => s && validQuestionIds.has(String(s.questionId)))
        .map((s: any) => ({
          questionId: String(s.questionId),
          severity: validSeverities.has(String(s.severity)) ? String(s.severity) : 'medium',
          reasonSummary: String(s.reasonSummary || '').trim(),
          recommendation: String(s.recommendation || '').trim(),
        }))
        .filter((s: any) => s.reasonSummary && s.recommendation);

      return {
        overallSummary: String(parsed.overallSummary).trim(),
        suggestions,
      };
    } catch (error: any) {
      this.logger.error('Failed to generate exam quality review:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async assessExamIntegrityRisk(params: {
    examTitle?: string;
    courseName?: string;
    language?: string;
    submissionSummary: {
      attemptNo?: number;
      score?: number | null;
      durationMinutes?: number | null;
      timeSpentMinutes?: number | null;
    };
    signals: {
      tabSwitchCount: number;
      mouseAnomalies: number;
      fullscreenExitCount: number;
      focusLossCount: number;
      pageHiddenCount: number;
      tooFastAnswerCount: number;
      totalAnswers: number;
      totalIntegrityEvents: number;
      eventBreakdown: Record<string, number>;
    };
    context?: ExamTrustAiContext;
  }) {
    const { examTitle, courseName, language, submissionSummary, signals, context } = params;
    const targetLanguage = language || this.defaultLanguage;
    const langInstruction = targetLanguage === 'vi'
      ? 'Write the explanation and each signal description in Vietnamese.'
      : 'Write the explanation and each signal description in English.';

    const profilePrompt = buildExamTrustPromptHeader({
      appName: this.appName,
      useCase: 'exam_risk_assessment',
      language: targetLanguage,
      context: {
        examTitle,
        courseName,
        attemptNo: submissionSummary.attemptNo,
        analytics: {
          averageScore: submissionSummary.score ?? undefined,
        },
        ...(context || {}),
      },
    });

    const systemPrompt = `${profilePrompt}
${langInstruction}

You are assessing the integrity RISK of a single exam attempt ("${examTitle || 'Untitled exam'}") using only the real proctoring/behavioral signals below. You are NOT a judge — you must never conclude or state that the student cheated. You only surface risk indicators for a human lecturer to review.

Attempt summary:
${JSON.stringify(submissionSummary, null, 2)}

Real behavioral signals recorded during this attempt:
${JSON.stringify(signals, null, 2)}

You MUST respond with a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "riskScore": 0,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "signals": [
    {
      "type": "short signal identifier, e.g. tab_switch, fullscreen_exit, too_fast_answers",
      "description": "explain what was observed and why it matters, citing the specific numbers",
      "weight": 0.0
    }
  ],
  "explanation": "2-4 sentence explanation of the overall risk assessment based only on the numbers above",
  "recommendReview": true
}

Rules:
- "riskScore" is an integer from 0 to 100 based strictly on the signals provided.
- "riskLevel" must be "LOW" for riskScore < 35, "MEDIUM" for 35-69, "HIGH" for 70+.
- Only include a signal in "signals" if its count is greater than zero and meaningfully contributes to risk.
- "weight" is a number between 0 and 1 indicating how much that signal contributed to the score.
- "recommendReview" must be true whenever riskLevel is "MEDIUM" or "HIGH", or when signals look unusual even at LOW risk.
- Never state or imply that the student definitely cheated. Use neutral, evidence-based language ("elevated tab-switch frequency", not "the student cheated").
- Base every judgment strictly on the numbers provided. Do not invent data.
- Return ONLY the JSON object, no additional text.`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(
          systemPrompt,
          this.buildOllamaOptions('grading_support'),
        );
      } else if (this.provider === 'nvidia') {
        responseText = await this._callNvidia(systemPrompt);
      } else if (this.provider === 'openrouter') {
        responseText = await this._callOpenRouter(systemPrompt);
      } else if (this.provider === 'local' && this.localUrl) {
        const resp = await fetch(this.localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: systemPrompt }),
        });
        if (!resp.ok) throw new Error(`Local model server returned ${resp.status}`);
        responseText = await resp.text();
      } else if (this.provider === 'mock') {
        const mockScore = Math.min(100, signals.tabSwitchCount * 10 + signals.fullscreenExitCount * 15 + signals.tooFastAnswerCount * 5);
        responseText = JSON.stringify({
          riskScore: mockScore,
          riskLevel: mockScore >= 70 ? 'HIGH' : mockScore >= 35 ? 'MEDIUM' : 'LOW',
          signals: signals.tabSwitchCount > 0
            ? [{ type: 'tab_switch', description: 'Mocked signal for development.', weight: 0.5 }]
            : [],
          explanation: `Mocked risk assessment for ${examTitle || 'this exam'}.`,
          recommendReview: mockScore >= 35,
        });
      } else {
        const result = await this.model.generateContent(systemPrompt);
        responseText = result.response.text();
      }

      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      const validLevels = new Set(['LOW', 'MEDIUM', 'HIGH']);
      if (
        typeof parsed.riskScore !== 'number'
        || !validLevels.has(String(parsed.riskLevel))
        || typeof parsed.explanation !== 'string'
        || !Array.isArray(parsed.signals)
      ) {
        throw new Error('Invalid response format: missing riskScore, riskLevel, explanation, or signals array');
      }

      const riskScore = Math.max(0, Math.min(100, Math.round(Number(parsed.riskScore))));
      const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW';

      const parsedSignals = parsed.signals
        .filter((s: any) => s && s.type && s.description)
        .map((s: any) => ({
          type: String(s.type).trim().slice(0, 100),
          description: String(s.description).trim(),
          weight: Math.max(0, Math.min(1, Number(s.weight) || 0)),
        }));

      return {
        riskScore,
        riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        signals: parsedSignals,
        explanation: String(parsed.explanation).trim(),
        recommendReview: riskLevel !== 'LOW' ? true : Boolean(parsed.recommendReview),
      };
    } catch (error: any) {
      this.logger.error('Failed to generate exam risk assessment:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async suggestSimilarTopics(params: {
    topicName: string;
    existingTopics: string[];
    language?: string;
    courseName?: string;
    context?: ExamTrustAiContext;
  }) {
    const topicName = String(params.topicName || '').trim();
    const existingTopics = Array.from(
      new Set((params.existingTopics || []).map((topic) => String(topic || '').trim()).filter(Boolean)),
    ).slice(0, 50);

    if (!topicName) {
      return { matches: [] };
    }

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const heuristicMatches = existingTopics
      .map((candidate) => {
        const normalizedCandidate = normalize(candidate);
        const normalizedTopic = normalize(topicName);
        if (!normalizedCandidate || !normalizedTopic) {
          return { name: candidate, score: 0 };
        }

        let score = 0;
        if (normalizedCandidate === normalizedTopic) {
          score = 1;
        } else if (
          normalizedCandidate.includes(normalizedTopic) ||
          normalizedTopic.includes(normalizedCandidate)
        ) {
          score = 0.92;
        } else {
          const candidateTokens = new Set(normalizedCandidate.split(' '));
          const topicTokens = new Set(normalizedTopic.split(' '));
          let overlap = 0;
          topicTokens.forEach((token) => {
            if (candidateTokens.has(token)) overlap += 1;
          });
          const union = new Set([...candidateTokens, ...topicTokens]).size || 1;
          score = overlap / union;
        }

        return { name: candidate, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        score: Number(item.score.toFixed(2)),
        reason: 'Heuristic similarity based on topic text',
      }));

    const prompt = `${buildExamTrustPromptHeader({
      appName: this.appName,
      useCase: 'topic_matching',
      language: params.language || this.defaultLanguage,
      questionType: 'TOPIC_MATCHING',
      questionCount: 1,
      context: {
        courseName: params.courseName,
        topicName,
        existingTopics,
        ...(params.context || {}),
      },
    })}

You are helping a lecturer find an existing topic similar to a proposed new topic.
Proposed topic: "${topicName}"

Existing topics:
${existingTopics.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Return ONLY JSON in this exact structure:
{
  "matches": [
    {
      "name": "closest existing topic name",
      "score": 0.0,
      "reason": "short reason"
    }
  ]
}

Rules:
- Only include topics that are genuinely similar to the proposed topic.
- Sort from most similar to least similar.
- Score must be a number between 0 and 1.
- Return at most 5 matches.
- If nothing is similar, return an empty matches array.`;

    try {
      let responseText: string | null = null;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(
          prompt,
          this.buildOllamaOptions('topic_matching'),
        );
      } else if (this.provider === 'nvidia') {
        responseText = await this._callNvidia(prompt);
      } else if (this.provider === 'openrouter') {
        responseText = await this._callOpenRouter(prompt);
      } else if (this.provider === 'local' && this.localUrl) {
        const resp = await fetch(this.localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (!resp.ok) throw new Error(`Local model server returned ${resp.status}`);
        responseText = await resp.text();
      } else if (this.provider === 'mock') {
        responseText = JSON.stringify({ matches: heuristicMatches });
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        responseText = result.response.text();
      }

      if (!responseText) {
        return { matches: heuristicMatches };
      }

      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

      const normalized = matches
        .map((item: any) => ({
          name: String(item?.name || '').trim(),
          score: Math.max(0, Math.min(1, Number(item?.score ?? 0))),
          reason: String(item?.reason || 'AI similarity match').trim(),
        }))
        .filter((item: any) => item.name)
        .sort((a: any, b: any) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 5);

      return { matches: normalized.length > 0 ? normalized : heuristicMatches };
    } catch (error: any) {
      this.logger.warn(`Falling back to heuristic topic matching: ${error.message}`);
      return { matches: heuristicMatches };
    }
  }

  private async _callOllama(prompt: string, options?: Partial<OllamaGenerationOptions>): Promise<string> {
    const url = `${this.ollamaUrl}/api/generate`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? this.ollamaTemperature,
          top_p: options?.top_p ?? this.ollamaTopP,
          repeat_penalty: options?.repeat_penalty ?? this.ollamaRepeatPenalty,
          num_ctx: options?.num_ctx ?? this.ollamaNumCtx,
        },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Ollama returned ${resp.status}: ${body}`);
    }
    const data: any = await resp.json();
    return data.response || data.choices?.[0]?.text || '';
  }

  private async _callNvidia(prompt: string): Promise<string> {
    const completion = await this.nvidiaAI.chat.completions.create({
      model: this.nvidiaModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
      seed: 42,
      stream: true,
    });

    let text = '';
    for await (const chunk of completion as any) {
      text += chunk.choices?.[0]?.delta?.content || '';
    }
    return text;
  }

  private async _callOpenRouter(prompt: string): Promise<string> {
    const reasoningEnabled = String(this.configService.get<string>('AI_OPENROUTER_REASONING_ENABLED') || '')
      .toLowerCase() === 'true';
    const request: any = {
      model: this.openRouterModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      seed: 42,
      stream: true,
    };

    if (reasoningEnabled) {
      request.reasoning = {
        enabled: true,
        exclude: true,
      };
    }

    const completion = await this.openRouterAI.chat.completions.create(request);

    let text = '';
    for await (const chunk of completion as any) {
      text += chunk.choices?.[0]?.delta?.content || '';
      const reasoningTokens = chunk.usage?.completionTokensDetails?.reasoningTokens
        ?? chunk.usage?.completion_tokens_details?.reasoning_tokens;
      if (typeof reasoningTokens !== 'undefined') {
        this.logger.debug(`OpenRouter reasoning tokens: ${reasoningTokens}`);
      }
    }
    return text;
  }

  private buildOllamaOptions(useCase: 'question_generation' | 'exam_generation' | 'topic_matching' | 'grading_support') {
    return getOllamaGenerationOptions(useCase);
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MULTIPLE_CHOICE: 'multiple choice (4 options, single correct answer)',
      MULTI_SELECT: 'multiple select (4 options, multiple correct answers)',
      TRUE_FALSE: 'true/false',
      SHORT_ANSWER: 'short answer',
      ESSAY: 'essay',
      FILL_IN_BLANK: 'fill in the blank',
      MATCHING: 'matching',
      ORDERING: 'ordering',
    };
    return labels[type] || 'multiple choice';
  }

  private getOptionsInstruction(type: string): string {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return '"options": {"A": "option text", "B": "option text", "C": "option text", "D": "option text"},\n  "correctAnswer": {"answer": "B"}';
      case 'TRUE_FALSE':
        return '"options": {"A": "True", "B": "False"},\n  "correctAnswer": {"answer": "A"}';
      case 'ESSAY':
      case 'SHORT_ANSWER':
        return '"correctAnswer": {"answer": "expected answer guideline"}';
      default:
        return '"options": {"A": "option text", "B": "option text", "C": "option text", "D": "option text"},\n  "correctAnswer": {"answer": "B"}';
    }
  }

  private normalizeQuestionType(type?: string): string {
    if (!type) return 'MIXED';

    const normalized = String(type).trim().toUpperCase();
    const map: Record<string, string> = {
      MIXED: 'MIXED',
      CUSTOM: 'MIXED',
      MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
      SINGLE_CHOICE: 'MULTIPLE_CHOICE',
      MULTI_SELECT: 'MULTI_SELECT',
      TRUE_FALSE: 'TRUE_FALSE',
      SHORT_ANSWER: 'SHORT_ANSWER',
      ESSAY: 'ESSAY',
      FILL_IN_BLANK: 'FILL_IN_BLANK',
      MATCHING: 'MATCHING',
      ORDERING: 'ORDERING',
      'SINGLE-CHOICE': 'MULTIPLE_CHOICE',
      'MULTIPLE-CHOICE': 'MULTIPLE_CHOICE',
      'TRUE-FALSE': 'TRUE_FALSE',
      'SHORT-ANSWER': 'SHORT_ANSWER',
      'FILL-BLANK': 'FILL_IN_BLANK',
    };

    return map[normalized] || 'MIXED';
  }
}
