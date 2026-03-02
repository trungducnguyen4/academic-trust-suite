import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartExamDto, SubmitExamDto, GradeAnswerDto, UpdateSubmissionStatusDto } from './dto/submission.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async startExam(startExamDto: StartExamDto, studentId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: startExamDto.examId },
      include: {
        course: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if student is enrolled
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

    // Check if exam is available
    if (exam.status !== 'PUBLISHED' && exam.status !== 'ONGOING') {
      throw new ForbiddenException('Exam is not available');
    }

    const now = new Date();
    if (exam.startTime && exam.startTime > now) {
      throw new ForbiddenException('Exam has not started yet');
    }

    if (exam.endTime && exam.endTime < now) {
      throw new ForbiddenException('Exam has ended');
    }

    // Check if already submitted
    const existingSubmission = await this.prisma.examSubmission.findFirst({
      where: {
        examId: startExamDto.examId,
        studentId,
        status: { in: ['SUBMITTED', 'GRADED'] },
      },
    });

    if (existingSubmission) {
      throw new ConflictException('You have already submitted this exam');
    }

    // Check for in-progress submission
    const inProgressSubmission = await this.prisma.examSubmission.findFirst({
      where: {
        examId: startExamDto.examId,
        studentId,
        status: 'IN_PROGRESS',
      },
    });

    if (inProgressSubmission) {
      return inProgressSubmission;
    }

    // Create new submission
    return this.prisma.examSubmission.create({
      data: {
        examId: startExamDto.examId,
        studentId,
        status: 'IN_PROGRESS',
        startedAt: now,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            duration: true,
          },
        },
      },
    });
  }

  async submitExam(submissionId: string, submitExamDto: SubmitExamDto, studentId: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('Not authorized');
    }

    if (submission.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Exam already submitted');
    }

    const now = new Date();

    // Use transaction to ensure atomicity of answer creation + submission update
    return this.prisma.$transaction(async (tx) => {
      // Create submission answers
      let totalScore = 0;
      const autoGradedTypes = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE'];

      for (const answerDto of submitExamDto.answers) {
        const examQuestion = submission.exam.examQuestions.find(
          (eq) => eq.questionId === answerDto.questionId,
        );

        if (!examQuestion) continue;

        let pointsAwarded = 0;
        let isCorrect = false;

        // Auto-grade for objective question types
        if (autoGradedTypes.includes(examQuestion.question.type)) {
          const correctAnswer = examQuestion.question.correctAnswer;
          if (correctAnswer && this.compareAnswers(answerDto.answer, correctAnswer)) {
            pointsAwarded = examQuestion.points || examQuestion.question.points || 1;
            isCorrect = true;
          }
        }

        totalScore += pointsAwarded;

        await tx.submissionAnswer.create({
          data: {
            submissionId,
            questionId: answerDto.questionId,
            answer: answerDto.answer,
            timeTaken: answerDto.timeTaken,
            isCorrect,
            pointsAwarded,
          },
        });
      }

      // Check if all questions are auto-gradable
      const hasManualGrading = submission.exam.examQuestions.some(
        (eq) => !autoGradedTypes.includes(eq.question.type),
      );

      // Update submission
      return tx.examSubmission.update({
        where: { id: submissionId },
        data: {
          status: hasManualGrading ? 'SUBMITTED' : 'GRADED',
          submittedAt: now,
          score: totalScore,
        },
        include: {
        exam: {
          select: {
            id: true,
            title: true,
            totalPoints: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
              },
            },
          },
        },
      },
    });
    }); // end $transaction
  }

  private compareAnswers(submitted: any, correct: any): boolean {
    if (typeof submitted === 'object' && typeof correct === 'object') {
      return JSON.stringify(submitted) === JSON.stringify(correct);
    }
    return submitted === correct;
  }

  async gradeAnswer(gradeDto: GradeAnswerDto) {
    const answer = await this.prisma.submissionAnswer.findUnique({
      where: { id: gradeDto.submissionAnswerId },
      include: {
        submission: true,
      },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return this.prisma.submissionAnswer.update({
      where: { id: gradeDto.submissionAnswerId },
      data: {
        pointsAwarded: gradeDto.pointsAwarded,
        feedback: gradeDto.feedback,
      },
    });
  }

  async finalizeGrading(submissionId: string) {
    // Use transaction to ensure score calculation and status update are atomic
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.examSubmission.findUnique({
        where: { id: submissionId },
        include: {
          answers: true,
        },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      const totalScore = submission.answers.reduce(
        (sum, a) => sum + (a.pointsAwarded || 0),
        0,
      );

      return tx.examSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'GRADED',
          score: totalScore,
          gradedAt: new Date(),
        },
      });
    });
  }

  async findByExam(examId: string, pagination?: PaginationDto) {
    const where = { examId };
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [submissions, total] = await Promise.all([
      this.prisma.examSubmission.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentId: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.examSubmission.count({ where }),
    ]);

    return buildPaginatedResult(submissions, total, page, limit);
  }

  async findAll(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [submissions, total] = await Promise.all([
      this.prisma.examSubmission.findMany({
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentId: true,
            },
          },
          exam: {
            select: {
              id: true,
              title: true,
              totalPoints: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.examSubmission.count(),
    ]);

    return buildPaginatedResult(submissions, total, page, limit);
  }

  async findByStudent(studentId: string) {
    return this.prisma.examSubmission.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            totalPoints: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            totalPoints: true,
            passingScore: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async getStudentSubmission(examId: string, studentId: string) {
    return this.prisma.examSubmission.findFirst({
      where: { examId, studentId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            totalPoints: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                explanation: true,
                // Include correct answer for review
                correctAnswer: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, updateDto: UpdateSubmissionStatusDto) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.prisma.examSubmission.update({
      where: { id },
      data: { status: updateDto.status },
    });
  }
}
