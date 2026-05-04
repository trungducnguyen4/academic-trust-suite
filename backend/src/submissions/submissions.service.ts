import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isIpInAnyCidr, normalizeIp } from '../common/utils/ip.utils';
import { AccessPolicyService } from '../common/services/access-policy.service';
import { StartExamDto, SubmitExamDto, GradeAnswerDto, UpdateSubmissionStatusDto, AutosaveExamDto } from './dto/submission.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import { SubmissionsEventsService } from './submissions-events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../queue/queue.service';

type AutosaveAnswerMeta = {
  questionId: string;
  sequence: number;
  clientBatchId?: string | null;
  serverVersion?: number | null;
};

type ExistingAutosaveAnswer = {
  id: string;
  questionId: string;
  sequence: number;
};

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private submissionsEvents: SubmissionsEventsService,
    private readonly notificationsService: NotificationsService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly queueService: QueueService,
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

  async startExam(startExamDto: StartExamDto, studentId: string, context?: { remoteIp?: string; forwardedFor?: string; userAgent?: string }): Promise<any> {
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

    // Resolve client IP (respecting trusted proxy configuration) and enforce LAB whitelist
    try {
      const clientIp = this.accessPolicy.resolveClientIpFromParts(context?.remoteIp ?? null, context?.forwardedFor ?? null);
      const check = await this.accessPolicy.isIpAllowedForExam(startExamDto.examId, clientIp);
      if (!check.allowed) {
        await this.accessPolicy.logDeniedAccess(startExamDto.examId, {
          studentId,
          resolvedClientIp: clientIp,
          remoteIp: context?.remoteIp ?? null,
          forwardedFor: context?.forwardedFor ?? null,
          userAgent: context?.userAgent ?? null,
          reasonCode: check.reason || 'LAB_IP_DENIED',
          reasonMessage: 'Access denied by lab IP whitelist',
          route: 'submissions.startExam',
        });
        throw new ForbiddenException('Access denied: outside allowed lab network');
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Access restricted by network policy');
    }

    // Check for in-progress submission (idempotency: return existing IN_PROGRESS)
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

    // Get count of completed attempts to determine next attemptNo
    const completedSubmissions = await this.prisma.examSubmission.findMany({
      where: {
        examId: startExamDto.examId,
        studentId,
        status: { in: ['SUBMITTED', 'GRADED', 'FLAGGED'] },
      },
      select: { attemptNo: true },
      orderBy: { attemptNo: 'desc' },
      take: 1,
    });

    const lastAttemptNo = completedSubmissions[0]?.attemptNo || 0;
    const nextAttemptNo = lastAttemptNo + 1;

    if (nextAttemptNo > maxAttempts) {
      throw new ConflictException(
        `Attempt limit reached (${lastAttemptNo}/${maxAttempts}).`,
      );
    }

    // Create new submission with idempotency (attemptNo versioning)
    // attach the latest exam snapshot (materialized at publish time) if exists
    const latestSnapshot = await this.prisma.examSnapshot.findFirst({
      where: { examId: startExamDto.examId },
      orderBy: { publishedAt: 'desc' },
    });

    const startedSubmission = await this.prisma.examSubmission.create({
      data: {
        examId: startExamDto.examId,
        studentId,
        attemptNo: nextAttemptNo,
        status: 'IN_PROGRESS',
        startedAt: now,
        examSnapshotId: latestSnapshot?.id ?? null,
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
    }).catch((err: any) => {
      // Handle unique constraint violation (race condition: another request created submission for same attemptNo)
      // In this case, return the existing submission as idempotent response
      if (err.code === 'P2002' && err.meta?.target?.includes('unq_exam_student_attempt')) {
        return this.prisma.examSubmission.findFirst({
          where: {
            examId: startExamDto.examId,
            studentId,
            attemptNo: nextAttemptNo,
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
      throw err;
    });

    if (!startedSubmission) {
      throw new ConflictException('Failed to create exam submission');
    }

    // Create an initial proctoring session and record the client's IP (if provided)
    try {
      await this.prisma.proctoringSession.create({
        data: {
          submissionId: startedSubmission.id,
          ipAddress: typeof (context as any)?.remoteIp !== 'undefined' || typeof (context as any)?.forwardedFor !== 'undefined'
            ? this.accessPolicy.resolveClientIpFromParts(context?.remoteIp ?? null, context?.forwardedFor ?? null)
            : null,
        },
      });
    } catch (e) {
      // Non-fatal: proctoring session failure should not block exam start
      // Log warning if needed in future
    }

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

  async submitExam(
    submissionId: string,
    submitExamDto: SubmitExamDto,
    studentId: string,
    options?: { idempotencyKey?: string },
  ): Promise<any> {
    const idempotencyKey = options?.idempotencyKey?.trim() || null;
    const now = new Date();

    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        examId: true,
        studentId: true,
        status: true,
        attemptNo: true,
        version: true,
        submittedAt: true,
        gradedAt: true,
        score: true,
        submitIdempotencyKey: true,
        submitLockedAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
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
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('Not authorized');
    }

    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      if (idempotencyKey && submission.submitIdempotencyKey === idempotencyKey) {
        return this.buildSubmitResponse(submission, true);
      }
      throw new BadRequestException('Exam already submitted');
    }

    if (submission.status === 'SUBMITTING') {
      throw new ConflictException('Submission is being finalized');
    }

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

    const answers = (submitExamDto.answers || []).slice(0, 1000);
    const autoGradedTypes = new Set(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE']);

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.examSubmission.updateMany({
        where: {
          id: submissionId,
          studentId,
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'SUBMITTING',
          submitLockedAt: now,
          submitIdempotencyKey: idempotencyKey ?? undefined,
          lastActivityAt: now,
          version: { increment: 1 },
        },
      });

      if (locked.count === 0) {
        const current = await tx.examSubmission.findUnique({
          where: { id: submissionId },
          select: {
            id: true,
            status: true,
            attemptNo: true,
            submittedAt: true,
            gradedAt: true,
            score: true,
            version: true,
            submitIdempotencyKey: true,
            studentId: true,
          },
        });

        if (!current) {
          throw new NotFoundException('Submission not found');
        }

        if (current.studentId !== studentId) {
          throw new ForbiddenException('Not authorized');
        }

        if ((current.status === 'SUBMITTED' || current.status === 'GRADED') && idempotencyKey && current.submitIdempotencyKey === idempotencyKey) {
          return this.buildSubmitResponse({
            ...submission,
            status: current.status,
            submittedAt: current.submittedAt,
            gradedAt: current.gradedAt,
            score: current.score,
            version: current.version,
            submitIdempotencyKey: current.submitIdempotencyKey,
          }, true);
        }

        if (current.status === 'SUBMITTING') {
          throw new ConflictException('Submission is being finalized');
        }

        throw new BadRequestException('Exam already submitted');
      }

      const lockedSubmission = await tx.examSubmission.findUnique({
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
          answers: {
            select: {
              questionId: true,
              sequence: true,
              clientBatchId: true,
              serverVersion: true,
            },
          },
        },
      });

      if (!lockedSubmission) {
        throw new NotFoundException('Submission not found');
      }

      const examQuestions = lockedSubmission.exam.examQuestions as Array<{
        questionId: string;
        points: number | null;
        question: {
          type: string;
          correctAnswer: any;
          points: number | null;
        };
      }>;

      const validQuestions = new Map<string, (typeof examQuestions)[number]>(
        examQuestions.map((eq) => [eq.questionId, eq]),
      );
      const answerMetaByQuestionId = new Map<string, AutosaveAnswerMeta>(
        (lockedSubmission.answers || []).map((answer) => [answer.questionId, answer as AutosaveAnswerMeta]),
      );

      const normalizedAnswers = answers.filter((answer) => validQuestions.has(answer.questionId));
      const finalAnswerRows = normalizedAnswers.map((answerDto) => {
        const examQuestion = validQuestions.get(answerDto.questionId)!;
        const answerMeta = answerMetaByQuestionId.get(answerDto.questionId);
        let pointsAwarded = 0;
        let isCorrect = false;

        if (autoGradedTypes.has(examQuestion.question.type)) {
          const correctAnswer = examQuestion.question.correctAnswer;
          if (correctAnswer && this.compareAnswers(answerDto.answer, correctAnswer)) {
            pointsAwarded = examQuestion.points || examQuestion.question.points || 1;
            isCorrect = true;
          }
        }

        return {
          submissionId,
          questionId: answerDto.questionId,
          questionVersionId: null,
          sequence: Number(answerMeta?.sequence || 1),
          clientBatchId: answerMeta?.clientBatchId || null,
          serverVersion: Number(answerMeta?.serverVersion || 0),
          answer: answerDto.answer,
          timeTaken: answerDto.timeTaken,
          isCorrect,
          pointsAwarded,
        };
      });

      const totalScore = finalAnswerRows.reduce((sum, row) => sum + Number(row.pointsAwarded || 0), 0);
      const hasManualGrading = lockedSubmission.exam.examQuestions.some(
        (eq) => !autoGradedTypes.has(eq.question.type),
      );

      await tx.submissionAnswer.deleteMany({
        where: { submissionId },
      });

      if (finalAnswerRows.length > 0) {
        await tx.submissionAnswer.createMany({
          data: finalAnswerRows,
        });
      }

      if (logs.length > 0) {
        const tabSwitchCount = logs.filter((x) => String(x.type).toLowerCase() === 'tab_switch').length;
        const mouseAnomalies = logs.filter((x) => String(x.type).toLowerCase() === 'mouse_anomaly').length;

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

        const integrityRows = logs.map((log) => ({
          proctoringId: proctoringSession.id,
          eventType: String(log.type).slice(0, 100),
          details: log.details ? String(log.details).slice(0, 2000) : undefined,
          timestamp: log.ts ? new Date(log.ts) : now,
        }));

        if (integrityRows.length > 0) {
          await tx.integrityLog.createMany({ data: integrityRows });
        }
      }

      const updatedSubmission = await tx.examSubmission.update({
        where: { id: submissionId },
        data: {
          status: hasManualGrading ? 'SUBMITTED' : 'GRADED',
          submittedAt: now,
          gradedAt: hasManualGrading ? null : now,
          score: totalScore,
          finalSnapshotVersion: lockedSubmission.version,
          lastActivityAt: now,
          version: { increment: 1 },
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
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

      return {
        submission: updatedSubmission,
        totalScore,
        hasManualGrading,
      };
    });

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

    this.sendIntegrityNotifications(submissionId, studentId).catch((err) => {
      console.error('Failed to send notifications:', err);
    });

    return this.buildSubmitResponse(result.submission, false);
  }

  async autosaveAnswers(
    submissionId: string,
    payload: AutosaveExamDto,
    studentId: string,
  ): Promise<{ success: boolean; count: number; skipped: number; serverVersion: number }> {
    const answers = Array.isArray(payload?.answers) ? payload.answers : [];
    const clientBatchId = String(payload?.clientBatchId || '').trim() || null;

    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        studentId: true,
        status: true,
        version: true,
        examSnapshotId: true,
        exam: {
          select: {
            id: true,
            examQuestions: {
              select: {
                questionId: true,
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
      throw new BadRequestException('Exam already submitted, cannot autosave');
    }

    const validQuestionIds = new Set(submission.exam.examQuestions.map((eq) => eq.questionId));
    const normalizedAnswers = new Map<string, { questionId: string; sequence: number; answer: any; timeTaken?: number }>();

    for (const answer of answers.slice(0, 500)) {
      if (!answer || !validQuestionIds.has(answer.questionId)) continue;

      const sequence = Number(answer.sequence || 0);
      if (!Number.isInteger(sequence) || sequence < 1) continue;

      const current = normalizedAnswers.get(answer.questionId);
      if (!current || sequence > current.sequence) {
        normalizedAnswers.set(answer.questionId, {
          questionId: answer.questionId,
          sequence,
          answer: answer.answer,
          timeTaken: answer.timeTaken,
        });
      }
    }

    if (normalizedAnswers.size === 0) {
      return { success: true, count: 0, skipped: answers.length, serverVersion: submission.version || 0 };
    }

    // Backpressure: if queue backlog is high, decline low-priority autosave to protect DB
    try {
      const overloaded = await this.queueService.isQueueOverloaded('integrity-logs', Number(process.env.QUEUE_WAITING_THRESHOLD_AUTOSAVE || '1000'));
      if (overloaded) {
        // signal client to retry later; do not perform DB writes for autosave under severe load
        return { success: false, count: 0, skipped: answers.length, serverVersion: submission.version || 0 };
      }
    } catch (err) {
      // ignore and continue
    }

    const incomingQuestionIds = Array.from(normalizedAnswers.keys());

    if (incomingQuestionIds.length === 0) {
      return { success: true, count: 0, skipped: answers.length, serverVersion: submission.version || 0 };
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.examSubmission.updateMany({
        where: {
          id: submissionId,
          studentId,
          status: 'IN_PROGRESS',
        },
        data: {
          lastActivityAt: now,
        },
      });

      if (locked.count === 0) {
        throw new BadRequestException('Exam already submitted, cannot autosave');
      }

      const currentSubmission = await tx.examSubmission.findUnique({
        where: { id: submissionId },
        select: { version: true, status: true },
      });

      if (!currentSubmission || currentSubmission.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Exam already submitted, cannot autosave');
      }

      const existingAnswers = await tx.submissionAnswer.findMany({
        where: {
          submissionId,
          questionId: { in: incomingQuestionIds },
        },
        select: {
          id: true,
          questionId: true,
          sequence: true,
        },
      });

      // map questionId -> questionSnapshotId if submission references an examSnapshot
      const questionSnapshotByQuestionId = new Map<string, string | null>();
      if (submission.examSnapshotId) {
        const eqSnapshots = await tx.examQuestionSnapshot.findMany({
          where: { examSnapshotId: submission.examSnapshotId, questionId: { in: incomingQuestionIds } },
          select: { questionId: true, questionSnapshotId: true },
        });
        for (const r of eqSnapshots) questionSnapshotByQuestionId.set(r.questionId, r.questionSnapshotId || null);
      }

      const existingByQuestionId = new Map<string, ExistingAutosaveAnswer>(
        existingAnswers.map((row) => [row.questionId, row]),
      );
      const changedAnswers = Array.from(normalizedAnswers.values()).filter((answer) => {
        const existing = existingByQuestionId.get(answer.questionId);
        return !existing || answer.sequence > existing.sequence;
      });

      if (changedAnswers.length === 0) {
        return {
          success: true,
          count: 0,
          skipped: normalizedAnswers.size,
          serverVersion: Number(currentSubmission.version || 0),
        };
      }

      const serverVersion = Number(currentSubmission.version || 0) + 1;
      let savedCount = 0;

      for (const answer of changedAnswers) {
        const existing = existingByQuestionId.get(answer.questionId);
        const data = {
          answer: answer.answer,
          timeTaken: answer.timeTaken,
          sequence: answer.sequence,
          clientBatchId,
          serverVersion,
        };

        if (existing) {
          await tx.submissionAnswer.update({
            where: { id: existing.id },
            data,
          });
        } else {
          const qSnapshotId = questionSnapshotByQuestionId.get(answer.questionId) || null;
          await tx.submissionAnswer.create({
            data: {
              submissionId,
              questionId: answer.questionId,
              questionSnapshotId: qSnapshotId,
              answer: answer.answer,
              timeTaken: answer.timeTaken,
              sequence: answer.sequence,
              clientBatchId,
              serverVersion,
            },
          });
        }

        savedCount += 1;
      }

      await tx.examSubmission.update({
        where: { id: submissionId },
        data: {
          version: { increment: 1 },
          lastAutosaveAt: now,
          lastActivityAt: now,
        },
      });

      return {
        success: true,
        count: savedCount,
        skipped: normalizedAnswers.size - savedCount,
        serverVersion,
      };
    });

    return result;
  }

  async addLogs(
    submissionId: string,
    logs: Array<{ type: string; details?: any; ts?: number }>, 
    studentId: string
  ): Promise<void> {
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

    // Publish realtime logs
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

    // Send notifications asynchronously (do not block response)
    this.sendIntegrityNotifications(submissionId, studentId).catch((err) => {
      console.error('Failed to send notifications:', err);
      // Do not throw, notifications are non-critical
    });

    return result;
  }

  private async sendIntegrityNotifications(submissionId: string, studentId: string): Promise<void> {
    try {
      await this.notificationsService.create({
        recipientId: studentId,
        kind: 'SUBMISSION_RECEIVED',
        title: 'Submission received',
        message: `Your submission for exam has been received.`,
        link: '/student/results',
        priority: 'normal',
        metadata: {
          submissionId,
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
    } catch (err) {
      // Notification failures must not block submission flow
      console.error('Notification error:', err);
    }
  }

  private compareAnswers(submitted: any, correct: any): boolean {
    if (typeof submitted === 'object' && typeof correct === 'object') {
      return JSON.stringify(submitted) === JSON.stringify(correct);
    }
    return submitted === correct;
  }

  private buildSubmitResponse(
    submission: {
      id: string;
      status: string;
      attemptNo: number;
      submittedAt: Date | null;
      gradedAt?: Date | null;
      score?: number | null;
      version?: number | null;
      submitIdempotencyKey?: string | null;
    },
    duplicate = false,
  ) {
    return {
      submissionId: submission.id,
      status: submission.status,
      attemptNo: submission.attemptNo,
      submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
      gradedAt: submission.gradedAt ? submission.gradedAt.toISOString() : null,
      score: submission.score ?? null,
      serverVersion: submission.version ?? null,
      duplicate,
      idempotencyKey: submission.submitIdempotencyKey ?? null,
    };
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

  async finalizeSubmission(submissionId: string): Promise<void> {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: { exam: true },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.examSubmission.update({
      where: { id: submissionId },
      data: { status: 'FINALIZED' },
    });

    this.notificationsService.notify({
      recipientId: submission.studentId,
      kind: 'submission-finalized',
      title: 'Submission Finalized',
      message: `Your submission for ${submission.exam.title} has been received.`,
      metadata: {
        examId: submission.exam.id,
        status: 'FINALIZED',
        score: submission.score,
      },
    });
  }

  async finalizeGrading(submissionId: string): Promise<void> {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.examSubmission.update({
      where: { id: submissionId },
      data: { status: 'FINALIZED' },
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
          ipAddress: true,
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
          orderBy: [
            { questionId: 'asc' },
            { sequence: 'desc' },
            { updatedAt: 'desc' },
          ],
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
          select: {
            ipAddress: true,
            tabSwitchCount: true,
            mouseAnomalies: true,
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
