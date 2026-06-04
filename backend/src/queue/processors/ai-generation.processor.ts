import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { AISection } from '../../questions-v2/dto/question-draft.dto';

type AiTaskType = 'single-question' | 'exam-questions' | 'draft-section';

@Processor('ai-generation')
export class AIGenerationProcessor {
  private readonly logger = new Logger(AIGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private normalizeDifficulty(input: any): number {
    const value = Number(input);
    if (Number.isNaN(value)) return 0.5;
    if (value > 1) {
      return Math.max(0, Math.min(1, (value - 1) / 4));
    }
    return Math.max(0, Math.min(1, value));
  }

  private buildDraftPrompt(section: AISection, state: any, instruction?: string) {
    const questionType = String(state?.intent?.questionType || state?.content?.type || 'MULTIPLE_CHOICE').toUpperCase();
    const content = String(state?.content?.content || state?.content?.stem || '').trim();

    const head = [
      `Question type: ${questionType}`,
      content ? `Current stem: ${content}` : 'Current stem: not provided',
      instruction ? `Additional instruction: ${instruction}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (section === AISection.CONTENT) {
      return `${head}\nGenerate a better question stem.`;
    }
    if (section === AISection.ANSWERS) {
      return `${head}\nGenerate answer options and correct answer.`;
    }
    if (section === AISection.EXPLANATION) {
      return `${head}\nGenerate explanation for the correct answer.`;
    }
    return `${head}\nSuggest classification metadata: topic and learning objective.`;
  }

  @Process()
  async process(job: Job<any>): Promise<void> {
    const { jobId, task, payload } = job.data as {
      jobId: string;
      task: AiTaskType;
      payload: Record<string, any>;
    };

    const record = await this.prisma.aiGenerationRecord.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    });

    if (!record) {
      this.logger.warn(`AI job record not found: ${jobId}`);
      return;
    }

    await this.prisma.aiGenerationRecord.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        errorMessage: null,
      },
    });

    try {
      if (task === 'single-question') {
        const result = await this.aiService.generateQuestion({
          prompt: String(payload.prompt || ''),
          questionType: payload.questionType,
          difficulty: this.normalizeDifficulty(payload.difficulty),
          language: payload.language,
          courseName: payload.courseName,
          useCase: payload.useCase,
        });

        await this.prisma.aiGenerationRecord.update({
          where: { id: jobId },
          data: {
            status: 'SUCCEEDED',
            output: result,
            completedAt: new Date(),
          },
        });
        return;
      }

      if (task === 'exam-questions') {
        const questions = await this.aiService.generateExamQuestions({
          prompt: String(payload.prompt || ''),
          questionCount: Number(payload.questionCount || 1),
          difficulty: this.normalizeDifficulty(payload.difficulty),
          questionType: payload.questionType,
          language: payload.language,
          courseName: payload.courseName,
          useCase: payload.useCase,
        });

        await this.prisma.aiGenerationRecord.update({
          where: { id: jobId },
          data: {
            status: 'SUCCEEDED',
            output: { questions },
            completedAt: new Date(),
          },
        });
        return;
      }

      const section = String(payload.section || 'CONTENT').toUpperCase() as AISection;
      const prompt = this.buildDraftPrompt(section, payload.draftState || {}, payload.instruction);
      const result = await this.aiService.generateQuestion({
        prompt,
        questionType: String(payload.draftState?.intent?.questionType || 'MULTIPLE_CHOICE'),
        difficulty: this.normalizeDifficulty(payload.constraints?.difficulty ?? 0.5),
        language: payload.constraints?.language || 'en',
        useCase: 'question_bank',
      });

      const candidates: Array<Record<string, any>> = [];
      if (section === AISection.CONTENT) {
        candidates.push({ id: 'cand-1', content: result.content });
      } else if (section === AISection.ANSWERS) {
        candidates.push({ id: 'cand-1', options: result.options || {}, correctAnswer: result.correctAnswer || {} });
      } else if (section === AISection.EXPLANATION) {
        candidates.push({ id: 'cand-1', explanation: result.explanation || '' });
      } else {
        candidates.push({
          id: 'cand-1',
          topic: result.topic || '',
          learningObjective: result.learningObjective || '',
          difficulty: result.difficulty,
        });
      }

      await this.prisma.aiGenerationRecord.update({
        where: { id: jobId },
        data: {
          status: 'SUCCEEDED',
          output: { candidates },
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`AI job failed: ${jobId}`, error?.stack || String(error));
      await this.prisma.aiGenerationRecord.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: String(error?.message || error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
