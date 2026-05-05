import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst({
    where: { code: 'CLS001' },
    select: { id: true, code: true, name: true },
  });
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    select: { id: true, email: true, fullName: true },
  });

  if (!course || !student) throw new Error('Missing CLS001 or student');

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: course.id, studentId: student.id },
    select: { status: true },
  });

  const exams = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      status: { in: ['PUBLISHED', 'ONGOING'] },
      OR: [{ startTime: null }, { startTime: { lte: new Date() } }],
      AND: [{ OR: [{ endTime: null }, { endTime: { gte: new Date() } }] }],
    },
    select: { id: true, title: true, status: true, startTime: true, endTime: true },
  });

  console.log({
    course: course.code,
    student: student.email,
    enrollmentStatus: enrollment?.status ?? null,
    availableExamCount: exams.length,
    exams,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
