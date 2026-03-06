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
import { CreateExamDto, UpdateExamDto, AddQuestionsToExamDto, UpdateExamQuestionDto } from './dto/exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  create(@Body() createExamDto: CreateExamDto, @Request() req) {
    return this.examsService.create(createExamDto, req.user.id);
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
      return this.examsService.findForStudent(id, req.user.id);
    }
    return this.examsService.findOne(id);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getStats(@Param('id') id: string) {
    return this.examsService.getExamStats(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examsService.update(id, updateExamDto);
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
