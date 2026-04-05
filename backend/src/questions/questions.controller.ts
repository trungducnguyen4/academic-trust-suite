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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Questions')
@ApiBearerAuth('access-token')
@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  create(@Body() createQuestionDto: CreateQuestionDto, @Request() req) {
    return this.questionsService.create(createQuestionDto, req.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  findAll(
    @Request() req,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    // Lecturers only see their own questions
    if (req.user.role === 'LECTURER') {
      filters.creatorId = req.user.id;
    }

    if (courseId) filters.courseId = courseId;
    if (type) filters.type = type;
    if (difficulty) filters.difficulty = parseInt(difficulty, 10);
    if (search) filters.search = search;

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.questionsService.findAll(filters, pagination);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getStats(@Request() req) {
    const creatorId = req.user.role === 'LECTURER' ? req.user.id : undefined;
    return this.questionsService.getQuestionStats(creatorId);
  }

  @Get('by-tags')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getByTags(@Request() req, @Query('tags') tags: string) {
    const tagArray = tags.split(',').map((t) => t.trim());
    const creatorId = req.user.role === 'LECTURER' ? req.user.id : undefined;
    return this.questionsService.getQuestionsByTags(tagArray, creatorId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  findOne(@Param('id') id: string, @Request() req) {
    return this.questionsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto, @Request() req) {
    return this.questionsService.update(id, updateQuestionDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  remove(@Param('id') id: string, @Request() req) {
    return this.questionsService.remove(id, req.user);
  }
}
