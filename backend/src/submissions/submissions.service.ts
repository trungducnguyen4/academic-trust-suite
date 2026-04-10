import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartExamDto, SubmitExamDto, GradeAnswerDto, UpdateSubmissionStatusDto } from './dto/submission.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import { SubmissionsEventsService } from './submissions-events.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private submissionsEvents: SubmissionsEventsService,
  ) {}

  private getRealtimeSeverity(eventType: string): 'low' | 'medium' | 'high' {
    const e = String(eventType || '').toLowerCase();
    if (e.includes('fullscreen') || e.includes('face')) return 'high';
    if (e.includes('tab') || e.includes('paste')) return 'medium';
    return 'low';
  }

  private publishRealtimeLogs(
    examId: string,
    submissionId: string,
    student: { id?: string; fullName?: string; studentId?: string },
    logs: Array<{ type: string; details?: any; ts?: number }>,
  ) {
    const suspiciousTypes = new Set([
      'tab_switch',
      'mouse_anomaly',
      'mouse_idle',
      'copy',
      'paste',
      'fullscreen_exit',
      'window_blur',
      'face_not_detected',
    ]);

    for (const entry of logs || []) {
      const eventType = String(entry?.type || '').toLowerCase();
      if (!suspiciousTypes.has(eventType)) continue;

      const id = `${submissionId}-${eventType}-${entry?.ts || Date.now()}`;
      this.submissionsEvents.emitIntegrityEvent(examId, {
        id,
        submissionId,
        eventType,
        details: entry?.details ? String(entry.details) : eventType,
        timestamp: new Date(entry?.ts || Date.now()).toISOString(),
        severity: this.getRealtimeSeverity(eventType),
        student,
      });
    }
  }
    private notificationsService: NotificationsService,
  ) {}

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

    // Enforce maximum attempts from exam settings (default: 1)
    const settings: any = exam.settings || {};
    const parsedMaxAttempts = Number(settings?.maxAttempts);
    const maxAttempts = Number.isFinite(parsedMaxAttempts)
      ? Math.max(1, Math.floor(parsedMaxAttempts))
      : 1;

    const completedAttempts = await this.prisma.examSubmission.count({
      where: {
        examId: startExamDto.examId,
        studentId,
        status: { in: ['SUBMITTED', 'GRADED', 'FLAGGED'] },
      },
    });

    if (completedAttempts >= maxAttempts) {
      throw new ConflictException(
        `Attempt limit reached (${completedAttempts}/${maxAttempts}).`,
      );
    }

    // Create new submission
    const startedSubmission = await this.prisma.examSubmission.create({
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

    try {
      await this.notificationsService.create({
        recipientId: studentId,
        kind: 'EXAM_SESSION_STARTED',
        title: 'Exam session started',
        message: `You started ${startedSubmission.exam.title}.`,
        link: `/student/exam-ready?examId=${startedSubmission.exam.id}`,
        priority: 'low',
        metadata: { submissionId: startedSubmission.id, examId: startedSubmission.exam.id },
      });
    } catch {
      // Notification failures must not block exam start.
    }

    return startedSubmission;
  }

  async submitExam(submissionId: string, submitExamDto: SubmitExamDto, studentId: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
          },
        },
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

    // Basic validation / security for logs
    const logs = submitExamDto.logs || [];
    if (logs.length > 1000) {
      throw new BadRequestException('Too many log entries');
    }
    let totalLogChars = 0;
    for (const l of logs) {
      const detailsStr = l.details ? String(l.details) : '';
      totalLogChars += detailsStr.length;
      if (detailsStr.length > 2000) {
        throw new BadRequestException('Log entry too large');
      }
    }
    if (totalLogChars > 200000) {
      throw new BadRequestException('Proctoring logs payload too large');
    }

    // Use transaction to ensure atomicity of answer creation + submission update + logs
    const result = await this.prisma.$transaction(async (tx) => {
    const updatedSubmission = await this.prisma.$transaction(async (tx) => {
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

      // Create or update proctoring session and logs (inside same transaction)
      if (logs.length > 0) {
        // compute simple aggregates
        const tabSwitchCount = logs.filter((x) => x.type === 'tab_switch').length;
        // upsert ProctoringSession by submissionId
        const proctoringSession = await tx.proctoringSession.upsert({
          where: { submissionId },
          create: {
            submissionId,
            tabSwitchCount,
            mouseAnomalies: logs.filter((x) => x.type === 'mouse_anomaly').length,
          },
          update: {
            tabSwitchCount: { increment: tabSwitchCount },
            mouseAnomalies: { increment: logs.filter((x) => x.type === 'mouse_anomaly').length },
          },
        });
        const proctoringId = proctoringSession.id;

        // prepare integrity logs
        const createLogs = logs.map((l) => ({
          proctoringId,
          eventType: String(l.type).slice(0, 100),
          details: l.details ? String(l.details).slice(0, 2000) : undefined,
          timestamp: l.ts ? new Date(l.ts) : new Date(),
        }));
        if (createLogs.length > 0) {
          // createMany is faster; fallback to individual create if needed
          await tx.integrityLog.createMany({ data: createLogs });
        }
      }

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

    if (logs.length > 0) {
      this.publishRealtimeLogs(
        submission.examId,
        submission.id,
        {
          id: submission.student?.id,
          fullName: submission.student?.fullName,
          studentId: submission.student?.studentId,
        },
        logs,
      );
    }

    return result;
  }

  async addLogs(submissionId: string, logs: Array<{ type: string; details?: any; ts?: number }>, studentId: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
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

    // Validate logs payload (reuse same limits as submitExam)
    const entries = logs || [];
    if (entries.length > 1000) {
      throw new BadRequestException('Too many log entries');
    }
    let totalLogChars = 0;
    for (const l of entries) {
      const detailsStr = l.details ? String(l.details) : '';
      totalLogChars += detailsStr.length;
      if (detailsStr.length > 2000) {
        throw new BadRequestException('Log entry too large');
      }
    }
    if (totalLogChars > 200000) {
      throw new BadRequestException('Proctoring logs payload too large');
    }

    // Persist proctoring aggregates and integrity logs
    const result = await this.prisma.$transaction(async (tx) => {
      const tabSwitchCount = entries.filter((x) => String(x.type).toLowerCase() === 'tab_switch').length;
      const mouseAnomalies = entries.filter((x) => String(x.type).toLowerCase() === 'mouse_anomaly').length;

      const proctoringSession = await tx.proctoringSession.upsert({
        where: { submissionId },
        create: {
          submissionId,
          tabSwitchCount,
          mouseAnomalies,
        },
        update: {
          tabSwitchCount: { increment: tabSwitchCount },
          mouseAnomalies: { increment: mouseAnomalies },
        },
      });

      const proctoringId = proctoringSession.id;
      const createLogs = entries.map((l) => ({
        proctoringId,
        eventType: String(l.type).slice(0, 100),
        details: l.details ? String(l.details).slice(0, 2000) : undefined,
        timestamp: l.ts ? new Date(l.ts) : new Date(),
      }));

      if (createLogs.length > 0) {
        await tx.integrityLog.createMany({ data: createLogs });
      }

      return { success: true };
    });

    if (entries.length > 0) {
      this.publishRealtimeLogs(
        submission.examId,
        submission.id,
        {
          id: submission.student?.id,
          fullName: submission.student?.fullName,
          studentId: submission.student?.studentId,
        },
        entries,
      );
    }

    return result;
    try {
      await this.notificationsService.create({
        recipientId: studentId,
        kind: 'SUBMISSION_RECEIVED',
        title: 'Submission received',
        message: `Your submission for ${updatedSubmission.exam.title} has been received.`,
        link: '/student/results',
        priority: 'normal',
        metadata: {
          submissionId: updatedSubmission.id,
          examId: updatedSubmission.exam.id,
          status: updatedSubmission.status,
          score: updatedSubmission.score,
        },
      });

      const submissionMeta = await this.prisma.examSubmission.findUnique({
        where: { id: submissionId },
        select: {
          student: { select: { fullName: true } },
          exam: {
            select: {
              id: true,
              title: true,
              creatorId: true,
            },
          },
          proctoring: {
            select: {
              tabSwitchCount: true,
              mouseAnomalies: true,
            },
          },
        },
      });

      if (submissionMeta?.exam.creatorId) {
        await this.notificationsService.create({
          recipientId: submissionMeta.exam.creatorId,
          kind: 'SUBMISSION_RECEIVED',
          title: 'New submission received',
          message: `${submissionMeta.student.fullName} submitted ${submissionMeta.exam.title}.`,
          link: `/lecturer/exam/${submissionMeta.exam.id}/results`,
          priority: 'normal',
          metadata: {
            submissionId,
            examId: submissionMeta.exam.id,
            studentName: submissionMeta.student.fullName,
          },
        });

        const tabSwitchCount = Number(submissionMeta.proctoring?.tabSwitchCount || 0);
        const mouseAnomalies = Number(submissionMeta.proctoring?.mouseAnomalies || 0);
        if (tabSwitchCount >= 5 || mouseAnomalies >= 8) {
          await this.notificationsService.createMany([
            {
              recipientId: submissionMeta.exam.creatorId,
              kind: 'INTEGRITY_RISK_DETECTED',
              title: 'Integrity risk detected',
              message: `${submissionMeta.student.fullName} has suspicious behavior in ${submissionMeta.exam.title}.`,
              link: `/lecturer/exam/${submissionMeta.exam.id}/monitor`,
              priority: 'high',
              metadata: {
                submissionId,
                examId: submissionMeta.exam.id,
                tabSwitchCount,
                mouseAnomalies,
              },
            },
          ]);

          await this.notificationsService.createForRole('ADMIN', {
            kind: 'INTEGRITY_RISK_DETECTED',
            title: 'Integrity risk flagged',
            message: `Potential integrity risk in exam ${submissionMeta.exam.title}.`,
            link: '/admin/integrity',
            priority: 'high',
            metadata: {
              submissionId,
              examId: submissionMeta.exam.id,
              tabSwitchCount,
              mouseAnomalies,
            },
          });
        }
      }
    } catch {
      // Notification failures must not block submission flow.
    }

    return updatedSubmission;
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
    const gradedSubmission = await this.prisma.$transaction(async (tx) => {
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

    try {
      const result = await this.prisma.examSubmission.findUnique({
        where: { id: submissionId },
        select: {
          studentId: true,
          score: true,
          exam: {
            select: {
              id: true,
              title: true,
              totalPoints: true,
              creatorId: true,
            },
          },
        },
      });

      if (result) {
        await this.notificationsService.createMany([
          {
            recipientId: result.studentId,
            kind: 'SUBMISSION_GRADED',
            title: 'Grade available',
            message: `Your score for ${result.exam.title} is ${result.score ?? 0}/${result.exam.totalPoints ?? 0}.`,
            link: '/student/results',
            priority: 'high',
            metadata: { submissionId, examId: result.exam.id, score: result.score },
          },
          {
            recipientId: result.exam.creatorId,
            kind: 'GRADING_COMPLETED',
            title: 'Grading completed',
            message: `Grading is finalized for ${result.exam.title}.`,
            link: `/lecturer/exam/${result.exam.id}/results`,
            priority: 'normal',
            metadata: { submissionId, examId: result.exam.id },
          },
        ]);
      }
    } catch {
      // Notification failures must not block finalization.
    }

    return gradedSubmission;
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

  async getExamOverview(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        totalPoints: true,
        status: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const [submissions, proctoringSessions, integrityLogs] = await Promise.all([
      this.prisma.examSubmission.findMany({
        where: { examId },
        select: {
          id: true,
          status: true,
          score: true,
          startedAt: true,
          submittedAt: true,
          student: {
            select: {
              id: true,
              fullName: true,
              studentId: true,
            },
          },
        },
      }),
      this.prisma.proctoringSession.findMany({
        where: {
          submission: {
            examId,
          },
        },
        select: {
          id: true,
          tabSwitchCount: true,
          mouseAnomalies: true,
          submission: {
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentId: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.integrityLog.findMany({
        where: {
          proctoring: {
            submission: {
              examId,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 80,
        select: {
          id: true,
          eventType: true,
          details: true,
          timestamp: true,
          proctoring: {
            select: {
              submission: {
                select: {
                  id: true,
                  student: {
                    select: {
                      id: true,
                      fullName: true,
                      studentId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const completed = submissions.filter((s) => ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(s.status));
    const scoresPct = completed
      .filter((s) => typeof s.score === 'number')
      .map((s) => {
        const scoreValue = Number(s.score || 0);
        if ((exam.totalPoints || 0) > 0) {
          return Math.max(0, Math.min(100, (scoreValue / Number(exam.totalPoints)) * 100));
        }
        return Math.max(0, Math.min(100, scoreValue));
      });

    const bins = [
      { key: '0-20', min: 0, max: 20, count: 0 },
      { key: '21-40', min: 21, max: 40, count: 0 },
      { key: '41-60', min: 41, max: 60, count: 0 },
      { key: '61-80', min: 61, max: 80, count: 0 },
      { key: '81-100', min: 81, max: 100, count: 0 },
    ];

    for (const value of scoresPct) {
      const rounded = Math.round(value);
      const bucket = bins.find((b) => rounded >= b.min && rounded <= b.max);
      if (bucket) bucket.count += 1;
    }

    const suspiciousTypes = new Set([
      'tab_switch',
      'mouse_anomaly',
      'mouse_idle',
      'copy',
      'paste',
      'fullscreen_exit',
      'window_blur',
      'face_not_detected',
    ]);

    const mappedLogs = integrityLogs
      .filter((log) => suspiciousTypes.has((log.eventType || '').toLowerCase()))
      .map((log) => {
        const event = (log.eventType || 'unknown').toLowerCase();
        const severity = event.includes('fullscreen') || event.includes('face')
          ? 'high'
          : event.includes('tab') || event.includes('paste')
            ? 'medium'
            : 'low';

        return {
          id: log.id,
          eventType: log.eventType,
          details: log.details || '',
          timestamp: log.timestamp,
          severity,
          student: log.proctoring?.submission?.student || null,
          submissionId: log.proctoring?.submission?.id || null,
        };
      });

    const syntheticLogs = proctoringSessions.flatMap((p) => {
      const records: any[] = [];
      const tabSwitchCount = Number(p.tabSwitchCount || 0);
      const mouseAnomalies = Number(p.mouseAnomalies || 0);

      if (tabSwitchCount > 0) {
        records.push({
          id: `tab-${p.id}`,
          eventType: 'tab_switch',
          details: `Detected ${tabSwitchCount} tab switches`,
          timestamp: new Date(),
          severity: tabSwitchCount >= 5 ? 'high' : 'medium',
          student: p.submission.student,
          submissionId: p.submission.id,
        });
      }

      if (mouseAnomalies > 0) {
        records.push({
          id: `mouse-${p.id}`,
          eventType: 'mouse_anomaly',
          details: `Detected ${mouseAnomalies} mouse anomalies`,
          timestamp: new Date(),
          severity: mouseAnomalies >= 8 ? 'high' : 'medium',
          student: p.submission.student,
          submissionId: p.submission.id,
        });
      }

      return records;
    });

    const anomalies = [...mappedLogs, ...syntheticLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25);

    return {
      exam,
      summary: {
        totalSubmissions: submissions.length,
        inProgress: submissions.filter((s) => s.status === 'IN_PROGRESS').length,
        completed: completed.length,
        avgScorePct: scoresPct.length ? Number((scoresPct.reduce((a, b) => a + b, 0) / scoresPct.length).toFixed(1)) : 0,
        highestScorePct: scoresPct.length ? Number(Math.max(...scoresPct).toFixed(1)) : 0,
        lowestScorePct: scoresPct.length ? Number(Math.min(...scoresPct).toFixed(1)) : 0,
      },
      scoreDistribution: bins,
      anomalies,
      updatedAt: new Date().toISOString(),
    };
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

  /**
   * Export exam results as CSV string. Returns CSV content (headers + rows).
   */
  async exportExamResults(examId: string) {
    const submissions = await this.prisma.examSubmission.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'GRADED', 'FLAGGED'] } },
      include: {
        student: {
          select: { fullName: true, studentId: true, email: true },
        },
        answers: true,
        exam: { select: { id: true, title: true, totalPoints: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Build CSV
    const rows: string[] = [];
    // header
    rows.push(['Student Name', 'Student ID', 'Email', 'Score', 'Total Points', 'Time Spent (mins)', 'Status', 'Submitted At'].join(','));

    for (const s of submissions) {
      const studentName = (s.student?.fullName || '').replace(/,/g, '');
      const studentId = s.student?.studentId || '';
      const email = s.student?.email || '';
      const score = s.score != null ? String(s.score) : '';
      const totalPoints = s.exam?.totalPoints != null ? String(s.exam.totalPoints) : '';
      let timeSpentMins = '';
      if (s.startedAt && s.submittedAt) {
        const diffMs = new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime();
        timeSpentMins = String(Math.round(diffMs / 60000));
      }
      const status = s.status || '';
      const submittedAt = s.submittedAt ? new Date(s.submittedAt).toISOString() : '';

      rows.push([studentName, studentId, email, score, totalPoints, timeSpentMins, status, submittedAt].join(','));
    }

    return rows.join('\n');
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
                points: true,
                explanation: true,
                // Include correct answer for review
                correctAnswer: true,
              },
            },
          },
        },
        proctoring: {
          include: {
            logs: true,
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

    const updated = await this.prisma.examSubmission.update({
      where: { id },
      data: { status: updateDto.status },
    });

    try {
      const context = await this.prisma.examSubmission.findUnique({
        where: { id },
        select: {
          studentId: true,
          exam: { select: { id: true, title: true, creatorId: true } },
        },
      });

      if (context) {
        const recipients = Array.from(new Set([context.studentId, context.exam.creatorId]));
        await this.notificationsService.createForUsers(recipients, {
          kind: 'SUBMISSION_STATUS_UPDATED',
          title: 'Submission status updated',
          message: `Submission status for ${context.exam.title} changed to ${updateDto.status}.`,
          link:
            updateDto.status === 'FLAGGED'
              ? `/lecturer/exam/${context.exam.id}/monitor`
              : `/lecturer/exam/${context.exam.id}/results`,
          priority: updateDto.status === 'FLAGGED' ? 'high' : 'normal',
          metadata: { submissionId: id, examId: context.exam.id, status: updateDto.status },
        });

        if (updateDto.status === 'FLAGGED') {
          await this.notificationsService.createForRole('ADMIN', {
            kind: 'SUBMISSION_FLAGGED',
            title: 'Submission flagged',
            message: `A submission in ${context.exam.title} was flagged for review.`,
            link: '/admin/integrity',
            priority: 'high',
            metadata: { submissionId: id, examId: context.exam.id },
          });
        }
      }
    } catch {
      // Notification failures must not block status update.
    }

    return updated;
  }
}
