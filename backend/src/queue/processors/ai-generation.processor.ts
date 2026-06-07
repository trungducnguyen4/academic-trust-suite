import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { AISection } from '../../questions-v2/dto/question-draft.dto';
import { ExamTrustAiContext } from '../../ai/ai-profile';

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

  private parseJson<T = any>(value: any, fallback: T): T {
    if (value === null || typeof value === 'undefined') return fallback;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(String(value)) as T;
    } catch {
      return fallback;
    }
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

  private async buildContext(task: AiTaskType, payload: Record<string, any>): Promise<ExamTrustAiContext> {
    const baseContext: ExamTrustAiContext = {
      ...(this.parseJson(payload.context, {}) as Record<string, any>),
    };

    const courseId = String(payload.courseId || baseContext.courseId || '').trim() || null;
    const questionVersionId = String(payload.questionVersionId || baseContext.questionVersionId || '').trim() || null;
    const draftId = String(payload.draftId || baseContext.draftId || '').trim() || null;
    const examId = String(payload.examId || baseContext.examId || '').trim() || null;

    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, code: true, name: true, subjectCode: true },
      });
      if (course) {
        baseContext.courseId = course.id;
        baseContext.courseCode = course.code;
        baseContext.courseName = course.name;
        baseContext.subjectCode = course.subjectCode || undefined;
      }
    }

    if (questionVersionId) {
      const version = await this.prisma.questionVersion.findUnique({
        where: { id: questionVersionId },
        select: {
          id: true,
          versionNo: true,
          questionId: true,
          stem: true,
          difficulty: true,
          points: true,
          question: {
            select: {
              id: true,
              type: true,
              courseId: true,
              course: {
                select: { id: true, code: true, name: true, subjectCode: true },
              },
            },
          },
        },
      });

      if (version) {
        baseContext.questionVersionId = version.id;
        baseContext.questionVersionNo = version.versionNo;
        baseContext.questionId = version.questionId;
        baseContext.currentStem = version.stem || baseContext.currentStem;
        baseContext.questionType = version.question?.type || baseContext.questionType;
        if (version.question?.course) {
          baseContext.courseId = version.question.course.id;
          baseContext.courseCode = version.question.course.code;
          baseContext.courseName = version.question.course.name;
          baseContext.subjectCode = version.question.course.subjectCode || undefined;
        }
      }
    }

    if (draftId) {
      const draft = await this.prisma.questionDraft.findUnique({
        where: { id: draftId },
        select: {
          id: true,
          questionId: true,
          mode: true,
          currentStep: true,
          state: true,
          question: {
            select: {
              id: true,
              type: true,
              courseId: true,
              course: {
                select: { id: true, code: true, name: true, subjectCode: true },
              },
            },
          },
        },
      });

      if (draft) {
        baseContext.draftId = draft.id;
        baseContext.draftMode = draft.mode;
        baseContext.draftStep = draft.currentStep;
        if (draft.questionId) {
          baseContext.questionId = draft.questionId;
        }
        if (draft.question?.type) {
          baseContext.questionType = draft.question.type;
        }
        if (draft.question?.course) {
          baseContext.courseId = draft.question.course.id;
          baseContext.courseCode = draft.question.course.code;
          baseContext.courseName = draft.question.course.name;
          baseContext.subjectCode = draft.question.course.subjectCode || undefined;
        }

        const state = this.parseJson<any>(draft.state, {});
        const currentStem = String(state?.content?.content || state?.content?.stem || '').trim();
        if (currentStem) {
          baseContext.currentStem = currentStem;
        }
      }
    }

    if (examId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        select: {
          id: true,
          title: true,
          mode: true,
          status: true,
          course: {
            select: { id: true, code: true, name: true, subjectCode: true },
          },
        },
      });

      if (exam) {
        baseContext.examId = exam.id;
        baseContext.examTitle = exam.title;
        baseContext.examMode = String(exam.mode);
        baseContext.examStatus = exam.status;
        if (exam.course) {
          baseContext.courseId = exam.course.id;
          baseContext.courseCode = exam.course.code;
          baseContext.courseName = exam.course.name;
          baseContext.subjectCode = exam.course.subjectCode || undefined;
        }
      }
    }

    if (typeof payload.questionType !== 'undefined') {
      baseContext.questionType = String(payload.questionType);
    }
    if (typeof payload.questionCount !== 'undefined') {
      baseContext.questionCount = Number(payload.questionCount);
    }
    if (typeof payload.difficulty !== 'undefined') {
      baseContext.difficulty = this.normalizeDifficulty(payload.difficulty);
    }
    if (typeof payload.attemptNo !== 'undefined') {
      baseContext.attemptNo = Number(payload.attemptNo);
    }
    if (typeof payload.topicName !== 'undefined') {
      baseContext.topicName = String(payload.topicName);
    }
    if (typeof payload.instruction !== 'undefined') {
      baseContext.instruction = String(payload.instruction);
    }
    if (Array.isArray(payload.existingTopics)) {
      baseContext.existingTopics = payload.existingTopics.map((topic: any) => String(topic || '').trim()).filter(Boolean);
    }
    if (payload.analytics) {
      baseContext.analytics = payload.analytics;
    }

    if (task === 'draft-section') {
      baseContext.extra = {
        ...(baseContext.extra || {}),
        section: payload.section || 'CONTENT',
      };
    }

    return baseContext;
  }

  @Process({ concurrency: 1 })
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
      const context = await this.buildContext(task, payload);

      if (task === 'single-question') {
        const result = await this.aiService.generateQuestion({
          prompt: String(payload.prompt || ''),
          questionType: payload.questionType,
          difficulty: this.normalizeDifficulty(payload.difficulty),
          language: payload.language,
          courseName: payload.courseName,
          useCase: payload.useCase,
          context,
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
          context,
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
        context,
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
