import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions-v2.service';
import { CreateTopicDto, ListTopicsQueryDto, SetCourseTopicsDto } from './dto/question-metadata.dto';

@ApiTags('Questions Metadata')
@ApiBearerAuth('access-token')
@Controller('questions/metadata')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('LECTURER', 'ADMIN')
export class QuestionMetadataController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('topics')
  listTopics(@Query() query: ListTopicsQueryDto) {
    return this.questionsService.listTopics(query);
  }

  @Post('topics')
  createTopic(@Body() dto: CreateTopicDto, @Request() req) {
    return this.questionsService.createOrGetTopic(dto, req.user);
  }

  @Put('courses/:courseId/topics')
  setCourseTopics(@Param('courseId') courseId: string, @Body() dto: SetCourseTopicsDto) {
    return this.questionsService.setCourseTopics(courseId, dto.topicIds || []);
  }
}
