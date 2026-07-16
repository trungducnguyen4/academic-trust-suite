import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AISection } from '../questions-v2/dto/question-draft.dto';

type AiTaskType = 'single-question' | 'exam-questions' | 'draft-section' | 'exam-quality-review';

interface CreateAiJobParams {
  task: AiTaskType;
  draftId?: string | null;
  questionVersionId?: string | null;
  examId?: string | null;
  section?: AISection | null;
  payload: Record<string, any>;
  requestedBy?: string | null;
}

@Injectable()
export class AiJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async createJob(params: CreateAiJobParams) {
    const provider = process.env.AI_PROVIDER || 'google';
    const ollamaModel = process.env.AI_OLLAMA_MODEL || 'gemma3:4b';
    const googleModel = process.env.AI_MODEL || 'gemini-2.0-flash';
    const nvidiaModel = process.env.AI_NVIDIA_MODEL || 'z-ai/glm-5.2';
    const openRouterModel = process.env.AI_OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
    const model =
      provider === 'ollama'
        ? ollamaModel
        : provider === 'nvidia'
          ? nvidiaModel
        : provider === 'openrouter'
          ? openRouterModel
        : params.task === 'single-question' || params.task === 'exam-questions' || params.task === 'exam-quality-review'
          ? googleModel
          : ollamaModel;

    const record = await this.prisma.aIGenerationRecord.create({
      data: {
        draftId: params.draftId ?? null,
        questionVersionId: params.questionVersionId ?? null,
        examId: params.examId ?? null,
        section: params.section ?? AISection.CONTENT,
        status: 'QUEUED',
        reviewStatus: 'PENDING',
        provider,
        model,
        prompt: {
          task: params.task,
          payload: params.payload,
          requestedBy: params.requestedBy ?? null,
          context: params.payload?.context ?? {},
        },
      },
    });

    await this.queueService.enqueueAiGeneration({
      jobId: record.id,
      task: params.task,
      draftId: params.draftId ?? null,
      questionVersionId: params.questionVersionId ?? null,
      examId: params.examId ?? null,
      section: params.section ?? null,
      payload: params.payload,
    });

    return record;
  }
}
