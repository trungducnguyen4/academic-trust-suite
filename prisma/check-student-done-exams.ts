import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { email: '522h0121@tdhuhu.edu.vn' },
    select: { id: true, email: true, fullName: true },
  });

  if (!student) {
    throw new Error('Student 522h0121 not found');
  }

  const subs = await prisma.examSubmission.findMany({
    where: { studentId: student.id },
    select: {
      id: true,
      examId: true,
      status: true,
      attemptNo: true,
      score: true,
      startedAt: true,
      submittedAt: true,
      createdAt: true,
      exam: {
        select: {
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          course: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Student: ${student.email}`);
  console.log(`Submissions: ${subs.length}`);
  console.log(JSON.stringify(subs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
