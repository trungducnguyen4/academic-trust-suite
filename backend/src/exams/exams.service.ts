import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto, UpdateExamDto, AddQuestionsToExamDto, UpdateExamQuestionDto } from './dto/exam.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.$transaction(async (tx) => {
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
      }

      return exam;
    });
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

    return this.prisma.exam.update({
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
  }

  async remove(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Delete related exam questions first
    await this.prisma.examQuestion.deleteMany({ where: { examId: id } });

    await this.prisma.exam.delete({ where: { id } });

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

    return this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
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
}
