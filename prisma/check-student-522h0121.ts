import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { email: '522h0121@tdhuhu.edu.vn' },
    select: { id: true, email: true, fullName: true },
  });
  const course = await prisma.course.findFirst({
    where: { code: 'CLS001' },
    select: { id: true, code: true, name: true },
  });

  if (!student || !course) throw new Error('Missing student or course');

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, courseId: course.id },
    select: { status: true },
  });

  const availableExams = await prisma.exam.findMany({
    where: {
      courseId: course.id,
      status: { in: ['PUBLISHED', 'ONGOING'] },
      OR: [{ startTime: null }, { startTime: { lte: new Date() } }],
      AND: [{ OR: [{ endTime: null }, { endTime: { gte: new Date() } }] }],
    },
    select: { id: true, title: true, status: true },
  });

  const enrollmentsInCls001 = await prisma.enrollment.count({
    where: { courseId: course.id, studentId: student.id },
  });

  console.log({
    student: student.email,
    course: course.code,
    enrollmentStatus: enrollment?.status ?? null,
    enrollmentsInCls001,
    availableExamCount: availableExams.length,
    availableExams,
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
