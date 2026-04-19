import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto, UpdateExamDto, AddQuestionsToExamDto, UpdateExamQuestionDto, RescheduleExamDto } from './dto/exam.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private async getCourseRecipientIds(courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    });
    return enrollments.map((e) => e.studentId);
  }

  async create(createExamDto: CreateExamDto, creatorId: string) {
    const { questionIds, ...examData } = createExamDto;

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createExamDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Use transaction: create exam + attach questions atomically
    const createdExam = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          ...examData,
          creatorId,
          startTime: examData.startTime ? new Date(examData.startTime) : null,
          endTime: examData.endTime ? new Date(examData.endTime) : null,
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      // Add questions if provided
      if (questionIds && questionIds.length > 0) {
        for (let i = 0; i < questionIds.length; i++) {
          await tx.examQuestion.create({
            data: {
              examId: exam.id,
              questionId: questionIds[i],
              orderIndex: i + 1,
            },
          });
        }
      } else {
        // Auto-fill from question bank when requested
        const requestedCount = (createExamDto as any).settings?.requestedQuestionCount ||
          (examData as any).settings?.requestedQuestionCount || 0;

        const sourceMethod = (createExamDto as any).settings?.sourceMethod ||
          (examData as any).settings?.sourceMethod || 'bank';

        // Only auto-fill for bank source and a positive requestedCount
        if (!questionIds && sourceMethod === 'bank' && requestedCount > 0) {
          // Build basic where clause: same course
          const qWhere: any = { courseId: createExamDto.courseId };

          // Optionally filter by questionType if provided in settings
          const qType = (createExamDto as any).settings?.questionType || (examData as any).settings?.questionType;
          const normalizedType = this.normalizeQuestionType(qType);
          if (normalizedType) {
            qWhere.type = normalizedType;
          }

          // Optionally filter by target difficulty from settings (0.3 / 0.5 / 0.7)
          const bankDifficulty = (createExamDto as any).settings?.bankDifficulty || (examData as any).settings?.bankDifficulty;
          if (bankDifficulty && bankDifficulty !== 'mixed') {
            const parsed = Number(bankDifficulty);
            if (!Number.isNaN(parsed)) {
              // Convert 0..1 scale to 1..5 and allow a small band around the center.
              const center = Math.max(1, Math.min(5, Math.round(parsed * 4 + 1)));
              qWhere.difficulty = {
                gte: Math.max(1, center - 1),
                lte: Math.min(5, center + 1),
              };
            }
          }

          const selected = await tx.question.findMany({
            where: qWhere,
            take: Math.max(0, Number(requestedCount)),
            orderBy: { createdAt: 'desc' },
          });

          if (selected.length === 0) {
            throw new BadRequestException(
              'No matching questions found in question bank for selected course/type/difficulty. Please adjust filters or add questions first.',
            );
          }

          for (let i = 0; i < selected.length; i++) {
            const question = selected[i];
            await tx.examQuestion.create({
              data: {
                examId: exam.id,
                questionId: question.id,
                orderIndex: i + 1,
                points: question.points || 1,
              },
            });
          }
        }
      }

      // If exam has at least one question, auto-publish by default
      const qCount = await tx.examQuestion.count({ where: { examId: exam.id } });
      if (qCount > 0) {
        await tx.exam.update({ where: { id: exam.id }, data: { status: 'PUBLISHED' } });
      }

      // Return exam with counts so client shows question count and status immediately
      const createdExam = await tx.exam.findUnique({
        where: { id: exam.id },
        include: {
          course: { select: { id: true, code: true, name: true } },
          creator: { select: { id: true, fullName: true } },
          _count: { select: { examQuestions: true, submissions: true } },
        },
      });

      return createdExam;
    });

    try {
      const studentIds = await this.getCourseRecipientIds(createdExam.course.id);

      await this.notificationsService.createForUsers(studentIds, {
        kind: 'EXAM_CREATED',
        title: 'New exam available',
        message: `A new exam \"${createdExam.title}\" is available in ${createdExam.course.code}.`,
        link: '/student/exams',
        priority: 'high',
        metadata: { examId: createdExam.id, courseId: createdExam.course.id },
      });

      await this.notificationsService.createForRole('ADMIN', {
        kind: 'EXAM_CREATED',
        title: 'Exam created',
        message: `${createdExam.creator.fullName} created exam \"${createdExam.title}\".`,
        link: '/admin',
        priority: 'low',
        metadata: { examId: createdExam.id, creatorId },
      });
    } catch {
      // Notification failures must not block exam creation.
    }

    return createdExam;
  }

  async findAll(filters?: {
    courseId?: string;
    creatorId?: string;
    status?: string;
  }, pagination?: PaginationDto) {
    const where: any = {};

    if (filters?.courseId) {
      where.courseId = filters.courseId;
    }

    if (filters?.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
            },
          },
          _count: {
            select: {
              examQuestions: true,
              submissions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exam.count({ where }),
    ]);

    return buildPaginatedResult(exams, total, page, limit);
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
          },
        },
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async findForStudent(id: string, studentId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        examQuestions: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                points: true,
                // Don't include correctAnswer for students
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if student is enrolled in the course
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId: exam.courseId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Check if exam is published and within time range
    if (exam.status !== 'PUBLISHED' && exam.status !== 'ONGOING') {
      throw new ForbiddenException('Exam is not available');
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const updateData: any = { ...updateExamDto };

    if (updateExamDto.startTime) {
      updateData.startTime = new Date(updateExamDto.startTime);
    }

    if (updateExamDto.endTime) {
      updateData.endTime = new Date(updateExamDto.endTime);
    }

    const updatedExam = await this.prisma.exam.update({
      where: { id },
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    try {
      const studentIds = await this.getCourseRecipientIds(updatedExam.course.id);
      await this.notificationsService.createForUsers(studentIds, {
        kind: 'EXAM_UPDATED',
        title: 'Exam updated',
        message: `Exam \"${updatedExam.title}\" has updated details or schedule.`,
        link: '/student/exams',
        priority: 'high',
        metadata: { examId: updatedExam.id, courseId: updatedExam.course.id },
      });
    } catch {
      // Notification failures must not block exam update.
    }

    return updatedExam;
  }

  async reschedule(id: string, rescheduleExamDto: RescheduleExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.status === 'ONGOING') {
      throw new BadRequestException('Cannot reschedule an ongoing exam');
    }

    if (exam.status === 'COMPLETED' || exam.status === 'ARCHIVED') {
      throw new BadRequestException(`Cannot reschedule exam with status ${exam.status}`);
    }

    if (exam._count.submissions > 0) {
      throw new BadRequestException('Cannot reschedule exam that already has submissions');
    }

    if (exam.startTime && exam.startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot reschedule an exam that has already started');
    }

    const startTime = new Date(rescheduleExamDto.startTime);
    const endTime = new Date(rescheduleExamDto.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid startTime or endTime');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const availableWindowMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (availableWindowMinutes < exam.duration) {
      throw new BadRequestException(
        `Exam duration (${exam.duration} minutes) exceeds the scheduled window`,
      );
    }

    const updatedExam = await this.prisma.exam.update({
      where: { id },
      data: {
        startTime,
        endTime,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    try {
      const studentIds = await this.getCourseRecipientIds(updatedExam.course.id);
      await this.notificationsService.createForUsers(studentIds, {
        kind: 'EXAM_UPDATED',
        title: 'Exam rescheduled',
        message: `Exam "${updatedExam.title}" has a new schedule. Please check the updated exam time.`,
        link: '/student/exams',
        priority: 'high',
        metadata: {
          examId: updatedExam.id,
          courseId: updatedExam.course.id,
          startTime: updatedExam.startTime,
          endTime: updatedExam.endTime,
        },
      });
    } catch {
      // Notification failures must not block exam reschedule.
    }

    return updatedExam;
  }

  async remove(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Use SQL cleanup to remain robust even when Prisma delegates are out of sync.
        await tx.$executeRawUnsafe(
          `DELETE il
           FROM integrity_logs il
           INNER JOIN proctoring_sessions ps ON ps.id = il.proctoringId
           INNER JOIN exam_submissions es ON es.id = ps.submissionId
           WHERE es.examId = ?`,
          id,
        );

        await tx.$executeRawUnsafe(
          `DELETE sa
           FROM submission_answers sa
           INNER JOIN exam_submissions es ON es.id = sa.submissionId
           WHERE es.examId = ?`,
          id,
        );

        await tx.$executeRawUnsafe(
          `DELETE ps
           FROM proctoring_sessions ps
           INNER JOIN exam_submissions es ON es.id = ps.submissionId
           WHERE es.examId = ?`,
          id,
        );

        await tx.$executeRawUnsafe(
          'DELETE FROM exam_submissions WHERE examId = ?',
          id,
        );

        await tx.$executeRawUnsafe(
          `DELETE elu
           FROM exam_link_usages elu
           INNER JOIN exam_links el ON el.id = elu.linkId
           WHERE el.examId = ?`,
          id,
        );

        await tx.$executeRawUnsafe('DELETE FROM exam_links WHERE examId = ?', id);
        await tx.$executeRawUnsafe('DELETE FROM exam_questions WHERE examId = ?', id);
        await tx.$executeRawUnsafe('DELETE FROM exams WHERE id = ?', id);
      });
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete exam because it still has related data',
        );
      }

      if (error?.code === 'P2025') {
        throw new NotFoundException('Exam not found');
      }

      console.error('Failed to delete exam', {
        examId: id,
        code: error?.code,
        message: error?.message,
        meta: error?.meta,
      });
      throw new InternalServerErrorException(
        'Failed to delete exam due to a server-side data constraint issue',
      );
    }

    try {
      const studentIds = await this.getCourseRecipientIds(exam.course.id);
      await this.notificationsService.createForUsers(studentIds, {
        kind: 'EXAM_DELETED',
        title: 'Exam removed',
        message: `Exam \"${exam.title}\" in ${exam.course.code} has been removed.`,
        link: '/student/exams',
        priority: 'high',
        metadata: { examId: exam.id, courseId: exam.course.id },
      });
    } catch {
      // Notification failures must not block exam deletion.
    }

    return { message: 'Exam deleted successfully' };
  }

  async addQuestionsToExam(examId: string, questionIds: string[]) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Get current max order index
    const maxOrder = await this.prisma.examQuestion.findFirst({
      where: { examId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    let orderIndex = (maxOrder?.orderIndex || 0) + 1;

    const examQuestions: any[] = [];

    for (const questionId of questionIds) {
      const question = await this.prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        continue; // Skip invalid questions
      }

      // Check if already added
      const existing = await this.prisma.examQuestion.findUnique({
        where: {
          examId_questionId: { examId, questionId },
        },
      });

      if (!existing) {
        const examQuestion = await this.prisma.examQuestion.create({
          data: {
            examId,
            questionId,
            orderIndex,
            points: question.points || 1,
          },
          include: {
            question: true,
          },
        });
        examQuestions.push(examQuestion);
        orderIndex++;
      }
    }

    return examQuestions;
  }

  async removeQuestionFromExam(examId: string, questionId: string) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: {
        examId_questionId: { examId, questionId },
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in exam');
    }

    await this.prisma.examQuestion.delete({
      where: { id: examQuestion.id },
    });

    return { message: 'Question removed from exam' };
  }

  async updateExamQuestion(
    examId: string,
    questionId: string,
    updateDto: UpdateExamQuestionDto,
  ) {
    const examQuestion = await this.prisma.examQuestion.findUnique({
      where: {
        examId_questionId: { examId, questionId },
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in exam');
    }

    return this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: updateDto,
      include: {
        question: true,
      },
    });
  }

  async publishExam(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.examQuestions.length === 0) {
      throw new BadRequestException('Cannot publish exam without questions');
    }

    const publishedExam = await this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    try {
      const fullExam = await this.prisma.exam.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          endTime: true,
          course: { select: { id: true, code: true } },
        },
      });

      if (fullExam) {
        const studentIds = await this.getCourseRecipientIds(fullExam.course.id);
        await this.notificationsService.createForUsers(studentIds, {
          kind: 'EXAM_PUBLISHED',
          title: 'Exam published',
          message: `Exam \"${fullExam.title}\" is now open${fullExam.endTime ? ` until ${fullExam.endTime.toISOString()}` : ''}.`,
          link: '/student/exams',
          priority: 'high',
          metadata: { examId: fullExam.id, courseId: fullExam.course.id },
        });

        await this.notificationsService.createForRole('ADMIN', {
          kind: 'EXAM_PUBLISHED',
          title: 'Exam published',
          message: `Exam \"${fullExam.title}\" (${fullExam.course.code}) has been published.`,
          link: '/admin',
          priority: 'normal',
          metadata: { examId: fullExam.id, courseId: fullExam.course.id },
        });
      }
    } catch {
      // Notification failures must not block exam publishing.
    }

    return publishedExam;
  }

  async getAvailableExamsForStudent(studentId: string) {
    // Get student's enrolled courses
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      select: {
        courseId: true,
      },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    const now = new Date();

    return this.prisma.exam.findMany({
      where: {
        courseId: { in: courseIds },
        status: { in: ['PUBLISHED', 'ONGOING'] },
        OR: [
          { startTime: null },
          { startTime: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endTime: null },
              { endTime: { gte: now } },
            ],
          },
        ],
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            examQuestions: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getExamStats(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        submissions: {
          select: {
            score: true,
            status: true,
          },
        },
        _count: {
          select: {
            examQuestions: true,
            submissions: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const completedSubmissions = exam.submissions.filter(
      (s) => s.status === 'GRADED',
    );
    const scores = completedSubmissions.map((s) => s.score || 0);

    return {
      totalQuestions: exam._count.examQuestions,
      totalSubmissions: exam._count.submissions,
      completedSubmissions: completedSubmissions.length,
      averageScore: scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: exam.passingScore && scores.length > 0
        ? (scores.filter((s) => s >= exam.passingScore).length / scores.length) * 100
        : 0,
    };
  }

  private normalizeQuestionType(rawType?: string): string | undefined {
    if (!rawType) return undefined;

    const map: Record<string, string> = {
      MIXED: '',
      CUSTOM: '',
      MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
      SINGLE_CHOICE: 'MULTIPLE_CHOICE',
      'SINGLE-CHOICE': 'MULTIPLE_CHOICE',
      'MULTIPLE-CHOICE': 'MULTIPLE_CHOICE',
      MULTI_SELECT: 'MULTI_SELECT',
      TRUE_FALSE: 'TRUE_FALSE',
      'TRUE-FALSE': 'TRUE_FALSE',
      SHORT_ANSWER: 'SHORT_ANSWER',
      'SHORT-ANSWER': 'SHORT_ANSWER',
      ESSAY: 'ESSAY',
      FILL_IN_BLANK: 'FILL_IN_BLANK',
      'FILL-BLANK': 'FILL_IN_BLANK',
      MATCHING: 'MATCHING',
      ORDERING: 'ORDERING',
    };

    const normalized = map[String(rawType).trim().toUpperCase()];
    return normalized || undefined;
  }
}
