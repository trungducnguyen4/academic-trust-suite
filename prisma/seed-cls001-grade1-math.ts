import { PrismaClient, QuestionLifecycleStatus } from '@prisma/client';

const prisma = new PrismaClient();

type ChoiceQuestion = {
  content: string;
  options: Record<string, string>;
  correct: string;
  explanation?: string;
  difficulty?: number;
  points?: number;
};

type TopicSeed = {
  code: string;
  name: string;
  questions: ChoiceQuestion[];
};

const DEMO_PREFIX = '[DEMO-CLS001]';

const topics: TopicSeed[] = [
  {
    code: 'M1-COUNT-10',
    name: 'Toan lop 1 - Dem so den 10',
    // tags removed
    questions: [
      { content: 'So nao dung sau so 3?', options: { A: '4', B: '2', C: '5', D: '1' }, correct: 'A' },
      { content: 'Dem: 1, 2, 3, ... so tiep theo la?', options: { A: '5', B: '4', C: '2', D: '6' }, correct: 'B' },
      { content: 'So nao lon hon 7?', options: { A: '6', B: '5', C: '8', D: '4' }, correct: 'C' },
      { content: 'So nho hon 2 la?', options: { A: '1', B: '3', C: '4', D: '5' }, correct: 'A' },
      { content: 'Day so dung la?', options: { A: '1,3,2', B: '2,3,4', C: '5,4,3', D: '7,5,6' }, correct: 'B' },
      { content: 'So nao bang 10?', options: { A: '9', B: '8', C: '10', D: '7' }, correct: 'C' },
      { content: 'So dung truoc 6 la?', options: { A: '7', B: '5', C: '4', D: '8' }, correct: 'B' },
      { content: 'So nao la so be nhat?', options: { A: '3', B: '2', C: '1', D: '4' }, correct: 'C' },
      { content: 'Dem nguoc: 5,4,3, ... so tiep theo la?', options: { A: '2', B: '1', C: '6', D: '4' }, correct: 'A' },
      { content: 'Co 6 qua tao, them 0 qua tao, co tat ca?', options: { A: '5', B: '6', C: '7', D: '8' }, correct: 'B' },
      { content: 'So nao khong nam trong 1 den 10?', options: { A: '11', B: '8', C: '2', D: '6' }, correct: 'A' },
      { content: 'So nao dung giua 4 va 6?', options: { A: '3', B: '5', C: '7', D: '2' }, correct: 'B' },
    ],
  },
  {
    code: 'M1-ADD-10',
    name: 'Toan lop 1 - Cong trong pham vi 10',
    // tags removed
    questions: [
      { content: '2 + 3 = ?', options: { A: '4', B: '5', C: '6', D: '3' }, correct: 'B' },
      { content: '1 + 6 = ?', options: { A: '6', B: '7', C: '8', D: '5' }, correct: 'B' },
      { content: '4 + 4 = ?', options: { A: '8', B: '7', C: '6', D: '9' }, correct: 'A' },
      { content: '0 + 9 = ?', options: { A: '0', B: '10', C: '9', D: '8' }, correct: 'C' },
      { content: '5 + 2 = ?', options: { A: '6', B: '7', C: '8', D: '9' }, correct: 'B' },
      { content: '3 + 6 = ?', options: { A: '8', B: '7', C: '10', D: '9' }, correct: 'D' },
      { content: '7 + 1 = ?', options: { A: '8', B: '9', C: '7', D: '6' }, correct: 'A' },
      { content: '2 + 2 = ?', options: { A: '5', B: '3', C: '4', D: '2' }, correct: 'C' },
      { content: '6 + 3 = ?', options: { A: '10', B: '9', C: '8', D: '7' }, correct: 'B' },
      { content: '4 + 1 = ?', options: { A: '6', B: '5', C: '4', D: '3' }, correct: 'B' },
      { content: '8 + 0 = ?', options: { A: '8', B: '0', C: '7', D: '9' }, correct: 'A' },
      { content: '1 + 1 + 1 = ?', options: { A: '2', B: '4', C: '3', D: '1' }, correct: 'C' },
    ],
  },
  {
    code: 'M1-SUB-10',
    name: 'Toan lop 1 - Tru trong pham vi 10',
    // tags removed
    questions: [
      { content: '5 - 2 = ?', options: { A: '3', B: '2', C: '4', D: '1' }, correct: 'A' },
      { content: '9 - 1 = ?', options: { A: '7', B: '8', C: '9', D: '6' }, correct: 'B' },
      { content: '7 - 3 = ?', options: { A: '3', B: '5', C: '4', D: '2' }, correct: 'C' },
      { content: '10 - 2 = ?', options: { A: '8', B: '7', C: '6', D: '9' }, correct: 'A' },
      { content: '6 - 6 = ?', options: { A: '6', B: '1', C: '0', D: '2' }, correct: 'C' },
      { content: '8 - 5 = ?', options: { A: '4', B: '3', C: '2', D: '1' }, correct: 'B' },
      { content: '4 - 1 = ?', options: { A: '1', B: '4', C: '3', D: '2' }, correct: 'C' },
      { content: '3 - 0 = ?', options: { A: '2', B: '3', C: '1', D: '0' }, correct: 'B' },
      { content: '9 - 4 = ?', options: { A: '5', B: '4', C: '3', D: '6' }, correct: 'A' },
      { content: '2 - 1 = ?', options: { A: '0', B: '2', C: '3', D: '1' }, correct: 'D' },
      { content: '10 - 10 = ?', options: { A: '1', B: '0', C: '10', D: '2' }, correct: 'B' },
      { content: '6 - 2 = ?', options: { A: '5', B: '3', C: '4', D: '2' }, correct: 'C' },
    ],
  },
  {
    code: 'M1-COMPARE',
    name: 'Toan lop 1 - So sanh lon hon nho hon bang nhau',
    // tags removed
    questions: [
      { content: 'So nao lon hon: 7 hay 5?', options: { A: '7', B: '5', C: 'Bang nhau', D: 'Khong biet' }, correct: 'A' },
      { content: 'So nao nho hon: 2 hay 9?', options: { A: '9', B: '2', C: 'Bang nhau', D: '10' }, correct: 'B' },
      { content: '3 ___ 3', options: { A: '>', B: '<', C: '=', D: '+' }, correct: 'C' },
      { content: '8 ___ 6', options: { A: '<', B: '>', C: '=', D: '-' }, correct: 'B' },
      { content: '1 ___ 4', options: { A: '>', B: '=', C: '<', D: '+' }, correct: 'C' },
      { content: '9 ___ 9', options: { A: '<', B: '>', C: '=', D: '/' }, correct: 'C' },
      { content: '5 ___ 2', options: { A: '<', B: '>', C: '=', D: '*' }, correct: 'B' },
      { content: '0 ___ 1', options: { A: '<', B: '>', C: '=', D: '+' }, correct: 'A' },
      { content: '6 ___ 7', options: { A: '>', B: '=', C: '<', D: '-' }, correct: 'C' },
      { content: '4 ___ 4', options: { A: '<', B: '>', C: '=', D: '+' }, correct: 'C' },
      { content: 'Chon cap so bang nhau', options: { A: '2 va 3', B: '6 va 6', C: '7 va 1', D: '4 va 5' }, correct: 'B' },
      { content: 'Chon cap so lon hon', options: { A: '3 > 8', B: '2 > 2', C: '9 > 4', D: '1 > 7' }, correct: 'C' },
    ],
  },
  {
    code: 'M1-WORD-PROB',
    name: 'Toan lop 1 - Bai toan co loi van don gian',
    // tags removed
    questions: [
      { content: 'Lan co 3 cai keo, me cho them 2 cai. Lan co tat ca bao nhieu cai?', options: { A: '4', B: '5', C: '6', D: '3' }, correct: 'B' },
      { content: 'Minh co 8 qua bong, bi hong mat 1 qua. Con lai bao nhieu qua?', options: { A: '7', B: '8', C: '6', D: '9' }, correct: 'A' },
      { content: 'Trong ro co 4 qua tao va 4 qua cam. Co tat ca bao nhieu qua?', options: { A: '7', B: '8', C: '9', D: '6' }, correct: 'B' },
      { content: 'Co 6 ban chim tren cay, bay di 2 con. Con lai bao nhieu con?', options: { A: '3', B: '4', C: '5', D: '6' }, correct: 'B' },
      { content: 'Ha co 1 quy vo, mua them 3 quy. Ha co bao nhieu quy vo?', options: { A: '5', B: '3', C: '4', D: '2' }, correct: 'C' },
      { content: 'Co 10 chiec but, cho ban 4 chiec. Con lai bao nhieu chiec?', options: { A: '7', B: '6', C: '5', D: '4' }, correct: 'B' },
      { content: 'An co 2 con ga, bo mua them 2 con. Tong cong co bao nhieu con ga?', options: { A: '3', B: '4', C: '5', D: '2' }, correct: 'B' },
      { content: 'Co 9 vien bi, cho em 3 vien. Con bao nhieu vien?', options: { A: '6', B: '5', C: '7', D: '4' }, correct: 'A' },
      { content: 'Nam co 5 bong den, tat 1 bong. Con sang bao nhieu bong?', options: { A: '6', B: '5', C: '4', D: '3' }, correct: 'C' },
      { content: 'Lop co 7 ban trai va 2 ban gai. Ca lop co bao nhieu ban?', options: { A: '8', B: '9', C: '10', D: '7' }, correct: 'B' },
      { content: 'Trong hop co 3 vien keo, them 3 vien nua. Co tat ca bao nhieu vien?', options: { A: '5', B: '6', C: '7', D: '4' }, correct: 'B' },
      { content: 'Co 8 qua trung, vo 2 qua. Con lai bao nhieu qua?', options: { A: '5', B: '7', C: '6', D: '8' }, correct: 'C' },
    ],
  },
];

async function main() {
  const course = await prisma.course.findFirst({
    where: {
      code: {
        equals: 'CLS001',
      },
    },
    select: { id: true, code: true, name: true, lecturerId: true },
  });

  if (!course) {
    throw new Error('Khong tim thay lop CLS001. Hay chay seed chinh truoc.');
  }

  if (!course.lecturerId) {
    throw new Error('Lop CLS001 chua gan giang vien, khong the tao demo question theo quyen Lecturer.');
  }

  console.log(`Dang seed demo cho lop ${course.code} - ${course.name}`);

  const deleted = await prisma.question.deleteMany({
    where: {
      courseId: course.id,
      content: {
        contains: DEMO_PREFIX,
      },
    },
  });

  if (deleted.count > 0) {
    console.log(`Da xoa ${deleted.count} cau hoi demo cu.`);
  }

  let createdTopics = 0;
  let createdQuestions = 0;

  for (const topic of topics) {
    const topicRow = await prisma.topic.upsert({
      where: { code: topic.code },
      update: { name: topic.name },
      create: { code: topic.code, name: topic.name },
      select: { id: true, code: true, name: true },
    });

    await prisma.courseTopic.upsert({
      where: {
        courseId_topicId: {
          courseId: course.id,
          topicId: topicRow.id,
        },
      },
      update: {},
      create: {
        courseId: course.id,
        topicId: topicRow.id,
      },
    });

    createdTopics += 1;

    for (let i = 0; i < topic.questions.length; i += 1) {
      const q = topic.questions[i];
      const question = await prisma.question.create({
        data: {
          type: 'MULTIPLE_CHOICE',
          content: `${DEMO_PREFIX} ${q.content}`,
          options: q.options,
          correctAnswer: { answer: q.correct },
          explanation: q.explanation || 'Cau hoi demo Toan lop 1 cho CLS001',
          difficulty: q.difficulty ?? 2,
          points: q.points ?? 1,
          // tags removed from schema
          courseId: course.id,
          creatorId: course.lecturerId,
          status: QuestionLifecycleStatus.PUBLISHED,
          latestVersionNo: 1,
          isReusable: true,
        },
        select: { id: true },
      });

      await prisma.questionTopic.create({
        data: {
          questionId: question.id,
          topicId: topicRow.id,
          weight: 1,
        },
      });

      await prisma.questionCourseScope.create({
        data: {
          questionId: question.id,
          courseId: course.id,
        },
      });

      createdQuestions += 1;
    }

    console.log(`- ${topic.name}: ${topic.questions.length} cau hoi`);
  }

  const summary = await prisma.$queryRawUnsafe(
    `
    SELECT t.code, t.name, COUNT(q.id) AS questionCount
    FROM topics t
    INNER JOIN course_topics ct ON ct.topicId = t.id
    LEFT JOIN question_topics qt ON qt.topicId = t.id
    LEFT JOIN questions q ON q.id = qt.questionId AND q.courseId = ?
    WHERE ct.courseId = ? AND t.code IN (${topics.map(() => '?').join(',')})
    GROUP BY t.id, t.code, t.name
    ORDER BY t.code ASC
    `,
    course.id,
    course.id,
    ...topics.map((t) => t.code),
  ) as Array<{ code: string; name: string; questionCount: bigint | number }>;

  console.log('');
  console.log(`Hoan tat: ${createdTopics} topic, ${createdQuestions} cau hoi demo cho ${course.code}.`);
  console.log('Thong ke theo topic:');
  for (const row of summary) {
    console.log(`  ${row.code} - ${row.name}: ${Number(row.questionCount)} cau hoi`);
  }
}

main()
  .catch((error) => {
    console.error('Seed that bai:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
