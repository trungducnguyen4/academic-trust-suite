import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst({
    where: { code: 'CLS001' },
    select: { id: true, code: true, name: true, lecturerId: true },
  });

  if (!course) {
    throw new Error('CLS001 not found');
  }

  const topicCodes = [
    'M1-ADD-10',
    'M1-COMPARE',
    'M1-COUNT-10',
    'M1-SUB-10',
    'M1-WORD-PROB',
  ];

  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT t.code, t.name, COUNT(q.id) AS questionCount
    FROM topics t
    INNER JOIN course_topics ct ON ct.topicId = t.id
    LEFT JOIN question_topics qt ON qt.topicId = t.id
    LEFT JOIN questions q ON q.id = qt.questionId AND q.courseId = ?
    WHERE ct.courseId = ? AND t.code IN (${topicCodes.map(() => '?').join(',')})
    GROUP BY t.id, t.code, t.name
    ORDER BY t.code ASC
    `,
    course.id,
    course.id,
    ...topicCodes,
  ) as Array<{ code: string; name: string; questionCount: bigint | number }>;

  const total = rows.reduce((sum, row) => sum + Number(row.questionCount), 0);

  const visibleToLecturer = await prisma.question.count({
    where: {
      courseId: course.id,
      content: { contains: '[DEMO-CLS001]' },
      creatorId: course.lecturerId || undefined,
      status: 'PUBLISHED',
    },
  });

  const sample = await prisma.question.findFirst({
    where: {
      courseId: course.id,
      content: { contains: '[DEMO-CLS001]' },
    },
    select: {
      content: true,
      type: true,
      correctAnswer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Course: ${course.code} - ${course.name}`);
  console.table(rows.map((r) => ({ ...r, questionCount: Number(r.questionCount) })));
  console.log(`Total demo questions: ${total}`);
  console.log(`Visible to assigned lecturer: ${visibleToLecturer}`);
  console.log(`Assigned lecturerId: ${course.lecturerId}`);
  console.log('Sample question:', sample);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
