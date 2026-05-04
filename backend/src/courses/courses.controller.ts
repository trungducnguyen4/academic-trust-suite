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
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Courses')
@ApiBearerAuth('access-token')
@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  create(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    return this.coursesService.create(createCourseDto, req.user);
  }

  @Get()
  findAll(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    if (req.user.role === 'STUDENT') {
      return this.coursesService.getMyCoursesAsStudent(req.user.id);
    }
    if (req.user.role === 'LECTURER') {
      return this.coursesService.getMyCoursesAsLecturer(req.user.id);
    }
    // Admin sees all
    return this.coursesService.findAll(undefined, pagination);
  }

  @Get('my-courses')
  getMyCourses(@Request() req) {
    if (req.user.role === 'STUDENT') {
      return this.coursesService.getMyCoursesAsStudent(req.user.id);
    }
    return this.coursesService.getMyCoursesAsLecturer(req.user.id);
  }

  @Get('my-recent-courses')
  getMyRecentCourses(@Request() req) {
    const limit = 5; // Fetch the last 5 courses
    return this.coursesService.getMyCoursesAsStudent(req.user.id, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.coursesService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto, @Request() req) {
    return this.coursesService.update(id, updateCourseDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  remove(@Param('id') id: string, @Request() req) {
    return this.coursesService.remove(id, req.user);
  }
}
