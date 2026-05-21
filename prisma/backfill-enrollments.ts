import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfill: enrolling all students into CLS001');

  const course = await prisma.course.findFirst({ where: { code: 'CLS001' } });
  if (!course) {
    console.error('Course CLS001 not found. Aborting.');
    process.exit(1);
  }

  const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
  console.log(`Found ${students.length} students`);

  const existing = await prisma.enrollment.findMany({ where: { courseId: course.id }, select: { studentId: true } });
  const existingSet = new Set(existing.map((r) => r.studentId));

  const toCreate = students
    .map((s) => s.id)
    .filter((id) => !existingSet.has(id))
    .map((studentId) => ({ courseId: course.id, studentId }));

  console.log(`Will create ${toCreate.length} enrollments for course ${course.code} (${course.id})`);

  if (toCreate.length > 0) {
    // create in batches to avoid large single queries
    const chunkSize = 1000;
    for (let i = 0; i < toCreate.length; i += chunkSize) {
      const chunk = toCreate.slice(i, i + chunkSize);
      await prisma.enrollment.createMany({ data: chunk, skipDuplicates: true });
      console.log(`Inserted chunk ${i / chunkSize + 1} (${chunk.length})`);
    }
  }

  const finalCount = await prisma.enrollment.count({ where: { courseId: course.id } });
  console.log(`Final enrollments for ${course.code}: ${finalCount}`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(2);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
