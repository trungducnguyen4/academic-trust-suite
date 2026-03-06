import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto, BulkEnrollmentDto, BulkEnrollByEmailsDto, UpdateEnrollmentStatusDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Enrollments')
@ApiBearerAuth('access-token')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  bulkEnroll(@Body() bulkEnrollmentDto: BulkEnrollmentDto) {
    return this.enrollmentsService.bulkEnroll(bulkEnrollmentDto);
  }

  @Post('bulk-by-emails')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  bulkEnrollByEmails(@Body() dto: BulkEnrollByEmailsDto) {
    return this.enrollmentsService.bulkEnrollByEmails(dto);
  }

  @Get('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  findByCourse(@Param('courseId') courseId: string) {
    return this.enrollmentsService.findByCourse(courseId);
  }

  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string, @Request() req) {
    // Students can only view their own enrollments
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      return [];
    }
    return this.enrollmentsService.findByStudent(studentId);
  }

  @Get('my-enrollments')
  getMyEnrollments(@Request() req) {
    return this.enrollmentsService.findByStudent(req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(id);
  }

  @Delete('course/:courseId/student/:studentId')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  removeByStudentAndCourse(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.enrollmentsService.removeByStudentAndCourse(studentId, courseId);
  }
}
