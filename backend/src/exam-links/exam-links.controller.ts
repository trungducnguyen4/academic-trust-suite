import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExamLinksService } from './exam-links.service';
import { GenerateExamLinkDto, JoinExamLinkDto, UpdateExamLinkDto } from './dto/exam-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Exam Links')
@ApiBearerAuth('access-token')
@Controller()
export class ExamLinksController {
  constructor(private readonly examLinksService: ExamLinksService) {}

  @Post('exams/:id/generate-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  generateLink(@Param('id') examId: string, @Body() dto: GenerateExamLinkDto, @Request() req) {
    return this.examLinksService.generateLink(examId, dto, req.user.id, req.user.role);
  }

  @Get('exams/:id/links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  listExamLinks(@Param('id') examId: string, @Request() req) {
    return this.examLinksService.listByExam(examId, req.user.id, req.user.role);
  }

  @Get('exam-links/validate/:token')
  validateToken(@Param('token') token: string) {
    return this.examLinksService.validateToken(token);
  }

  @Post('exam-links/:token/join')
  @UseGuards(JwtAuthGuard)
  joinByToken(@Param('token') token: string, @Body() dto: JoinExamLinkDto, @Request() req) {
    const userId = req?.user?.id;
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
    const userAgent = req?.headers?.['user-agent'] || undefined;

    return this.examLinksService.joinByToken(token, dto, {
      userId,
      ip: Array.isArray(ip) ? ip[0] : ip,
      userAgent,
    });
  }

  @Patch('exam-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  updateLink(@Param('id') id: string, @Body() dto: UpdateExamLinkDto, @Request() req) {
    return this.examLinksService.updateLink(id, dto, req.user.id, req.user.role);
  }

  @Get('exam-links/:id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  getUsage(@Param('id') id: string, @Request() req) {
    return this.examLinksService.usageByLink(id, req.user.id, req.user.role);
  }
}
