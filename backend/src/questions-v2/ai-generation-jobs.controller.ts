import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions-v2.service';

@ApiTags('Questions AI Jobs')
@ApiBearerAuth('access-token')
@Controller('questions/ai-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('LECTURER', 'ADMIN')
export class AIGenerationJobsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get(':jobId')
  getJobStatus(@Param('jobId') jobId: string, @Request() req) {
    return this.questionsService.getJobStatus(jobId, req.user);
  }
}
