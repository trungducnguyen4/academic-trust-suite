import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { email: '522h0121@tdhuhu.edu.vn' },
    select: { id: true, email: true },
  });

  if (!student) throw new Error('Student 522h0121 not found');

  const cls001 = await prisma.course.findFirst({
    where: { code: 'CLS001' },
    select: { id: true, code: true },
  });

  if (!cls001) throw new Error('Course CLS001 not found');

  const exams = await prisma.exam.findMany({
    where: {
      courseId: cls001.id,
      status: { in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] },
    },
    select: { id: true, title: true },
    take: 2,
    orderBy: { createdAt: 'desc' },
  });

  if (exams.length === 0) {
    throw new Error('No exams found in CLS001');
  }

  let created = 0;
  for (const exam of exams) {
    const existing = await prisma.examSubmission.findFirst({
      where: {
        examId: exam.id,
        studentId: student.id,
      },
      select: { id: true },
    });

    if (existing) {
      console.log(`SKIP existing submission for exam: ${exam.title}`);
      continue;
    }

    const now = new Date();
    const startedAt = new Date(now.getTime() - 25 * 60 * 1000);
    const submittedAt = new Date(now.getTime() - 5 * 60 * 1000);

    await prisma.examSubmission.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        attemptNo: 1,
        status: 'SUBMITTED',
        startedAt,
        submittedAt,
        score: 8,
      },
    });

    created += 1;
    console.log(`CREATED submission for exam: ${exam.title}`);
  }

  console.log(`Done. Created ${created} submissions for ${student.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
