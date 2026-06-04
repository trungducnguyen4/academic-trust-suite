import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AISection } from '../questions-v2/dto/question-draft.dto';

type AiTaskType = 'single-question' | 'exam-questions' | 'draft-section';

interface CreateAiJobParams {
  task: AiTaskType;
  draftId?: string | null;
  questionVersionId?: string | null;
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
    const model =
      params.task === 'single-question' || params.task === 'exam-questions'
        ? process.env.AI_MODEL || process.env.AI_OLLAMA_MODEL || 'gemini-2.0-flash'
        : process.env.AI_OLLAMA_MODEL || 'gemini-2.0-flash';

    const record = await this.prisma.aiGenerationRecord.create({
      data: {
        draftId: params.draftId ?? null,
        questionVersionId: params.questionVersionId ?? null,
        section: params.section ?? AISection.CONTENT,
        status: 'QUEUED',
        reviewStatus: 'PENDING',
        provider,
        model,
        prompt: {
          task: params.task,
          payload: params.payload,
          requestedBy: params.requestedBy ?? null,
        },
      },
    });

    await this.queueService.enqueueAiGeneration({
      jobId: record.id,
      task: params.task,
      draftId: params.draftId ?? null,
      questionVersionId: params.questionVersionId ?? null,
      section: params.section ?? null,
      payload: params.payload,
    });

    return record;
  }
}
