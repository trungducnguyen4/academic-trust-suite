import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = '123123123Az!';
const TOTAL_USERS = 100;
const COURSE_COUNT = 10;
const QUESTIONS_PER_COURSE = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function clear() {
  // Only remove data this demo script manages to avoid destructive clears elsewhere
  await prisma.submissionAnswer.deleteMany().catch(() => {});
  await prisma.examQuestion.deleteMany().catch(() => {});
  await prisma.question.deleteMany().catch(() => {});
  await prisma.course.deleteMany().catch(() => {});
  // keep other tables intact
}

async function main() {
  console.log('Seeding demo dataset...');
  await clear();

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // Demo accounts
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tdhuhu.edu.vn' },
    update: { password: hashed },
    create: {
      email: 'admin@tdhuhu.edu.vn',
      password: hashed,
      fullName: 'Admin',
      role: 'ADMIN',
      department: 'Information Technology',
    },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer01@tdhuhu.edu.vn' },
    update: { password: hashed },
    create: {
      email: 'lecturer01@tdhuhu.edu.vn',
      password: hashed,
      fullName: 'Lecturer 01',
      role: 'LECTURER',
      department: 'Computer Science',
    },
  });

  const demoStudent = await prisma.user.upsert({
    where: { email: '522h0001@tdhuhu.edu.vn' },
    update: { password: hashed },
    create: {
      email: '522h0001@tdhuhu.edu.vn',
      password: hashed,
      fullName: 'Demo Student 522h0001',
      role: 'STUDENT',
      studentId: '522h0001',
      department: 'Mathematics',
    },
  });

  // Create additional students to reach TOTAL_USERS
  const existingUsers = await prisma.user.count();
  const toCreate = Math.max(0, TOTAL_USERS - existingUsers);
  const batchSize = 50;
  const usersData = [] as any[];
  for (let i = 0; i < toCreate; i++) {
    const n = i + 1;
    usersData.push({
      email: `student_demo_${n}@tdhuhu.edu.vn`,
      password: hashed,
      fullName: `Student Demo ${n}`,
      role: 'STUDENT',
      studentId: `SD${String(n).padStart(4, '0')}`,
      department: 'General',
    });
    if (usersData.length >= batchSize) {
      await prisma.user.createMany({ data: usersData });
      usersData.length = 0;
      // small delay to avoid overwhelming DB
      await sleep(50);
    }
  }
  if (usersData.length) await prisma.user.createMany({ data: usersData });

  const users = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
  console.log(`Users (students) in DB: ${users.length}`);

  // Create courses
  const courses: { id: string; code: string }[] = [];
  for (let i = 1; i <= COURSE_COUNT; i++) {
    const code = `CLS${String(i).padStart(3, '0')}`;
    const course = await prisma.course.create({
      data: {
        code,
        name: `Demo Course ${code}`,
        description: `Auto-generated course ${code}`,
        credits: 3,
        academicYear: '2025-2026',
        term: 'TERM_2',
        lecturerId: lecturer.id,
      },
    });
    courses.push({ id: course.id, code });
  }
  console.log(`Created ${courses.length} courses`);

  // Create questions for each course
  let totalQuestions = 0;
  for (const course of courses) {
    const qdatas = [] as any[];
    for (let q = 1; q <= QUESTIONS_PER_COURSE; q++) {
      const content = `Question ${q} for ${course.code}: What is ${q} + ${q}?`;
      const options = [
        `${q + q}`,
        `${q + q + 1}`,
        `${q + q - 1}`,
        `${q + q + 2}`,
      ];
      qdatas.push({
        type: 'MULTIPLE_CHOICE',
        content,
        options: JSON.stringify(options),
        correctAnswer: JSON.stringify(options[0]),
        difficulty: 1,
        points: 1,
        courseId: course.id,
        creatorId: lecturer.id,
      });
    }
    // createMany
    await prisma.question.createMany({ data: qdatas });
    totalQuestions += qdatas.length;
  }
  console.log(`Created ${totalQuestions} questions (≈ ${QUESTIONS_PER_COURSE} per course)`);

  console.log('Demo seeding finished. Demo credentials:');
  console.log('Admin: admin@tdhuhu.edu.vn / 123123123Az!');
  console.log('Lecturer: lecturer01@tdhuhu.edu.vn / 123123123Az!');
  console.log('Student: 522h0001@tdhuhu.edu.vn / 123123123Az!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
