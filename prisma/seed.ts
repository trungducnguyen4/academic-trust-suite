import { PrismaClient, QuestionLifecycleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = '123123123Az!';
const COURSE_CODE = 'CLS001';
const COURSE_NAME = 'Academic Trust Demo Course';
const COURSE_ACADEMIC_YEAR = '2025-2026';
const COURSE_TERM = 'TERM_2';
const STUDENT_COUNT = 36;
const DEMO_PREFIX = '[DEMO-CLS001]';

type ChoiceQuestion = {
  code: string;
  topic: { code: string; name: string };
  type: string;
  content: string;
  options: Record<string, string> | null;
  correctAnswer: Record<string, any> | null;
  explanation: string;
  difficulty: number;
  points: number;
  learningObjective: string;
};

const questions: ChoiceQuestion[] = [
  {
    code: 'SQL-01',
    topic: { code: 'SQL-BASICS', name: 'SQL Basics' },
    type: 'MULTIPLE_CHOICE',
    content: `${DEMO_PREFIX} Which SQL clause filters rows before grouping?`,
    options: { A: 'WHERE', B: 'HAVING', C: 'ORDER BY', D: 'LIMIT' },
    correctAnswer: { answer: 'A' },
    explanation: 'WHERE filters rows before aggregation.',
    difficulty: 2,
    points: 2,
    learningObjective: 'Understand filtering in SQL query execution.',
  },
  {
    code: 'SQL-02',
    topic: { code: 'SQL-JOIN', name: 'SQL Join Logic' },
    type: 'TRUE_FALSE',
    content: `${DEMO_PREFIX} An INNER JOIN returns only matching rows from both tables.`,
    options: { A: 'True', B: 'False' },
    correctAnswer: { answer: 'A' },
    explanation: 'INNER JOIN keeps only matched rows.',
    difficulty: 2,
    points: 1,
    learningObjective: 'Recall the semantics of INNER JOIN.',
  },
  {
    code: 'SQL-03',
    topic: { code: 'SQL-NORMALIZE', name: 'Normalization' },
    type: 'SHORT_ANSWER',
    content: `${DEMO_PREFIX} Define third normal form in one sentence.`,
    options: null,
    correctAnswer: { answer: 'A table is in 3NF when it is in 2NF and has no transitive dependency on a non-key attribute.' },
    explanation: '3NF removes transitive dependencies.',
    difficulty: 4,
    points: 3,
    learningObjective: 'Explain normalization principles concisely.',
  },
  {
    code: 'SQL-04',
    topic: { code: 'SQL-INDEX', name: 'Indexing' },
    type: 'ESSAY',
    content: `${DEMO_PREFIX} Explain when a B-tree index improves performance and when it may not.`,
    options: null,
    correctAnswer: { answer: 'Discuss selectivity, range queries, and write overhead.' },
    explanation: 'Essay answers are evaluated against rubric points.',
    difficulty: 5,
    points: 5,
    learningObjective: 'Analyze index trade-offs in production systems.',
  },
  {
    code: 'SQL-05',
    topic: { code: 'SQL-AGG', name: 'Aggregation' },
    type: 'FILL_IN_BLANK',
    content: `${DEMO_PREFIX} The SQL keyword used to group aggregated rows is ________.`,
    options: { A: 'GROUP BY', B: 'ORDER BY', C: 'HAVING', D: 'SELECT' },
    correctAnswer: { answer: 'GROUP BY' },
    explanation: 'GROUP BY groups rows before aggregation.',
    difficulty: 2,
    points: 2,
    learningObjective: 'Recall grouping syntax for aggregate queries.',
  },
  {
    code: 'SQL-06',
    topic: { code: 'SQL-ERROR', name: 'Error Correction' },
    type: 'MULTIPLE_CHOICE',
    content: `${DEMO_PREFIX} Which clause is incorrect for filtering aggregate results?`,
    options: { A: 'WHERE count(*) > 1', B: 'HAVING count(*) > 1', C: 'WHERE age > 18', D: 'ORDER BY name' },
    correctAnswer: { answer: 'A' },
    explanation: 'Aggregate filters belong in HAVING, not WHERE.',
    difficulty: 3,
    points: 2,
    learningObjective: 'Identify invalid SQL aggregation patterns.',
  },
  {
    code: 'SQL-07',
    topic: { code: 'SQL-ORDER', name: 'Ordering' },
    type: 'ORDERING',
    content: `${DEMO_PREFIX} Order the steps of a SELECT query logically.`,
    options: { A: 'FROM', B: 'WHERE', C: 'SELECT', D: 'ORDER BY' },
    correctAnswer: { answer: ['FROM', 'WHERE', 'SELECT', 'ORDER BY'] },
    explanation: 'Logical processing begins with FROM, then WHERE, then SELECT, then ORDER BY.',
    difficulty: 4,
    points: 3,
    learningObjective: 'Describe SQL logical processing order.',
  },
  {
    code: 'SQL-08',
    topic: { code: 'SQL-MATCH', name: 'Matching' },
    type: 'MATCHING',
    content: `${DEMO_PREFIX} Match SQL operators with their purpose.`,
    options: { A: 'LIKE', B: 'IN', C: 'BETWEEN', D: 'DISTINCT' },
    correctAnswer: { answer: { A: 'Pattern matching', B: 'Set membership', C: 'Range check', D: 'Remove duplicates' } },
    explanation: 'Matching supports concept association.',
    difficulty: 3,
    points: 3,
    learningObjective: 'Associate SQL operators with their semantics.',
  },
  {
    code: 'SQL-09',
    topic: { code: 'SQL-MULTI', name: 'Multi-response' },
    type: 'MULTI_SELECT',
    content: `${DEMO_PREFIX} Select all reasons to use indexes.`,
    options: { A: 'Faster lookups', B: 'Lower storage costs', C: 'Support range queries', D: 'Guarantee consistency' },
    correctAnswer: { answer: ['A', 'C'] },
    explanation: 'Indexes improve access paths but add storage and maintenance cost.',
    difficulty: 4,
    points: 4,
    learningObjective: 'Analyze multiple index use cases.',
  },
  {
    code: 'SQL-10',
    topic: { code: 'SQL-TRICK', name: 'Query Semantics' },
    type: 'MULTIPLE_CHOICE',
    content: `${DEMO_PREFIX} Which query returns the largest value in a column?`,
    options: { A: 'SUM', B: 'MAX', C: 'AVG', D: 'COUNT' },
    correctAnswer: { answer: 'B' },
    explanation: 'MAX returns the largest value.',
    difficulty: 1,
    points: 1,
    learningObjective: 'Recall aggregate functions.',
  },
  {
    code: 'SQL-11',
    topic: { code: 'SQL-TRANSACTION', name: 'Transactions' },
    type: 'MULTIPLE_CHOICE',
    content: `${DEMO_PREFIX} Which property ensures an all-or-nothing transaction?`,
    options: { A: 'Atomicity', B: 'Isolation', C: 'Durability', D: 'Consistency' },
    correctAnswer: { answer: 'A' },
    explanation: 'Atomicity means all operations succeed or fail together.',
    difficulty: 3,
    points: 2,
    learningObjective: 'Explain ACID properties.',
  },
  {
    code: 'SQL-12',
    topic: { code: 'SQL-PERF', name: 'Performance Tuning' },
    type: 'TRUE_FALSE',
    content: `${DEMO_PREFIX} A covering index can reduce table reads for some queries.`,
    options: { A: 'True', B: 'False' },
    correctAnswer: { answer: 'A' },
    explanation: 'Covering indexes can satisfy queries without table lookups.',
    difficulty: 4,
    points: 2,
    learningObjective: 'Assess query optimization strategies.',
  },
];

const students = Array.from({ length: STUDENT_COUNT }, (_, index) => {
  const id = `522h${String(index + 1).padStart(4, '0')}`;
  return {
    email: `${id}@tdhuhu.edu.vn`,
    studentId: id,
    fullName: `Student ${id}`,
    department: index % 3 === 0 ? 'Computer Science' : index % 3 === 1 ? 'Information Technology' : 'Mathematics',
  };
});

const exam1StudentCount = 18;

function shuffle<T>(values: T[]) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor((i * 17 + 11) % (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function ensureQuestion(courseId: string, lecturerId: string, q: ChoiceQuestion) {
  const existing = await prisma.question.findFirst({
    where: {
      courseId,
      content: q.content,
    },
  });

  const question =
    existing ||
    (await prisma.question.create({
      data: {
        type: q.type,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points,
        defaultPoints: q.points,
        courseId,
        creatorId: lecturerId,
        status: QuestionLifecycleStatus.PUBLISHED,
        latestVersionNo: 1,
        isReusable: true,
      },
    }));

  const version = await prisma.questionVersion.upsert({
    where: {
      questionId_versionNo: {
        questionId: question.id,
        versionNo: 1,
      },
    },
    update: {
      stem: q.content,
      payload: q.options,
      answerKey: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      metadata: {
        topic: q.topic.name,
        topicCode: q.topic.code,
        learningObjective: q.learningObjective,
        demoSeed: true,
      },
      aiGenerated: false,
      createdBy: lecturerId,
    },
    create: {
      questionId: question.id,
      versionNo: 1,
      stem: q.content,
      payload: q.options,
      answerKey: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      metadata: {
        topic: q.topic.name,
        topicCode: q.topic.code,
        learningObjective: q.learningObjective,
        demoSeed: true,
      },
      aiGenerated: false,
      createdBy: lecturerId,
    },
  });

  await prisma.question.update({
    where: { id: question.id },
    data: {
      type: q.type,
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      defaultPoints: q.points,
      status: QuestionLifecycleStatus.PUBLISHED,
      latestVersionNo: 1,
      isReusable: true,
    },
  });

  return { question, version };
}

async function ensureTopic(courseId: string, topic: { code: string; name: string }) {
  const row = await prisma.topic.upsert({
    where: {
      courseId_code: {
        courseId,
        code: topic.code,
      },
    },
    update: { name: topic.name },
    create: {
      courseId,
      code: topic.code,
      name: topic.name,
    },
  });

  await prisma.courseTopic.upsert({
    where: {
      courseId_topicId: {
        courseId,
        topicId: row.id,
      },
    },
    update: {},
    create: {
      courseId,
      topicId: row.id,
    },
  });

  return row;
}

async function ensureExam(courseId: string, creatorId: string, title: string, options: Record<string, any>) {
  const existing = await prisma.exam.findFirst({
    where: { courseId, title },
  });

  return existing
    ? prisma.exam.update({
        where: { id: existing.id },
        data: {
          ...options,
          creatorId,
        },
      })
    : prisma.exam.create({
        data: {
          courseId,
          title,
          creatorId,
          duration: options.duration,
          timeLimitMinutes: options.timeLimitMinutes,
          totalPoints: options.totalPoints,
          passingScore: options.passingScore,
          status: options.status,
          startTime: options.startTime,
          endTime: options.endTime,
          mode: options.mode,
          settings: options.settings,
          maxAttempts: options.maxAttempts,
          gradingStrategy: options.gradingStrategy,
          reviewSettings: options.reviewSettings,
          questionSelectionConfig: options.questionSelectionConfig,
          scoringScale: 10,
          scoringRounding: 2,
          allowLateSubmission: false,
        },
      });
}

async function ensureExamQuestion(examId: string, questionId: string, questionVersionId: string, orderIndex: number, points: number) {
  const existing = await prisma.examQuestion.findFirst({
    where: { examId, questionId },
  });

  if (existing) {
    return prisma.examQuestion.update({
      where: { id: existing.id },
      data: {
        questionVersionId,
        orderIndex,
        points,
        assignedScore: points,
      },
    });
  }

  return prisma.examQuestion.create({
    data: {
      examId,
      questionId,
      questionVersionId,
      orderIndex,
      points,
      assignedScore: points,
    },
  });
}

async function ensureExamSnapshot(exam: any, examQuestions: Array<{ questionId: string; questionVersionId: string; orderIndex: number; points: number }>) {
  const existing = await prisma.examSnapshot.findFirst({
    where: { examId: exam.id },
    orderBy: { publishedAt: 'desc' },
    include: { questions: true },
  });

  if (existing && existing.questions.length > 0) {
    return existing;
  }

  const snapshot = await prisma.examSnapshot.create({
    data: {
      examId: exam.id,
      title: exam.title,
      payload: {
        questionCount: examQuestions.length,
        maxAttempts: exam.maxAttempts ?? null,
        gradingStrategy: exam.gradingStrategy ?? null,
        reviewSettings: exam.reviewSettings ?? null,
        questionSelectionConfig: exam.questionSelectionConfig ?? null,
      },
      createdBy: exam.creatorId,
      publishedAt: new Date(),
    },
  });

  for (const [index, q] of examQuestions.entries()) {
    await prisma.questionSnapshot.create({
      data: {
        originalQuestionId: q.questionId,
        questionVersionId: q.questionVersionId,
        payload: {
          questionId: q.questionId,
          questionVersionId: q.questionVersionId,
          demoSeed: true,
        },
      },
    }).then(async (questionSnapshot) => {
      await prisma.examQuestionSnapshot.create({
        data: {
          examSnapshotId: snapshot.id,
          questionId: q.questionId,
          questionVersionId: q.questionVersionId,
          questionSnapshotId: questionSnapshot.id,
          orderIndex: index + 1,
          points: q.points,
          assignedScore: q.points,
          payload: {
            questionId: q.questionId,
            questionVersionId: q.questionVersionId,
            demoSeed: true,
          },
        },
      });
    });
  }

  return snapshot;
}

async function ensureExamInstance(params: {
  examId: string;
  studentId: string;
  status: string;
  startedAt?: Date | null;
  submittedAt?: Date | null;
  lastActivityAt?: Date | null;
  examSnapshotId?: string | null;
  randomizationSeed?: string | null;
  questionOrder?: any;
  snapshotPayload?: any;
  rawScore?: any;
  maxRawScore?: any;
  normalizedScore?: any;
  anomalyScore?: any;
  suspiciousFlag?: boolean;
}) {
  const existing = await prisma.examInstance.findFirst({
    where: { examId: params.examId, studentId: params.studentId },
  });

  if (existing) {
    return prisma.examInstance.update({
      where: { id: existing.id },
      data: {
        status: params.status,
        startedAt: params.startedAt ?? existing.startedAt ?? undefined,
        submittedAt: params.submittedAt ?? existing.submittedAt ?? undefined,
        lastActivityAt: params.lastActivityAt ?? existing.lastActivityAt ?? undefined,
        examSnapshotId: params.examSnapshotId ?? existing.examSnapshotId ?? undefined,
        randomizationSeed: params.randomizationSeed ?? existing.randomizationSeed ?? undefined,
        questionOrder: params.questionOrder ?? existing.questionOrder ?? undefined,
        snapshotPayload: params.snapshotPayload ?? existing.snapshotPayload ?? undefined,
        rawScore: params.rawScore ?? existing.rawScore ?? undefined,
        maxRawScore: params.maxRawScore ?? existing.maxRawScore ?? undefined,
        normalizedScore: params.normalizedScore ?? existing.normalizedScore ?? undefined,
        anomalyScore: params.anomalyScore ?? existing.anomalyScore ?? undefined,
        suspiciousFlag: params.suspiciousFlag ?? existing.suspiciousFlag,
      },
    });
  }

  return prisma.examInstance.create({
    data: {
      examId: params.examId,
      studentId: params.studentId,
      status: params.status as any,
      startedAt: params.startedAt ?? null,
      submittedAt: params.submittedAt ?? null,
      lastActivityAt: params.lastActivityAt ?? null,
      examSnapshotId: params.examSnapshotId ?? null,
      randomizationSeed: params.randomizationSeed ?? null,
      questionOrder: params.questionOrder ?? null,
      snapshotPayload: params.snapshotPayload ?? null,
      rawScore: params.rawScore ?? null,
      maxRawScore: params.maxRawScore ?? null,
      normalizedScore: params.normalizedScore ?? null,
      anomalyScore: params.anomalyScore ?? null,
      suspiciousFlag: params.suspiciousFlag ?? false,
      ipAddress: null,
      userAgent: null,
    },
  });
}

async function ensureSubmission(params: {
  examId: string;
  studentId: string;
  attemptNo: number;
  status: string;
  score: number;
  examSnapshotId?: string | null;
  examInstanceId?: string | null;
  startedAt?: Date | null;
  submittedAt?: Date | null;
  gradedAt?: Date | null;
  finalSnapshotVersion?: number | null;
  version?: number;
}) {
  const existing = await prisma.examSubmission.findFirst({
    where: {
      examId: params.examId,
      studentId: params.studentId,
      attemptNo: params.attemptNo,
    },
  });

  if (existing) {
    return prisma.examSubmission.update({
      where: { id: existing.id },
      data: {
        status: params.status as any,
        score: params.score,
        examSnapshotId: params.examSnapshotId ?? existing.examSnapshotId ?? undefined,
        examInstanceId: params.examInstanceId ?? existing.examInstanceId ?? undefined,
        startedAt: params.startedAt ?? existing.startedAt ?? undefined,
        submittedAt: params.submittedAt ?? existing.submittedAt ?? undefined,
        gradedAt: params.gradedAt ?? existing.gradedAt ?? undefined,
        finalSnapshotVersion: params.finalSnapshotVersion ?? existing.finalSnapshotVersion ?? undefined,
      },
    });
  }

  return prisma.examSubmission.create({
    data: {
      examId: params.examId,
      studentId: params.studentId,
      attemptNo: params.attemptNo,
      status: params.status as any,
      score: params.score,
      examSnapshotId: params.examSnapshotId ?? null,
      examInstanceId: params.examInstanceId ?? null,
      startedAt: params.startedAt ?? null,
      submittedAt: params.submittedAt ?? null,
      gradedAt: params.gradedAt ?? null,
      finalSnapshotVersion: params.finalSnapshotVersion ?? null,
      version: params.version ?? 0,
    },
  });
}

async function ensureAnswer(params: {
  submissionId: string;
  questionId: string;
  questionVersionId: string;
  answer: any;
  isCorrect: boolean;
  pointsAwarded: number;
  timeTaken: number;
  sequence: number;
}) {
  const existing = await prisma.submissionAnswer.findFirst({
    where: {
      submissionId: params.submissionId,
      questionId: params.questionId,
    },
  });

  if (existing) {
    return prisma.submissionAnswer.update({
      where: { id: existing.id },
      data: {
        questionVersionId: params.questionVersionId,
        answer: params.answer,
        isCorrect: params.isCorrect,
        pointsAwarded: params.pointsAwarded,
        timeTaken: params.timeTaken,
        sequence: params.sequence,
      },
    });
  }

  return prisma.submissionAnswer.create({
    data: {
      submissionId: params.submissionId,
      questionId: params.questionId,
      questionVersionId: params.questionVersionId,
      answer: params.answer,
      isCorrect: params.isCorrect,
      pointsAwarded: params.pointsAwarded,
      timeTaken: params.timeTaken,
      sequence: params.sequence,
      clientBatchId: `seed-${params.submissionId}`,
      serverVersion: 1,
    },
  });
}

async function main() {
  try {
  const hashed = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tdhuhu.edu.vn' },
    update: {
      password: hashed,
      fullName: 'System Admin',
      role: 'ADMIN',
      department: 'Information Technology',
    },
    create: {
      email: 'admin@tdhuhu.edu.vn',
      password: hashed,
      fullName: 'System Admin',
      role: 'ADMIN',
      department: 'Information Technology',
    },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer01@tdhuhu.edu.vn' },
    update: {
      password: hashed,
      fullName: 'Lecturer 01',
      role: 'LECTURER',
      department: 'Computer Science',
    },
    create: {
      email: 'lecturer01@tdhuhu.edu.vn',
      password: hashed,
      fullName: 'Lecturer 01',
      role: 'LECTURER',
      department: 'Computer Science',
    },
  });

  const course = await prisma.course.upsert({
    where: { code: COURSE_CODE },
    update: {
      name: COURSE_NAME,
      academicYear: COURSE_ACADEMIC_YEAR,
      term: COURSE_TERM as any,
      credits: 3,
      status: 'active',
      statusEnum: 'ACTIVE',
      lecturerId: lecturer.id,
    },
    create: {
      code: COURSE_CODE,
      name: COURSE_NAME,
      academicYear: COURSE_ACADEMIC_YEAR,
      term: COURSE_TERM as any,
      credits: 3,
      description: 'Production-safe demo course for academic trust platform.',
      status: 'active',
      statusEnum: 'ACTIVE',
      lecturerId: lecturer.id,
    },
  });

  const studentRows = [];
  for (const student of students) {
    studentRows.push(
      prisma.user.upsert({
        where: { email: student.email },
        update: {
          password: hashed,
          fullName: student.fullName,
          role: 'STUDENT',
          studentId: student.studentId,
          department: student.department,
          status: 'active',
        },
        create: {
          email: student.email,
          password: hashed,
          fullName: student.fullName,
          role: 'STUDENT',
          studentId: student.studentId,
          department: student.department,
          status: 'active',
        },
      }),
    );
  }
  const studentUsers = await Promise.all(studentRows);

  await prisma.enrollment.createMany({
    data: studentUsers.map((student) => ({
      courseId: course.id,
      studentId: student.id,
      status: 'active',
      statusEnum: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  const topicRows = new Map<string, string>();
  for (const question of questions) {
    const topic = await ensureTopic(course.id, question.topic);
    topicRows.set(question.topic.code, topic.id);
  }

  const createdQuestions: Array<{ questionId: string; questionVersionId: string; points: number; topicCode: string; type: string }> = [];
  for (const question of questions) {
    const { question: q, version } = await ensureQuestion(course.id, lecturer.id, question);
    const topicId = topicRows.get(question.topic.code);

    if (topicId) {
      await prisma.questionTopic.createMany({
        data: [
          {
            questionId: q.id,
            topicId,
            weight: 1,
          },
        ],
        skipDuplicates: true,
      });

      await prisma.questionCourseScope.createMany({
        data: [
          {
            questionId: q.id,
            courseId: course.id,
          },
        ],
        skipDuplicates: true,
      });
    }

    createdQuestions.push({
      questionId: q.id,
      questionVersionId: version.id,
      points: question.points,
      topicCode: question.topic.code,
      type: question.type,
    });
  }

  const exam1 = await ensureExam(course.id, lecturer.id, `${COURSE_CODE} - Unlimited Attempts Demo`, {
    duration: 45,
    timeLimitMinutes: 45,
    totalPoints: 20,
    passingScore: 10,
    status: 'PUBLISHED',
    mode: 'NORMAL',
    maxAttempts: null,
    gradingStrategy: 'HIGHEST',
    reviewSettings: {
      allowManualReview: true,
      showCorrectAnswersAfterSubmit: true,
    },
    questionSelectionConfig: {
      shuffleQuestions: true,
      randomizePerStudent: true,
      sourceMethod: 'composite',
      requestedQuestionCount: 8,
    },
    settings: {
      maxAttempts: null,
      shuffleQuestions: true,
      randomizePerStudent: true,
      sourceMethod: 'composite',
    },
  });

  const exam2 = await ensureExam(course.id, lecturer.id, `${COURSE_CODE} - Completed Analytics Demo`, {
    duration: 60,
    timeLimitMinutes: 60,
    totalPoints: 20,
    passingScore: 12,
    status: 'COMPLETED',
    startTime: new Date('2026-05-19T16:00:00+07:00'),
    endTime: new Date('2026-05-19T17:00:00+07:00'),
    mode: 'NORMAL',
    maxAttempts: 1,
    gradingStrategy: 'HIGHEST',
    reviewSettings: {
      allowManualReview: true,
      showCorrectAnswersAfterSubmit: true,
    },
    questionSelectionConfig: {
      shuffleQuestions: false,
      randomizePerStudent: false,
      sourceMethod: 'composite',
      requestedQuestionCount: 8,
    },
    settings: {
      maxAttempts: 1,
      shuffleQuestions: false,
      randomizePerStudent: false,
      sourceMethod: 'composite',
    },
  });

  const exam1Questions = shuffle(createdQuestions).slice(0, 8);
  const exam2Questions = createdQuestions.slice(0, 8);

  for (let i = 0; i < exam1Questions.length; i += 1) {
    const item = exam1Questions[i];
    await ensureExamQuestion(exam1.id, item.questionId, item.questionVersionId, i + 1, item.points);
  }

  for (let i = 0; i < exam2Questions.length; i += 1) {
    const item = exam2Questions[i];
    await ensureExamQuestion(exam2.id, item.questionId, item.questionVersionId, i + 1, item.points);
  }

  const exam1Snapshot = await ensureExamSnapshot(exam1, exam1Questions);
  const exam2Snapshot = await ensureExamSnapshot(exam2, exam2Questions);

  const submittedStudents = studentUsers.slice(0, exam1StudentCount);
  for (let idx = 0; idx < studentUsers.length; idx += 1) {
    const student = studentUsers[idx];
    const hasAttempts = idx < exam1StudentCount;
    const attemptCount = hasAttempts ? 1 + (idx % 3) : 0;
    const startedAt = hasAttempts ? new Date(Date.now() - (40 + idx) * 60000) : null;
    const submittedAt = hasAttempts ? new Date(Date.now() - (20 + idx) * 60000) : null;

    const instance = await ensureExamInstance({
      examId: exam1.id,
      studentId: student.id,
      status: hasAttempts ? 'SUBMITTED' : 'NOT_STARTED',
      startedAt,
      submittedAt,
      lastActivityAt: hasAttempts ? submittedAt : null,
      examSnapshotId: exam1Snapshot.id,
      randomizationSeed: hasAttempts ? `seed-${student.studentId}` : null,
      questionOrder: exam1Questions.map((q) => q.questionId),
      snapshotPayload: {
        demoSeed: true,
        examId: exam1.id,
        questionCount: exam1Questions.length,
      },
    });

    if (!hasAttempts) continue;

    for (let attemptNo = 1; attemptNo <= attemptCount; attemptNo += 1) {
      const scoreBand = attemptNo === attemptCount ? (idx % 4 === 0 ? 18 : idx % 4 === 1 ? 14 : idx % 4 === 2 ? 11 : 8) : 6 + attemptNo;
      const attemptStatus = attemptNo === attemptCount ? (idx % 5 === 0 ? 'GRADED' : 'SUBMITTED') : 'SUBMITTED';
      const submission = await ensureSubmission({
        examId: exam1.id,
        studentId: student.id,
        attemptNo,
        status: attemptStatus,
        score: scoreBand,
        examSnapshotId: exam1Snapshot.id,
        examInstanceId: instance.id,
        startedAt: new Date(Date.now() - (30 + attemptNo * 5 + idx) * 60000),
        submittedAt: new Date(Date.now() - (15 + attemptNo * 5 + idx) * 60000),
        gradedAt: attemptStatus === 'GRADED' ? new Date(Date.now() - (10 + idx) * 60000) : null,
        finalSnapshotVersion: 1,
        version: attemptNo,
      });

      const answerCount = Math.min(exam1Questions.length, 5 + (idx % 4));
      for (let qIndex = 0; qIndex < answerCount; qIndex += 1) {
        const q = exam1Questions[qIndex];
        const isCorrect = qIndex < scoreBand / 4;
        await ensureAnswer({
          submissionId: submission.id,
          questionId: q.questionId,
          questionVersionId: q.questionVersionId,
          answer: q.type === 'MATCHING' ? { A: 'Pattern matching' } : { answer: isCorrect ? 'A' : 'B' },
          isCorrect,
          pointsAwarded: isCorrect ? q.points : 0,
          timeTaken: 20 + qIndex * 5 + idx,
          sequence: qIndex + 1,
        });
      }
    }
  }

  const exam2Scores = [
    ...Array(10).fill(18),
    ...Array(14).fill(14),
    ...Array(8).fill(9),
    ...Array(4).fill(5),
  ];

  for (let idx = 0; idx < studentUsers.length; idx += 1) {
    const student = studentUsers[idx];
    const score = exam2Scores[idx] ?? 12;
    const anomaly = idx < 3;
    const instance = await ensureExamInstance({
      examId: exam2.id,
      studentId: student.id,
      status: 'GRADED',
      startedAt: new Date(Date.now() - (90 + idx) * 60000),
      submittedAt: new Date(Date.now() - (60 + idx) * 60000),
      lastActivityAt: new Date(Date.now() - (55 + idx) * 60000),
      examSnapshotId: exam2Snapshot.id,
      randomizationSeed: `analytics-${student.studentId}`,
      questionOrder: exam2Questions.map((q) => q.questionId),
      snapshotPayload: {
        demoSeed: true,
        examId: exam2.id,
        questionCount: exam2Questions.length,
      },
      rawScore: score,
      maxRawScore: 20,
      normalizedScore: Number(((score / 20) * 10).toFixed(2)),
      anomalyScore: anomaly ? 0.9 : 0.1,
      suspiciousFlag: anomaly,
    });

    const submission = await ensureSubmission({
      examId: exam2.id,
      studentId: student.id,
      attemptNo: 1,
      status: 'GRADED',
      score,
      examSnapshotId: exam2Snapshot.id,
      examInstanceId: instance.id,
      startedAt: new Date(Date.now() - (80 + idx) * 60000),
      submittedAt: new Date(Date.now() - (58 + idx) * 60000),
      gradedAt: new Date(Date.now() - (50 + idx) * 60000),
      finalSnapshotVersion: 1,
      version: 1,
    });

    for (let qIndex = 0; qIndex < exam2Questions.length; qIndex += 1) {
      const q = exam2Questions[qIndex];
      const correct = qIndex < Math.max(0, Math.floor(score / 4));
      await ensureAnswer({
        submissionId: submission.id,
        questionId: q.questionId,
        questionVersionId: q.questionVersionId,
        answer: q.type === 'ORDERING' ? { order: ['FROM', 'WHERE', 'SELECT', 'ORDER BY'] } : { answer: correct ? 'A' : 'C' },
        isCorrect: correct,
        pointsAwarded: correct ? q.points : 0,
        timeTaken: anomaly && qIndex === 0 ? 12 : 45 + qIndex * 7 + idx,
        sequence: qIndex + 1,
      });
    }

    if (anomaly) {
      const proctoring = await prisma.proctoringSession.upsert({
        where: { submissionId: submission.id },
        update: {
          tabSwitchCount: 6 + idx,
          mouseAnomalies: 3 + idx,
          ipAddress: `203.0.113.${10 + idx}`,
          flaggedStatus: 'review',
          integrityScore: 0.82,
        },
        create: {
          submissionId: submission.id,
          tabSwitchCount: 6 + idx,
          mouseAnomalies: 3 + idx,
          ipAddress: `203.0.113.${10 + idx}`,
          flaggedStatus: 'review',
          integrityScore: 0.82,
        },
      });

      const existingLogs = await prisma.integrityLog.count({ where: { proctoringId: proctoring.id } });
      if (existingLogs === 0) {
        await prisma.integrityLog.createMany({
          data: [
            {
              proctoringId: proctoring.id,
              eventType: 'tab_switch',
              details: JSON.stringify({ kind: 'tab_switch', questionId: exam2Questions[0].questionId }),
              timestamp: new Date(Date.now() - (45 + idx) * 60000),
            },
            {
              proctoringId: proctoring.id,
              eventType: 'window_blur',
              details: JSON.stringify({ kind: 'window_blur' }),
              timestamp: new Date(Date.now() - (44 + idx) * 60000),
            },
          ],
        });
      }
    }
  }

  const statsSeed = [
    { q: createdQuestions[0], correct: 28, incorrect: 8, skipped: 0, pValue: 0.78, difficultyIndex: 0.22, discriminationIndex: 0.36 },
    { q: createdQuestions[1], correct: 24, incorrect: 12, skipped: 0, pValue: 0.67, difficultyIndex: 0.33, discriminationIndex: 0.24 },
    { q: createdQuestions[2], correct: 16, incorrect: 12, skipped: 8, pValue: 0.50, difficultyIndex: 0.50, discriminationIndex: 0.00 },
    { q: createdQuestions[3], correct: 11, incorrect: 14, skipped: 11, pValue: 0.44, difficultyIndex: 0.56, discriminationIndex: -0.14 },
  ];

  for (const item of statsSeed) {
    await prisma.questionStatistics.upsert({
      where: { questionVersionId: item.q.questionVersionId },
      update: {
        questionId: item.q.questionId,
        totalAttempts: item.correct + item.incorrect + item.skipped,
        correctAttempts: item.correct,
        incorrectAttempts: item.incorrect,
        skippedAttempts: item.skipped,
        pValue: item.pValue,
        difficultyIndex: item.difficultyIndex,
        discriminationIndex: item.discriminationIndex,
        lastRecomputedAt: new Date(),
      },
      create: {
        questionVersionId: item.q.questionVersionId,
        questionId: item.q.questionId,
        totalAttempts: item.correct + item.incorrect + item.skipped,
        correctAttempts: item.correct,
        incorrectAttempts: item.incorrect,
        skippedAttempts: item.skipped,
        pValue: item.pValue,
        difficultyIndex: item.difficultyIndex,
        discriminationIndex: item.discriminationIndex,
        lastRecomputedAt: new Date(),
      },
    });
  }

  const aiDraft = await prisma.questionDraft.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      creatorId: lecturer.id,
      mode: 'AI_ASSISTED',
      currentStep: 'REVIEW',
      state: {
        intent: { questionType: 'MULTIPLE_CHOICE', mode: 'AI_ASSISTED' },
        content: { content: `${DEMO_PREFIX} AI generated draft question on transaction isolation.` },
        answers: {
          options: { A: 'Atomicity', B: 'Isolation', C: 'Durability', D: 'Consistency' },
          correctAnswer: { answer: 'A' },
          explanation: 'Atomicity keeps transactions all-or-nothing.',
        },
        classification: {
          topic: 'Transactions',
          difficulty: 3,
          points: 2,
          learningObjective: 'Explain ACID properties.',
        },
      },
      validation: {
        valid: true,
        level: 'STRICT',
      },
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      creatorId: lecturer.id,
      mode: 'AI_ASSISTED',
      currentStep: 'REVIEW',
      state: {
        intent: { questionType: 'MULTIPLE_CHOICE', mode: 'AI_ASSISTED' },
        content: { content: `${DEMO_PREFIX} AI generated draft question on transaction isolation.` },
        answers: {
          options: { A: 'Atomicity', B: 'Isolation', C: 'Durability', D: 'Consistency' },
          correctAnswer: { answer: 'A' },
          explanation: 'Atomicity keeps transactions all-or-nothing.',
        },
        classification: {
          topic: 'Transactions',
          difficulty: 3,
          points: 2,
          learningObjective: 'Explain ACID properties.',
        },
      },
      validation: {
        valid: true,
        level: 'STRICT',
      },
    },
  });

  const aiLogQuestionVersion = createdQuestions[0].questionVersionId;
  const existingAiLogs = await prisma.aIGenerationRecord.count({ where: { questionVersionId: aiLogQuestionVersion } });
  if (existingAiLogs === 0) {
    await prisma.aIGenerationRecord.createMany({
      data: [
        {
          id: '00000000-0000-0000-0000-000000000101',
          draftId: aiDraft.id,
          questionVersionId: aiLogQuestionVersion,
          section: 'CONTENT',
          status: 'SUCCEEDED',
          reviewStatus: 'APPROVED',
          reviewedBy: lecturer.id,
          reviewedAt: new Date(),
          reviewNotes: 'Approved for demo bank after light wording cleanup.',
          provider: 'ollama',
          model: 'gemma3:4b',
          prompt: { task: 'single-question', demoSeed: true },
          output: { content: `${DEMO_PREFIX} Approved AI content` },
          safetyFlags: {},
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: '00000000-0000-0000-0000-000000000102',
          draftId: aiDraft.id,
          questionVersionId: createdQuestions[3].questionVersionId,
          section: 'EXPLANATION',
          status: 'REJECTED',
          reviewStatus: 'REJECTED',
          reviewedBy: lecturer.id,
          reviewedAt: new Date(),
          reviewNotes: 'Rejected because the explanation was too generic.',
          provider: 'ollama',
          model: 'gemma3:4b',
          prompt: { task: 'draft-section', demoSeed: true },
          output: { candidates: [] },
          safetyFlags: { flaggedTerms: ['generic'] },
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ],
    });
  }

  const existingRegradeLogs = await prisma.examSubmissionRegradeLog.count();
  if (existingRegradeLogs === 0) {
    const sampleSubmission = await prisma.examSubmission.findFirst({
      where: { examId: exam2.id },
      include: { answers: true },
    });
    if (sampleSubmission?.answers[0]) {
      await prisma.examSubmissionRegradeLog.create({
        data: {
          submissionId: sampleSubmission.id,
          submissionAnswerId: sampleSubmission.answers[0].id,
          reviewerId: lecturer.id,
          previousPoints: sampleSubmission.answers[0].pointsAwarded ?? 0,
          newPoints: (sampleSubmission.answers[0].pointsAwarded ?? 0) + 1,
          previousFeedback: 'Initial rubric pass',
          newFeedback: 'Adjusted after instructor review',
          reason: 'Demo regrade to show audit trail',
        },
      });
    }
  }

  console.log('Seed completed safely.');
  console.log(`Course: ${course.code} with ${studentUsers.length} students`);
  console.log(`Questions: ${createdQuestions.length}`);
  console.log(`Exams: ${exam1.title}, ${exam2.title}`);
  console.log(`AI draft log: ${aiDraft.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

export { main };

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  main()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
