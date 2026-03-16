import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Using global fetch (Node 18+) to call a local model server when configured

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;
  private provider: string;
  private localUrl: string | undefined;
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.provider = this.configService.get<string>('AI_PROVIDER') || 'google'; // 'google' | 'ollama' | 'local' | 'mock'
    this.localUrl = this.configService.get<string>('AI_LOCAL_URL') || undefined;
    this.ollamaUrl = this.configService.get<string>('AI_OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('AI_OLLAMA_MODEL') || 'mistral';

    if (this.provider === 'google') {
      if (!apiKey) {
        this.logger.warn('GOOGLE_AI_API_KEY not set. AI features will not work.');
      }
      this.genAI = new GoogleGenerativeAI(apiKey || '');
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } else if (this.provider === 'ollama') {
      this.logger.log(`AI provider: Ollama @ ${this.ollamaUrl} (model: ${this.ollamaModel})`);
    } else {
      this.logger.log(`AI provider set to '${this.provider}'. Using local/mock mode.`);
    }
  }

  /**
   * Generate a single question based on a prompt
   */
  async generateQuestion(params: {
    prompt: string;
    questionType?: string;
    difficulty?: number; // 0.0 - 1.0
    language?: string;
  }) {
    const { prompt, questionType = 'MULTIPLE_CHOICE', difficulty = 0.5, language = 'en' } = params;

    // normalize to a 1-5 scale for instructions, but keep internal difficulty as 0..1
    const diffScale5 = Math.round(difficulty * 4) + 1; // maps 0..1 -> 1..5
    const difficultyLabel = difficulty <= 0.4 ? 'Easy' : difficulty <= 0.7 ? 'Medium' : 'Hard';
    const langInstruction = language === 'vi'
      ? 'Generate the question and all content in Vietnamese.'
      : 'Generate the question and all content in English.';

    const systemPrompt = `You are an expert exam question generator for university-level courses.
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
  "tags": ["tag1", "tag2", "tag3"],
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
- Points should reflect difficulty (easy: 1-3, medium: 3-5, hard: 5-10)
- "topic": 1-5 words naming the specific academic topic of this question
- "learningObjective": one sentence starting with an action verb (e.g. "Understand...", "Apply...", "Analyze...")
- Return ONLY the JSON object, no additional text`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(systemPrompt);
      } else if (this.provider === 'local' && this.localUrl) {
        // Call custom local model server (POST { prompt })
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
          tags: ['mock', 'development'],
          options: questionType === 'MULTIPLE_CHOICE' ? { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' } : null,
          correctAnswer: questionType === 'MULTIPLE_CHOICE' ? { answer: 'A' } : null,
        });
      } else {
        const result = await this.model.generateContent(systemPrompt);
        responseText = result.response.text();
      }

      // Clean the response - remove code fences if present
      const cleaned = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      // helper to normalize difficulty from AI (AI may return 1-5 scale)
      const normalizeDifficulty = (val: any): number | undefined => {
        if (val === undefined || val === null) return undefined;
        const n = Number(val);
        if (Number.isNaN(n)) return undefined;
        if (n > 1) {
          // assume 1-5 scale -> convert to 0..1
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
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
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

  /**
   * Generate multiple questions for an exam
   */
  async generateExamQuestions(params: {
    prompt: string;
    questionCount: number;
    difficulty?: number; // 0.0 - 1.0
    courseName?: string;
  }) {
    const { prompt, questionCount, difficulty = 0.5, courseName } = params;

    const diffLabel = difficulty <= 0.3 ? 'Easy' : difficulty <= 0.5 ? 'Medium' : 'Hard';
    const courseContext = courseName ? `for the course "${courseName}"` : '';

    const systemPrompt = `You are an expert exam question generator for university-level courses.

Generate ${questionCount} exam questions ${courseContext} about:
"${prompt}"

Overall difficulty: ${diffLabel}

You MUST respond with a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "questions": [
    {
      "content": "Question text",
      "type": "MULTIPLE_CHOICE",
      "explanation": "Explanation of the correct answer",
      "difficulty": <1-5>,
      "points": <1-10>,
      "tags": ["tag1", "tag2"],
      "options": {"A": "Option A text", "B": "Option B text", "C": "Option C text", "D": "Option D text"},
      "correctAnswer": {"answer": "B"}
    }
  ]
}

Rules:
- Mix question types: mostly MULTIPLE_CHOICE, but include some TRUE_FALSE, SHORT_ANSWER, and ESSAY
- For MULTIPLE_CHOICE: 4 options (A,B,C,D), one correct, correctAnswer: {"answer": "B"}
- For TRUE_FALSE: options: {"A": "True", "B": "False"}, correctAnswer: {"answer": "A"} or {"answer": "B"}
- For SHORT_ANSWER: no options field, correctAnswer: {"answer": "expected short answer"}
- For ESSAY: no options field, correctAnswer: {"answer": "grading guidelines"}
- Vary difficulty around the ${diffLabel} level
- Each question should cover a different aspect of the topic
- Questions should be academically rigorous and university-level
- Tags should be relevant sub-topics
- Generate exactly ${questionCount} questions
- Return ONLY the JSON object, no additional text`;

    try {
      let responseText: string;

      if (this.provider === 'ollama') {
        responseText = await this._callOllama(systemPrompt);
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
            type: 'MULTIPLE_CHOICE',
            explanation: 'Mocked explanation',
            difficulty: Math.round(difficulty * 4) / 4,
            points: 1,
            tags: ['mock'],
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
        type: q.type || 'MULTIPLE_CHOICE',
        explanation: q.explanation || '',
        difficulty: q.difficulty !== undefined ? normalizeDifficulty(q.difficulty) : difficulty,
        points: q.points || 1,
        tags: Array.isArray(q.tags) ? q.tags : [],
        options: q.options || null,
        correctAnswer: q.correctAnswer || null,
      }));
    } catch (error: any) {
      this.logger.error('Failed to generate exam questions:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Call Ollama's HTTP API and return the generated text.
   * Ollama exposes POST /api/generate — we use streaming=false for simplicity.
   */
  private async _callOllama(prompt: string): Promise<string> {
    const url = `${this.ollamaUrl}/api/generate`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Ollama returned ${resp.status}: ${body}`);
    }
    const data: any = await resp.json();
    // Ollama non-streaming response: { response: "...", ... }
    return data.response || data.choices?.[0]?.text || '';
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
}
