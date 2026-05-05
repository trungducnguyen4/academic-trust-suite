import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { email: '522h0121@tdhuhu.edu.vn' },
    select: { id: true },
  });

  if (!student) throw new Error('missing student');

  try {
    const rows = await prisma.examSubmission.findMany({
      where: { studentId: student.id },
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

    console.log('ROWS', rows.length);
    console.log(JSON.stringify(rows.slice(0, 2), null, 2));
  } catch (error) {
    console.error('QUERY_ERROR', error);
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
