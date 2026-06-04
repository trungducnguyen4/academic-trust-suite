import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateQuestionDto, GenerateExamQuestionsDto, SuggestSimilarTopicsDto } from './dto/generate-question.dto';
import { AiJobsService } from './ai-jobs.service';
import { AiService } from './ai.service';
import { AISection } from '../questions-v2/dto/question-draft.dto';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiJobsService: AiJobsService,
    private readonly aiService: AiService,
  ) {}

  @Post('generate-question')
  async generateQuestion(@Body() dto: GenerateQuestionDto) {
    const job = await this.aiJobsService.createJob({
      task: 'single-question',
      section: AISection.CONTENT,
      payload: {
        prompt: dto.prompt,
        questionType: dto.questionType,
        difficulty: dto.difficulty,
        language: dto.language,
        courseName: dto.courseName,
        useCase: dto.useCase,
      },
    });

    return { jobId: job.id, status: job.status };
  }

  @Post('generate-exam-questions')
  async generateExamQuestions(@Body() dto: GenerateExamQuestionsDto) {
    const job = await this.aiJobsService.createJob({
      task: 'exam-questions',
      section: AISection.CONTENT,
      payload: {
        prompt: dto.prompt,
        questionCount: dto.questionCount,
        difficulty: dto.difficulty,
        questionType: dto.questionType,
        language: dto.language,
        courseName: dto.courseName,
        useCase: dto.useCase,
      },
    });

    return { jobId: job.id, status: job.status };
  }

  @Post('suggest-similar-topics')
  async suggestSimilarTopics(@Body() dto: SuggestSimilarTopicsDto) {
    return this.aiService.suggestSimilarTopics({
      topicName: dto.topicName,
      existingTopics: dto.existingTopics,
      language: dto.language,
      courseName: dto.courseName,
    });
  }
}
