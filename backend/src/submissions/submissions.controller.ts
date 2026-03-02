import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { StartExamDto, SubmitExamDto, GradeAnswerDto, UpdateSubmissionStatusDto } from './dto/submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('start')
  startExam(@Body() startExamDto: StartExamDto, @Request() req) {
    return this.submissionsService.startExam(startExamDto, req.user.id);
  }

  @Post(':id/submit')
  submitExam(
    @Param('id') id: string,
    @Body() submitExamDto: SubmitExamDto,
    @Request() req,
  ) {
    return this.submissionsService.submitExam(id, submitExamDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.submissionsService.findAll(pagination);
  }

  @Get('exam/:examId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  findByExam(
    @Param('examId') examId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.submissionsService.findByExam(examId, pagination);
  }

  @Get('my-submissions')
  getMySubmissions(@Request() req) {
    return this.submissionsService.findByStudent(req.user.id);
  }

  @Get('exam/:examId/my-submission')
  getMyExamSubmission(@Param('examId') examId: string, @Request() req) {
    return this.submissionsService.getStudentSubmission(examId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.submissionsService.findOne(id);
  }

  @Post('grade-answer')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  gradeAnswer(@Body() gradeDto: GradeAnswerDto) {
    return this.submissionsService.gradeAnswer(gradeDto);
  }

  @Post(':id/finalize-grading')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  finalizeGrading(@Param('id') id: string) {
    return this.submissionsService.finalizeGrading(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  updateStatus(@Param('id') id: string, @Body() updateDto: UpdateSubmissionStatusDto) {
    return this.submissionsService.updateStatus(id, updateDto);
  }
}
