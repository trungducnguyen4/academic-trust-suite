import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamQualityReviewService } from './exam-quality-review.service';
import { AccessPolicyService } from '../common/services/access-policy.service';
import { MailerService } from '../mailer/mailer.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { IsArray, IsEmail, IsOptional } from 'class-validator';
import { CreateExamDto, UpdateExamDto, AddQuestionsToExamDto, UpdateExamQuestionDto, ShareExamDto, RescheduleExamDto } from './dto/exam.dto';
import { ReviewQualitySuggestionDto } from './dto/exam-quality-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly qualityReviewService: ExamQualityReviewService,
    private readonly mailerService: MailerService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  @Post(':id/share')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  async shareExam(@Param('id') id: string, @Body() body: ShareExamDto | any, @Request() req) {
    let emails: string[] = (body?.emails && Array.isArray(body.emails)) ? body.emails : (body?.email ? [body.email] : []);
    const sendToCourse = !!body?.sendToCourse;

    // Resolve exam to include title and course
    const exam = await this.examsService.findOne(id);
    const frontend = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:8080';
    const link = `${frontend}/student/exam-ready?examId=${id}`;
    const subject = `Invitation to exam: ${exam?.title || 'Exam'}`;
    const html = `<p>You have been invited to join the exam <strong>${exam?.title || 'Exam'}</strong>.</p>
      <p>Click to join: <a href="${link}">${link}</a></p>`;

    // If sendToCourse, fetch enrolled students for the exam's course
    if (sendToCourse) {
      const courseId = exam?.course?.id || (exam as any)?.courseId;
      if (courseId) {
        const enrollments = await this.enrollmentsService.findByCourse(courseId, req.user);
        const studentEmails = (enrollments || [])
          .map((enr: any) => enr?.student?.email)
          .filter((e: any) => !!e);
        emails = Array.from(new Set([...(emails || []), ...studentEmails]));
      }
    }

    if (!emails || emails.length === 0) {
      return { success: false, message: 'No recipient provided' };
    }

    await this.mailerService.sendExamLink(emails, subject, html);
    return { success: true };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  async create(@Body() createExamDto: CreateExamDto, @Request() req) {
    const created = await this.examsService.create(createExamDto, req.user.id);

    // Email notifications disabled per user request
    // After creating exam, attempt to notify enrolled students with join link
    // try {
    //   const courseId = created?.course?.id || (created as any)?.courseId;
    //   if (courseId) {
    //     const enrollments = await this.enrollmentsService.findByCourse(courseId, req.user);
    //     const studentEmails = (enrollments || [])
    //       .map((enr: any) => enr?.student?.email)
    //       .filter(Boolean) as string[];
    //     const emails = Array.from(new Set(studentEmails));
    //     if (emails.length > 0) {
    //       const frontend = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:8080';
    //       const link = `${frontend}/student/exam-ready?examId=${created.id}`;
    //       const subject = `Invitation to exam: ${created?.title || 'Exam'}`;
    //       const html = `<p>You have been invited to join the exam <strong>${created?.title || 'Exam'}</strong>.</p>
    //         <p>Click to join: <a href="${link}">${link}</a></p>`;
    //       await this.mailerService.sendExamLink(emails, subject, html);
    //     }
    //   }
    // } catch (err) {
    //   // Do not block exam creation if email fails — just log and continue
    //   console.error('Failed to send auto-notification emails for exam creation', err);
    // }

    return created;
  }

  @Get()
  findAll(
    @Request() req,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user.role === 'STUDENT') {
      return this.examsService.getAvailableExamsForStudent(req.user.id);
    }

    const filters: any = {};

    if (req.user.role === 'LECTURER') {
      filters.creatorId = req.user.id;
    }

    if (courseId) filters.courseId = courseId;
    if (status) filters.status = status;

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.examsService.findAll(filters, pagination);
  }

  @Get('available')
  getAvailableExams(@Request() req) {
    return this.examsService.getAvailableExamsForStudent(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.role === 'STUDENT') {
      const clientIp = this.accessPolicy.resolveClientIp(req);
      return this.examsService.findForStudent(id, req.user.id, clientIp);
    }
    return this.examsService.findOne(id);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getStats(@Param('id') id: string) {
    return this.examsService.getExamStats(id);
  }

  @Post(':id/quality-review')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  requestQualityReview(@Param('id') id: string, @Request() req) {
    return this.qualityReviewService.requestReview(id, req.user);
  }

  @Get(':id/quality-review/jobs/:jobId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getQualityReviewJob(@Param('id') id: string, @Param('jobId') jobId: string, @Request() req) {
    return this.qualityReviewService.getJob(id, jobId, req.user);
  }

  @Get(':id/quality-review/suggestions')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  listQualityReviewSuggestions(
    @Param('id') id: string,
    @Query('status') status: string,
    @Request() req,
  ) {
    return this.qualityReviewService.listSuggestions(id, req.user, status);
  }

  @Patch(':id/quality-review/suggestions/:itemId/review')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  reviewQualitySuggestion(
    @Param('itemId') itemId: string,
    @Body() dto: ReviewQualitySuggestionDto,
    @Request() req,
  ) {
    return this.qualityReviewService.reviewSuggestion(itemId, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examsService.update(id, updateExamDto);
  }

  @Patch(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  reschedule(@Param('id') id: string, @Body() rescheduleExamDto: RescheduleExamDto) {
    return this.examsService.reschedule(id, rescheduleExamDto);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  publish(@Param('id') id: string) {
    return this.examsService.publishExam(id);
  }

  @Post(':id/questions')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  addQuestions(
    @Param('id') id: string,
    @Body() addQuestionsDto: AddQuestionsToExamDto,
  ) {
    return this.examsService.addQuestionsToExam(id, addQuestionsDto.questionIds);
  }

  @Patch(':id/questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  updateExamQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() updateDto: UpdateExamQuestionDto,
  ) {
    return this.examsService.updateExamQuestion(id, questionId, updateDto);
  }

  @Delete(':id/questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  removeQuestion(@Param('id') id: string, @Param('questionId') questionId: string) {
    return this.examsService.removeQuestionFromExam(id, questionId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.examsService.remove(id);
  }
}
