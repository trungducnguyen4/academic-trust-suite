import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
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

const AUTO_GRADED_TYPES = new Set(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE']);

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private submissionsEvents: SubmissionsEventsService,
    private readonly notificationsService: NotificationsService,
    private readonly accessPolicy: AccessPolicyService,
    private readonly queueService: QueueService,
  ) {}

  private async getLatestExamSnapshotId(examId: string): Promise<string | null> {
    try {
      const latestSnapshot = await this.prisma.examSnapshot.findFirst({
        where: { examId },
        orderBy: { publishedAt: 'desc' },
        select: { id: true },
      });
      return latestSnapshot?.id ?? null;
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return null;
      }
      throw error;
    }
  }

  private getRealtimeSeverity(eventType: string): 'low' | 'medium' | 'high' {
    const e = String(eventType || '').toLowerCase();
    if (e.includes('fullscreen') || e.includes('face')) return 'high';
    if (e.includes('tab') || e.includes('paste')) return 'medium';
    return 'low';
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  private seededRandom(seed: string): () => number {
    let counter = 0;

    return () => {
      const hash = createHash('sha256')
        .update(seed)
        .update(':')
        .update(String(counter++))
        .digest();
      return hash.readUInt32BE(0) / 0x100000000;
    };
  }

  private shuffleWithSeed<T>(items: T[], seed: string): T[] {
    const result = [...items];
    const random = this.seededRandom(seed);

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  private parseLogDetails(details: string | null | undefined): any {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
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
        status: 'active',
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

    const allowLateSubmission = Boolean((exam.settings as any)?.allowLateSubmission);
    if (!allowLateSubmission && exam.endTime && exam.endTime < now) {
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

    const latestSnapshot = await this.prisma.examSnapshot.findFirst({
      where: { examId: startExamDto.examId },
      orderBy: { publishedAt: 'desc' },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const examSettings: any = exam.settings || {};
    let snapshotQuestions = Array.isArray(latestSnapshot?.questions)
      ? [...latestSnapshot.questions]
      : [];
    const shouldShuffleQuestions = Boolean(
      examSettings?.shuffleQuestions ||
        examSettings?.questionSelectionConfig?.shuffleQuestions,
    );
    const randomizationSeed = randomUUID();

    if (shouldShuffleQuestions) {
      snapshotQuestions = this.shuffleWithSeed(
        snapshotQuestions,
        `${randomizationSeed}:questions`,
      );
    }

    const snapshotPayload = {
      examId: exam.id,
      examSnapshotId: latestSnapshot?.id ?? null,
      randomizationSeed,
      timeLimitMinutes: exam.timeLimitMinutes ?? exam.duration,
      maxAttempts:
        exam.maxAttempts ?? (examSettings?.maxAttempts !== undefined && examSettings?.maxAttempts !== null
          ? Number(examSettings.maxAttempts)
          : null),
      gradingStrategy: exam.gradingStrategy ?? examSettings?.gradingStrategy ?? 'HIGHEST',
      reviewSettings: exam.reviewSettings ?? examSettings?.reviewSettings ?? null,
      questionSelectionConfig:
        exam.questionSelectionConfig ?? examSettings?.questionSelectionConfig ?? null,
      questions: snapshotQuestions.map((item) => ({
        questionId: item.questionId,
        questionVersionId: item.questionVersionId ?? null,
        questionSnapshotId: item.questionSnapshotId ?? null,
        orderIndex: item.orderIndex,
        assignedScore: item.assignedScore ?? item.points ?? 1,
      })),
    };

    const existingExamInstance = await this.prisma.examInstance.findUnique({
      where: {
        examId_studentId: {
          examId: startExamDto.examId,
          studentId,
        },
      },
    });

    const resolvedClientIp =
      typeof (context as any)?.remoteIp !== 'undefined' || typeof (context as any)?.forwardedFor !== 'undefined'
        ? this.accessPolicy.resolveClientIpFromParts(context?.remoteIp ?? null, context?.forwardedFor ?? null)
        : null;

    const examInstance = existingExamInstance
      ? await this.prisma.examInstance.update({
          where: { id: existingExamInstance.id },
          data: {
            lastActivityAt: now,
            ipAddress: resolvedClientIp ?? undefined,
            userAgent: context?.userAgent ?? undefined,
          },
        })
      : await this.prisma.examInstance.create({
          data: {
            examId: startExamDto.examId,
            studentId,
            examSnapshotId: latestSnapshot?.id ?? null,
            snapshotPayload,
            randomizationSeed,
            questionOrder: snapshotQuestions.map((item) => item.questionSnapshotId ?? item.questionId),
            status: 'IN_PROGRESS',
            startedAt: now,
            lastActivityAt: now,
            ipAddress: resolvedClientIp,
            userAgent: context?.userAgent ?? null,
          },
        });

    // Enforce maximum attempts only when the exam is explicitly limited.
    const configuredMaxAttempts =
      exam.maxAttempts ??
      (examSettings?.maxAttempts !== undefined && examSettings?.maxAttempts !== null
        ? Number(examSettings.maxAttempts)
        : null);
    const maxAttempts =
      configuredMaxAttempts === null || configuredMaxAttempts === undefined
        ? null
        : Math.max(1, Math.floor(Number(configuredMaxAttempts)));

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

    if (maxAttempts !== null && nextAttemptNo > maxAttempts) {
      throw new ConflictException(
        `Attempt limit reached (${lastAttemptNo}/${maxAttempts}).`,
      );
    }

    // Create new submission with idempotency (attemptNo versioning)
    // attach the latest exam snapshot (materialized at publish time) if the table exists
    const latestSnapshotId = await this.getLatestExamSnapshotId(startExamDto.examId);

    const startedSubmission = await this.prisma.examSubmission.create({
      data: {
        examId: startExamDto.examId,
        studentId,
        attemptNo: nextAttemptNo,
        status: 'IN_PROGRESS',
        startedAt: now,
        examSnapshotId: latestSnapshotId,
        examInstanceId: examInstance.id,
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
        examInstanceId: true,
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
            select: {
              id: true,
              title: true,
              examQuestions: {
                select: {
                  questionId: true,
                  questionVersionId: true,
                  points: true,
                  assignedScore: true,
                  question: {
                    select: {
                      type: true,
                      points: true,
                      defaultPoints: true,
                    },
                  },
                  questionVersion: {
                    select: {
                      id: true,
                      stem: true,
                      payload: true,
                      answerKey: true,
                      points: true,
                    },
                  },
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
        questionVersionId?: string | null;
        points: number | null;
        assignedScore?: number | null;
        question: {
          type: string;
          points: number | null;
          defaultPoints?: number | null;
        };
        questionVersion?: {
          id: string;
          stem: string;
          payload: any;
          answerKey: any;
          points: number | null;
        } | null;
      }>;

      const missingVersionQuestionIds = Array.from(
        new Set(examQuestions.filter((eq) => !eq.questionVersionId).map((eq) => eq.questionId)),
      );
      const latestVersionByQuestionId = new Map<string, string>();
      if (missingVersionQuestionIds.length > 0) {
        const fallbackVersions = await tx.questionVersion.findMany({
          where: { questionId: { in: missingVersionQuestionIds } },
          orderBy: [
            { questionId: 'asc' },
            { versionNo: 'desc' },
          ],
          select: {
            id: true,
            questionId: true,
          },
        });

        for (const version of fallbackVersions) {
          if (!latestVersionByQuestionId.has(version.questionId)) {
            latestVersionByQuestionId.set(version.questionId, version.id);
          }
        }
      }

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
        const resolvedQuestionVersionId =
          examQuestion.questionVersionId ||
          latestVersionByQuestionId.get(answerDto.questionId) ||
          null;
        let pointsAwarded = 0;
        let isCorrect = false;

        if (AUTO_GRADED_TYPES.has(examQuestion.question.type)) {
          const correctAnswer = examQuestion.questionVersion?.answerKey ?? null;
          if (correctAnswer && this.compareAnswers(answerDto.answer, correctAnswer)) {
            pointsAwarded = Number(
              examQuestion.assignedScore ??
                examQuestion.points ??
                examQuestion.question.defaultPoints ??
                examQuestion.question.points ??
                1,
            );
            isCorrect = true;
          }
        }

        return {
          submissionId,
          questionId: answerDto.questionId,
          questionVersionId: resolvedQuestionVersionId,
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
      const maxRawScore = examQuestions.reduce(
        (sum, eq) =>
          sum +
          Number(
            eq.assignedScore ??
              eq.points ??
              eq.question.defaultPoints ??
              eq.question.points ??
              1,
          ),
        0,
      );
      const normalizedScore = maxRawScore > 0 ? (totalScore / maxRawScore) * 10 : 0;
      const hasManualGrading = lockedSubmission.exam.examQuestions.some(
        (eq) => !AUTO_GRADED_TYPES.has(eq.question.type),
      );

      await tx.submissionAnswer.deleteMany({
        where: { submissionId },
      });

      if (finalAnswerRows.length > 0) {
        await tx.submissionAnswer.createMany({
          data: finalAnswerRows,
        });
      }

      const answeredByVersionId = new Map<string, { correct: number; incorrect: number; skipped: number }>();
      const finalAnswerByQuestionId = new Map(finalAnswerRows.map((row) => [row.questionId, row]));

      for (const examQuestion of examQuestions) {
        const versionId =
          examQuestion.questionVersionId ||
          latestVersionByQuestionId.get(examQuestion.questionId) ||
          null;
        if (!versionId) continue;

        const answerRow = finalAnswerByQuestionId.get(examQuestion.questionId);
        const bucket = answeredByVersionId.get(versionId) || { correct: 0, incorrect: 0, skipped: 0 };

        if (!answerRow) {
          bucket.skipped += 1;
        } else if (answerRow.isCorrect) {
          bucket.correct += 1;
        } else {
          bucket.incorrect += 1;
        }

        answeredByVersionId.set(versionId, bucket);
      }

      for (const examQuestion of examQuestions) {
        const versionId =
          examQuestion.questionVersionId ||
          latestVersionByQuestionId.get(examQuestion.questionId) ||
          null;
        if (!versionId) continue;

        const bucket = answeredByVersionId.get(versionId) || { correct: 0, incorrect: 0, skipped: 1 };
        const versionTotal = bucket.correct + bucket.incorrect + bucket.skipped;
        const pValue = versionTotal > 0 ? bucket.correct / versionTotal : 0;
        const difficultyIndex = versionTotal > 0 ? 1 - pValue : 0;
        const discriminationIndex =
          versionTotal > 0
            ? Math.max(-1, Math.min(1, (bucket.correct - bucket.incorrect) / versionTotal))
            : null;

        await tx.questionStatistics.upsert({
          where: { questionVersionId: versionId },
          create: {
            questionVersionId: versionId,
            questionId: examQuestion.questionId,
            totalAttempts: versionTotal,
            correctAttempts: bucket.correct,
            incorrectAttempts: bucket.incorrect,
            skippedAttempts: bucket.skipped,
            pValue,
            difficultyIndex,
            discriminationIndex,
            lastRecomputedAt: now,
          },
          update: {
            totalAttempts: { increment: versionTotal },
            correctAttempts: { increment: bucket.correct },
            incorrectAttempts: { increment: bucket.incorrect },
            skippedAttempts: { increment: bucket.skipped },
            pValue,
            difficultyIndex,
            discriminationIndex,
            lastRecomputedAt: now,
          },
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
          score: Math.round(totalScore),
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

      if (submission.examInstanceId) {
        await tx.examInstance.update({
          where: { id: submission.examInstanceId },
          data: {
            status: hasManualGrading ? 'SUBMITTED' : 'GRADED',
            submittedAt: now,
            rawScore: totalScore,
            maxRawScore,
            normalizedScore,
            lastActivityAt: now,
          },
        });
      }

      return {
        submission: updatedSubmission,
        totalScore,
        maxRawScore,
        normalizedScore,
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

    return {
      ...this.buildSubmitResponse(result.submission, false),
      normalizedScore: result.normalizedScore,
      maxRawScore: result.maxRawScore,
    };
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
                    questionVersionId: true,
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
    const versionByQuestionId = new Map(
      submission.exam.examQuestions.map((eq) => [eq.questionId, eq.questionVersionId || null]),
    );
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
              questionVersionId: versionByQuestionId.get(answer.questionId) || null,
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

  async gradeAnswer(gradeDto: GradeAnswerDto, actor: { id: string; role?: string }) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.submissionAnswer.findUnique({
        where: { id: gradeDto.submissionAnswerId },
        select: {
          id: true,
          submissionId: true,
          pointsAwarded: true,
          feedback: true,
          question: {
            select: {
              points: true,
              defaultPoints: true,
            },
          },
          questionVersion: {
            select: {
              points: true,
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Answer not found');
      }

      const maxPoints = Number(
        existing.questionVersion?.points ??
          existing.question.points ??
          existing.question.defaultPoints ??
          1,
      );
      if (gradeDto.pointsAwarded > maxPoints) {
        throw new BadRequestException(`Points awarded cannot exceed ${maxPoints}`);
      }

      const next = await tx.submissionAnswer.update({
        where: { id: gradeDto.submissionAnswerId },
        data: {
          pointsAwarded: gradeDto.pointsAwarded,
          feedback: gradeDto.feedback,
        },
      });

      if (
        existing.pointsAwarded !== gradeDto.pointsAwarded ||
        String(existing.feedback || '') !== String(gradeDto.feedback || '')
      ) {
        await tx.examSubmissionRegradeLog.create({
          data: {
            submissionId: existing.submissionId,
            submissionAnswerId: existing.id,
            reviewerId: actor.id,
            previousPoints: existing.pointsAwarded ?? null,
            newPoints: gradeDto.pointsAwarded,
            previousFeedback: existing.feedback ?? null,
            newFeedback: gradeDto.feedback ?? null,
            reason: gradeDto.reason || 'Manual regrade',
          } as any,
        });
      }

      return next;
    });

    return updated;
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

  async getManualGradingStatus(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const submissions = await this.prisma.examSubmission.findMany({
      where: {
        examId,
        status: { in: ['SUBMITTED', 'GRADED', 'FLAGGED', 'FINALIZED'] },
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            email: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                points: true,
                defaultPoints: true,
                content: true,
              },
            },
            questionVersion: {
              select: {
                id: true,
                stem: true,
                points: true,
              },
            },
          },
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const rows = submissions.map((submission) => {
      const manualAnswers = submission.answers.filter(
        (answer) => !AUTO_GRADED_TYPES.has(String(answer.question?.type || '').toUpperCase()),
      );
      const graded = manualAnswers.filter((answer) => answer.pointsAwarded !== null && answer.pointsAwarded !== undefined);
      return {
        submissionId: submission.id,
        student: submission.student,
        status: submission.status,
        attemptNo: submission.attemptNo,
        submittedAt: submission.submittedAt,
        score: submission.score,
        manualTotal: manualAnswers.length,
        manualGraded: graded.length,
        manualPending: Math.max(0, manualAnswers.length - graded.length),
        completed: manualAnswers.length > 0 && manualAnswers.length === graded.length,
      };
    });

    const manualTotal = rows.reduce((sum, row) => sum + row.manualTotal, 0);
    const manualGraded = rows.reduce((sum, row) => sum + row.manualGraded, 0);
    const published =
      rows.length > 0 &&
      rows
        .filter((row) => row.manualTotal > 0)
        .every((row) => ['GRADED', 'FINALIZED'].includes(String(row.status).toUpperCase()));

    return {
      exam,
      hasManualGrading: manualTotal > 0,
      manualTotal,
      manualGraded,
      manualPending: Math.max(0, manualTotal - manualGraded),
      published,
      canPublish: manualTotal > 0 && manualTotal === manualGraded && !published,
      submissions: rows,
    };
  }

  async getManualGradingSubmission(submissionId: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            email: true,
          },
        },
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
        answers: {
          orderBy: [{ questionId: 'asc' }, { sequence: 'asc' }],
          include: {
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                points: true,
                defaultPoints: true,
              },
            },
            questionVersion: {
              select: {
                id: true,
                stem: true,
                payload: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const manualAnswers = submission.answers
      .filter((answer) => !AUTO_GRADED_TYPES.has(String(answer.question?.type || '').toUpperCase()))
      .map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        questionType: answer.question?.type,
        questionText: answer.questionVersion?.stem || answer.question?.content || 'Question text unavailable',
        answer: answer.answer,
        pointsAwarded: answer.pointsAwarded,
        maxPoints: Number(answer.questionVersion?.points ?? answer.question?.points ?? answer.question?.defaultPoints ?? 1),
        feedback: answer.feedback || '',
        updatedAt: answer.updatedAt,
      }));

    return {
      ...submission,
      manualAnswers,
      manualTotal: manualAnswers.length,
      manualGraded: manualAnswers.filter((answer) => answer.pointsAwarded !== null && answer.pointsAwarded !== undefined).length,
    };
  }

  async publishExamResults(examId: string) {
    const status = await this.getManualGradingStatus(examId);
    if (!status.hasManualGrading) {
      throw new BadRequestException('This exam does not have manually graded answers.');
    }
    if (!status.canPublish) {
      throw new BadRequestException('All manually graded answers must be scored before publishing results.');
    }

    const submissionIds = status.submissions.map((row) => row.submissionId);
    const answers = await this.prisma.submissionAnswer.findMany({
      where: { submissionId: { in: submissionIds } },
      select: {
        submissionId: true,
        pointsAwarded: true,
      },
    });

    const scoreBySubmission = new Map<string, number>();
    for (const answer of answers) {
      scoreBySubmission.set(
        answer.submissionId,
        (scoreBySubmission.get(answer.submissionId) || 0) + Number(answer.pointsAwarded || 0),
      );
    }

    const now = new Date();
    await this.prisma.$transaction(
      submissionIds.map((id) =>
        this.prisma.examSubmission.update({
          where: { id },
          data: {
            status: 'GRADED',
            gradedAt: now,
            score: Math.round(scoreBySubmission.get(id) || 0),
          },
        }),
      ),
    );

    return this.getManualGradingStatus(examId);
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
        maxAttempts: true,
        settings: true,
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
          studentId: true,
          status: true,
          score: true,
          startedAt: true,
          submittedAt: true,
          createdAt: true,
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

    const isUnlimited = this.isUnlimitedAttemptsExam(exam);
    const completed = isUnlimited
      ? this.collapseLatestCompletedSubmissions(
          submissions.filter((s) => ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(s.status)),
        )
      : submissions.filter((s) => ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(s.status));
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
      analyticsScope: isUnlimited ? 'PRACTICE' : 'OFFICIAL',
      isUnlimited,
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

  async getExamIntelligence(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        courseId: true,
        passingScore: true,
        totalPoints: true,
        maxAttempts: true,
        settings: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const [examQuestions, submissions, integrityLogs] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        questionId: string;
        questionVersionId: string | null;
        orderIndex: number;
        questionType: string;
        questionContent: string;
      }>>`
        SELECT eq.questionId, eq.questionVersionId, eq.orderIndex, q.type AS questionType, COALESCE(qv.stem, q.content) AS questionContent
        FROM exam_questions eq
        INNER JOIN questions q ON q.id = eq.questionId
        LEFT JOIN question_versions qv ON qv.id = eq.questionVersionId
        WHERE eq.examId = ${examId}
        ORDER BY eq.orderIndex ASC
      `,
      this.prisma.examSubmission.findMany({
        where: { examId },
        select: {
          id: true,
          studentId: true,
          status: true,
          score: true,
          submittedAt: true,
          createdAt: true,
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
        select: {
          eventType: true,
          details: true,
        },
      }),
    ]);

    const topicByQuestionId = new Map<string, { topicId: string; topicName: string }>();
    try {
      const topicRows = await this.prisma.$queryRaw<Array<{
        questionId: string;
        topicId: string;
        topicName: string;
      }>>`
        SELECT qt.questionId, t.id AS topicId, t.name AS topicName
        FROM question_topics qt
        INNER JOIN topics t ON t.id = qt.topicId
        WHERE qt.questionId IN (
          SELECT eq.questionId FROM exam_questions eq WHERE eq.examId = ${examId}
        )
      `;

      for (const row of topicRows) {
        if (!topicByQuestionId.has(row.questionId)) {
          topicByQuestionId.set(row.questionId, { topicId: row.topicId, topicName: row.topicName });
        }
      }
    } catch {
      // Legacy databases may not have question_topics/topics in expected shape.
    }

    const isUnlimited = this.isUnlimitedAttemptsExam(exam);
    const scopedCompletedSubmissions = isUnlimited
      ? this.collapseLatestCompletedSubmissions(
          submissions.filter((s) =>
            ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(String(s.status).toUpperCase()),
          ),
        )
      : submissions.filter((s) =>
          ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(String(s.status).toUpperCase()),
        );
    const completedSubmissionIds = scopedCompletedSubmissions.map((s) => s.id);

    const answers = completedSubmissionIds.length
      ? await this.prisma.submissionAnswer.findMany({
          where: { submissionId: { in: completedSubmissionIds } },
          select: {
            questionId: true,
            questionVersionId: true,
            isCorrect: true,
            timeTaken: true,
          },
        })
      : [];

    type QuestionStatsRow = {
      questionVersionId: string;
      pValue: { toNumber(): number } | null;
      difficultyIndex: { toNumber(): number } | null;
      discriminationIndex: { toNumber(): number } | null;
      totalAttempts: number;
      correctAttempts: number;
      incorrectAttempts: number;
      skippedAttempts: number;
    };

    const statsRows: QuestionStatsRow[] = await this.prisma.questionStatistics.findMany({
      where: {
        questionVersionId: {
          in: examQuestions.map((eq) => eq.questionVersionId).filter((id): id is string => Boolean(id)),
        },
      },
      select: {
        questionVersionId: true,
        pValue: true,
        difficultyIndex: true,
        discriminationIndex: true,
        totalAttempts: true,
        correctAttempts: true,
        incorrectAttempts: true,
        skippedAttempts: true,
      },
    });
    const statsByVersionId = new Map(statsRows.map((row) => [row.questionVersionId, row]));

    const attemptsPerQuestion = Math.max(1, scopedCompletedSubmissions.length);
    const byQuestion = new Map<string, Array<{ isCorrect: boolean; timeTaken: number | null }>>();
    for (const row of answers) {
      const key = row.questionVersionId || row.questionId;
      const list = byQuestion.get(key) || [];
      list.push({ isCorrect: Boolean(row.isCorrect), timeTaken: row.timeTaken ?? null });
      byQuestion.set(key, list);
    }

    const flaggedByQuestion = new Map<string, number>();
    for (const log of integrityLogs) {
      const eventType = String(log.eventType || '').toLowerCase();
      if (!eventType.includes('flag')) continue;
      const parsed = this.parseLogDetails(log.details);
      const questionId = parsed?.questionId ? String(parsed.questionId) : null;
      if (!questionId) continue;
      flaggedByQuestion.set(questionId, (flaggedByQuestion.get(questionId) || 0) + 1);
    }

    const questionMetrics = examQuestions.map((eq) => {
      const metricKey = eq.questionVersionId || eq.questionId;
      const rows = byQuestion.get(metricKey) || [];
      const answeredCount = rows.length;
      const correctCount = rows.filter((r) => r.isCorrect).length;
      const incorrectCount = Math.max(0, answeredCount - correctCount);
      const skippedCount = Math.max(0, attemptsPerQuestion - answeredCount);
      const avgTimeSeconds = rows.length
        ? Number((rows.reduce((sum, r) => sum + Number(r.timeTaken || 0), 0) / rows.length).toFixed(1))
        : 0;
      const topic = topicByQuestionId.get(eq.questionId);
      const stats = eq.questionVersionId ? statsByVersionId.get(eq.questionVersionId) : null;
      return {
        questionId: eq.questionId,
        questionVersionId: eq.questionVersionId || null,
        orderIndex: eq.orderIndex,
        questionType: eq.questionType,
        topicId: topic?.topicId || null,
        topicName: topic?.topicName || 'Untagged',
        questionText: String(eq.questionContent || '').slice(0, 180),
        incorrectRate: this.clampPercent((incorrectCount / attemptsPerQuestion) * 100),
        skipRate: this.clampPercent((skippedCount / attemptsPerQuestion) * 100),
        avgTimeSeconds,
        flaggedCount: flaggedByQuestion.get(eq.questionId) || 0,
        correctCount,
        incorrectCount,
        skippedCount,
        pValue: stats?.pValue !== undefined && stats?.pValue !== null ? Number(stats.pValue) : null,
        difficultyIndex: stats?.difficultyIndex !== undefined && stats?.difficultyIndex !== null ? Number(stats.difficultyIndex) : null,
        discriminationIndex: stats?.discriminationIndex !== undefined && stats?.discriminationIndex !== null ? Number(stats.discriminationIndex) : null,
        action: {
          path: '/lecturer/question-bank',
          params: {
            courseId: exam.courseId,
            topicId: topic?.topicId || undefined,
            type: eq.questionType,
          },
        },
      };
    });

    const topicRollup = new Map<string, { topicId: string | null; topicName: string; incorrect: number; skipped: number; denominator: number }>();
    const typeRollup = new Map<string, { type: string; incorrect: number; skipped: number; denominator: number; timeTotal: number; count: number }>();

    for (const q of questionMetrics) {
      const topicKey = q.topicId || q.topicName;
      const t = topicRollup.get(topicKey) || {
        topicId: q.topicId,
        topicName: q.topicName,
        incorrect: 0,
        skipped: 0,
        denominator: 0,
      };
      t.incorrect += q.incorrectCount;
      t.skipped += q.skippedCount;
      t.denominator += attemptsPerQuestion;
      topicRollup.set(topicKey, t);

      const type = typeRollup.get(q.questionType) || {
        type: q.questionType,
        incorrect: 0,
        skipped: 0,
        denominator: 0,
        timeTotal: 0,
        count: 0,
      };
      type.incorrect += q.incorrectCount;
      type.skipped += q.skippedCount;
      type.denominator += attemptsPerQuestion;
      type.timeTotal += q.avgTimeSeconds;
      type.count += 1;
      typeRollup.set(q.questionType, type);
    }

    const weakestTopics = Array.from(topicRollup.values())
      .map((t) => ({
        topicId: t.topicId,
        topicName: t.topicName,
        incorrectRate: this.clampPercent((t.incorrect / Math.max(1, t.denominator)) * 100),
        skipRate: this.clampPercent((t.skipped / Math.max(1, t.denominator)) * 100),
        action: {
          path: '/lecturer/question-bank',
          params: { courseId: exam.courseId, topicId: t.topicId || undefined },
        },
      }))
      .sort((a, b) => b.incorrectRate - a.incorrectRate)
      .slice(0, 8);

    const slowestQuestionTypes = Array.from(typeRollup.values())
      .map((t) => ({
        type: t.type,
        avgTimeSeconds: Number((t.timeTotal / Math.max(1, t.count)).toFixed(1)),
        incorrectRate: this.clampPercent((t.incorrect / Math.max(1, t.denominator)) * 100),
        skipRate: this.clampPercent((t.skipped / Math.max(1, t.denominator)) * 100),
        action: {
          path: '/lecturer/question-bank',
          params: { courseId: exam.courseId, type: t.type },
        },
      }))
      .sort((a, b) => b.avgTimeSeconds - a.avgTimeSeconds);

    const mostIncorrectLimit = Math.min(8, Math.max(5, Math.round(questionMetrics.length * 0.2)));
    const mostIncorrectQuestions = [...questionMetrics]
      .sort((a, b) => {
        const incorrectDelta = b.incorrectRate - a.incorrectRate;
        if (incorrectDelta !== 0) return incorrectDelta;
        const skipDelta = b.skipRate - a.skipRate;
        if (skipDelta !== 0) return skipDelta;
        return b.flaggedCount - a.flaggedCount;
      })
      .slice(0, mostIncorrectLimit);
    const mostFlaggedQuestions = [...questionMetrics]
      .filter((q) => q.flaggedCount > 0)
      .sort((a, b) => b.flaggedCount - a.flaggedCount)
      .slice(0, 10);
    const abnormalSkips = [...questionMetrics]
      .filter((q) => q.skipRate >= 40)
      .sort((a, b) => b.skipRate - a.skipRate)
      .slice(0, 10);

    const scoreRows = scopedCompletedSubmissions.map((s) => {
      const raw = Number(s.score || 0);
      const pct = Number(exam.totalPoints || 0) > 0
        ? this.clampPercent((raw / Number(exam.totalPoints || 1)) * 100)
        : this.clampPercent(raw);
      return {
        date: new Date(s.submittedAt || s.createdAt).toISOString().slice(0, 10),
        scorePct: pct,
      };
    });

    const trendMap = new Map<string, { total: number; count: number }>();
    for (const row of scoreRows) {
      const prev = trendMap.get(row.date) || { total: 0, count: 0 };
      prev.total += row.scorePct;
      prev.count += 1;
      trendMap.set(row.date, prev);
    }
    const trendSeries = Array.from(trendMap.entries())
      .map(([date, v]) => ({ date, avgScorePct: Number((v.total / Math.max(1, v.count)).toFixed(1)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const avgScorePct = scoreRows.length
      ? Number((scoreRows.reduce((sum, r) => sum + r.scorePct, 0) / scoreRows.length).toFixed(1))
      : 0;
    const passingScore = Number(exam.passingScore || 50);
    const passRate = this.clampPercent(
      (scoreRows.filter((r) => r.scorePct >= passingScore).length / Math.max(1, scoreRows.length)) * 100,
    );

    const weakestTopic = weakestTopics[0];
    const slowestType = slowestQuestionTypes[0];
    const aiSummary = `Performance is strongest on straightforward items, but weakness concentrates in ${weakestTopic ? `${weakestTopic.topicName} (${weakestTopic.incorrectRate.toFixed(0)}% incorrect)` : 'mixed topics'}. Time pressure is highest on ${slowestType ? `${slowestType.type} (${slowestType.avgTimeSeconds}s avg)` : 'long-form questions'}. Prioritize targeted timed practice before the next full test.`;

    const aiRecommendations = [
      {
        title: 'Target weak-topic remediation',
        detail: weakestTopic
          ? `Build a retry set focused on ${weakestTopic.topicName} with medium difficulty under timed constraints.`
          : 'Build a retry set for the lowest-performing topic cluster.',
        action: weakestTopic?.action || { path: '/lecturer/question-bank', params: { courseId: exam.courseId } },
      },
      {
        title: 'Reduce time-pressure misses',
        detail: slowestType
          ? `Learners slow down on ${slowestType.type}. Add 5-8 question timed mini-sets before full exam sessions.`
          : 'Add short timed mini-sets for high-latency question types.',
        action: slowestType?.action || { path: '/lecturer/question-bank', params: { courseId: exam.courseId } },
      },
    ];

    const creatorQualityAlerts = questionMetrics
      .filter((q) => q.incorrectRate >= 75 || q.skipRate >= 50 || q.flaggedCount >= 3)
      .sort((a, b) => {
        const severityA = (a.incorrectRate * 0.6) + (a.skipRate * 0.25) + (a.flaggedCount * 8);
        const severityB = (b.incorrectRate * 0.6) + (b.skipRate * 0.25) + (b.flaggedCount * 8);
        return severityB - severityA;
      })
      .slice(0, 5)
      .map((q) => ({
        questionId: q.questionId,
        questionLabel: `Q${q.orderIndex + 1}`,
        signal: `${q.incorrectRate.toFixed(0)}% incorrect · ${q.skipRate.toFixed(0)}% skipped · ${q.flaggedCount} flags`,
        suggestion: 'Potential ambiguity detected. Review wording, distractors, and difficulty calibration.',
        action: q.action,
      }));

    return {
      exam,
      analyticsScope: isUnlimited ? 'PRACTICE' : 'OFFICIAL',
      isUnlimited,
      kpis: {
        totalSubmissions: submissions.length,
        analyzedSubmissions: scopedCompletedSubmissions.length,
        completedSubmissions: scopedCompletedSubmissions.length,
        completionRate: this.clampPercent((scopedCompletedSubmissions.length / Math.max(1, submissions.length)) * 100),
        avgScorePct,
        passRate,
      },
      visualizations: {
        correctVsIncorrect: {
          correct: questionMetrics.reduce((sum, q) => sum + q.correctCount, 0),
          incorrect: questionMetrics.reduce((sum, q) => sum + q.incorrectCount, 0),
          skipped: questionMetrics.reduce((sum, q) => sum + q.skippedCount, 0),
        },
        trendSeries,
      },
      mostIncorrectQuestions,
      weakestTopics,
      slowestQuestionTypes,
      mostFlaggedQuestions,
      abnormalSkips,
      aiSummary,
      aiRecommendations,
      creatorQualityAlerts,
      trackingPlan: {
        experimentName: 'analytics-practice-loop-v1',
        primaryMetrics: ['retry_click_rate', 'practice_completion_rate', 'score_uplift_next_attempt'],
        eventKeys: ['analytics_open', 'analytics_action_click', 'practice_start_from_analytics'],
      },
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

  async getMySubmissionById(submissionId: string, studentId: string) {
    return this.prisma.examSubmission.findFirst({
      where: {
        id: submissionId,
        studentId,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            totalPoints: true,
            maxAttempts: true,
            settings: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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
            maxAttempts: true,
            settings: true,
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
      orderBy: [
        { attemptNo: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private resolveConfiguredMaxAttempts(exam: { maxAttempts?: number | null; settings?: any }): number | null {
    const rawSettings = exam?.settings;
    const settingsMaxAttempts =
      rawSettings && typeof rawSettings === 'object' && rawSettings.maxAttempts !== undefined && rawSettings.maxAttempts !== null
        ? Number(rawSettings.maxAttempts)
        : null;
    const resolved =
      exam?.maxAttempts ?? settingsMaxAttempts;
    if (resolved === null || resolved === undefined || Number.isNaN(Number(resolved))) {
      return null;
    }
    return Math.max(1, Math.floor(Number(resolved)));
  }

  private isUnlimitedAttemptsExam(exam: { maxAttempts?: number | null; settings?: any }): boolean {
    return this.resolveConfiguredMaxAttempts(exam) === null;
  }

  private collapseLatestCompletedSubmissions<T extends { id: string; studentId?: string | null; status?: string | null; submittedAt?: Date | string | null; createdAt?: Date | string | null }>(submissions: T[]) {
    const buckets = new Map<string, T>();
    for (const submission of submissions) {
      const studentKey = submission.studentId || submission.id;
      const current = buckets.get(studentKey);
      const currentTime = current ? new Date(current.submittedAt || current.createdAt || 0).getTime() : -1;
      const nextTime = new Date(submission.submittedAt || submission.createdAt || 0).getTime();
      if (!current || nextTime >= currentTime) {
        buckets.set(studentKey, submission);
      }
    }
    return Array.from(buckets.values());
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
