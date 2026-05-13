import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AIGenerateSectionDto,
  ApplyAICandidateDto,
  CreateQuestionDraftDto,
  PublishQuestionDraftDto,
  QuestionDraftStepKey,
  SaveDraftStepDto,
  ValidateQuestionDraftDto,
} from './dto/question-draft.dto';
import { CreateQuestionCrudDto, UpdateQuestionCrudDto } from './dto/question-crud.dto';
import { ListQuestionsQueryDto } from './dto/question-v2-query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions-v2.service';

@ApiTags('Questions')
@ApiBearerAuth('access-token')
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('LECTURER', 'ADMIN')
export class QuestionDraftsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  createQuestion(@Body() dto: CreateQuestionCrudDto, @Request() req) {
    return this.questionsService.createQuestion(dto, req.user);
  }

  @Post('drafts')
  createDraft(@Body() dto: CreateQuestionDraftDto, @Request() req) {
    return this.questionsService.createDraft(dto, req.user);
  }

  @Patch('drafts/:draftId/steps/:stepKey')
  saveStep(
    @Param('draftId') draftId: string,
    @Param('stepKey') stepKey: QuestionDraftStepKey,
    @Body() dto: SaveDraftStepDto,
    @Request() req,
  ) {
    return this.questionsService.saveStep(draftId, stepKey, dto, req.user);
  }

  @Post('drafts/:draftId/ai-generate-section')
  aiGenerateSection(
    @Param('draftId') draftId: string,
    @Body() dto: AIGenerateSectionDto,
    @Request() req,
  ) {
    return this.questionsService.aiGenerateSection(draftId, dto, req.user);
  }

  @Post('drafts/:draftId/ai-apply')
  applyAICandidate(
    @Param('draftId') draftId: string,
    @Body() dto: ApplyAICandidateDto,
    @Request() req,
  ) {
    return this.questionsService.applyAICandidate(draftId, dto, req.user);
  }

  @Post('drafts/:draftId/validate')
  validateDraft(
    @Param('draftId') draftId: string,
    @Body() dto: ValidateQuestionDraftDto,
    @Request() req,
  ) {
    return this.questionsService.validateDraft(draftId, dto, req.user);
  }

  @Post('drafts/:draftId/publish')
  publishDraft(
    @Param('draftId') draftId: string,
    @Body() dto: PublishQuestionDraftDto,
    @Request() req,
  ) {
    return this.questionsService.publishDraft(draftId, dto, req.user);
  }

  @Get()
  listQuestions(@Query() query: ListQuestionsQueryDto, @Request() req) {
    return this.questionsService.listQuestions(query, req.user);
  }

  @Get('stats')
  getQuestionStats(@Request() req) {
    return this.questionsService.getQuestionStats(req.user);
  }

  @Get(':id')
  findQuestionById(@Param('id') id: string, @Request() req) {
    return this.questionsService.findQuestionById(id, req.user);
  }

  @Patch(':id')
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionCrudDto,
    @Request() req,
  ) {
    return this.questionsService.updateQuestion(id, dto, req.user);
  }

  @Delete(':id')
  deleteQuestion(@Param('id') id: string, @Request() req) {
    return this.questionsService.deleteQuestion(id, req.user);
  }
}
