import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateQuestionDto, GenerateExamQuestionsDto } from './dto/generate-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-question')
  async generateQuestion(@Body() dto: GenerateQuestionDto) {
    const result = await this.aiService.generateQuestion({
      prompt: dto.prompt,
      questionType: dto.questionType,
      difficulty: dto.difficulty,
      language: dto.language,
      courseName: dto.courseName,
      useCase: dto.useCase,
    });
    return result;
  }

  @Post('generate-exam-questions')
  async generateExamQuestions(@Body() dto: GenerateExamQuestionsDto) {
    const questions = await this.aiService.generateExamQuestions({
      prompt: dto.prompt,
      questionCount: dto.questionCount,
      difficulty: dto.difficulty,
      questionType: dto.questionType,
      language: dto.language,
      courseName: dto.courseName,
      useCase: dto.useCase,
    });
    return { questions };
  }
}
