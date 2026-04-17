import { Prisma, PrismaClient, CourseTerm } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Business Administration',
  'Economics',
  'Mathematics',
  'Physics',
];

const STUDENT_PASSWORD = '123123123Az!';
const STUDENTS_PER_COHORT = 2000;
const COHORT_PREFIXES = ['522h', '523h', '524h', '525h'];
const LECTURER_COUNT = 20;
const MIN_PER_COURSE = 90;
const MAX_PER_COURSE = 100;
const ENROLLMENT_BATCH_SIZE = 1000;
const STUDENT_BATCH_SIZE = 500;

const padNumber = (value: number, length: number) => value.toString().padStart(length, '0');

const randomItem = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const chunkArray = <T>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const shuffle = <T>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildStudentId = (prefix: string, index: number) => `${prefix}${padNumber(index, 4)}`;

const isMissingTableError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const safeDelete = async (name: string, action: () => Promise<unknown>) => {
  try {
    await action();
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`WARN: Skipped delete for ${name} (table missing).`);
      return;
    }
    throw error;
  }
};

async function clearDatabase() {
  await safeDelete('integrity_logs', () => prisma.integrityLog.deleteMany());
  await safeDelete('proctoring_sessions', () => prisma.proctoringSession.deleteMany());
  await safeDelete('submission_answers', () => prisma.submissionAnswer.deleteMany());
  await safeDelete('exam_submissions', () => prisma.examSubmission.deleteMany());
  await safeDelete('exam_questions', () => prisma.examQuestion.deleteMany());
  await safeDelete('exam_link_usages', () => prisma.examLinkUsage.deleteMany());
  await safeDelete('exam_links', () => prisma.examLink.deleteMany());
  await safeDelete('questions', () => prisma.question.deleteMany());
  await safeDelete('exams', () => prisma.exam.deleteMany());
  await safeDelete('enrollments', () => prisma.enrollment.deleteMany());
  await safeDelete('courses', () => prisma.course.deleteMany());
  await safeDelete('notifications', () => prisma.notification.deleteMany());
  await safeDelete('users', () => prisma.user.deleteMany());
}

async function main() {
  console.log('🌱 Seeding database...');
  await clearDatabase();
  console.log('✅ Cleared existing data');

  const hashedPassword = await bcrypt.hash(STUDENT_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@tdhuhu.edu.vn',
      password: hashedPassword,
      fullName: 'System Admin',
      role: 'ADMIN',
      department: 'Information Technology',
    },
  });
  console.log('✅ Created admin:', admin.email);

  const lecturersData = Array.from({ length: LECTURER_COUNT }, (_, index) => ({
    email: `lecturer${padNumber(index + 1, 2)}@tdhuhu.edu.vn`,
    password: hashedPassword,
    fullName: `Lecturer ${padNumber(index + 1, 2)}`,
    role: 'LECTURER',
    department: randomItem(DEPARTMENTS),
  }));
  await prisma.user.createMany({ data: lecturersData });
  const lecturers = await prisma.user.findMany({
    where: { role: 'LECTURER' },
    orderBy: { email: 'asc' },
  });
  console.log(`✅ Created ${lecturers.length} lecturers`);

  let studentBatch: Array<{
    email: string;
    password: string;
    fullName: string;
    role: string;
    studentId: string;
    department: string;
  }> = [];

  for (const prefix of COHORT_PREFIXES) {
    for (let i = 1; i <= STUDENTS_PER_COHORT; i += 1) {
      const studentId = buildStudentId(prefix, i);
      studentBatch.push({
        email: `${studentId}@tdhuhu.edu.vn`,
        password: hashedPassword,
        fullName: `Student ${studentId}`,
        role: 'STUDENT',
        studentId,
        department: randomItem(DEPARTMENTS),
      });

      if (studentBatch.length >= STUDENT_BATCH_SIZE) {
        await prisma.user.createMany({ data: studentBatch });
        studentBatch = [];
      }
    }
  }

  if (studentBatch.length > 0) {
    await prisma.user.createMany({ data: studentBatch });
  }

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  });
  console.log(`✅ Created ${students.length} students`);

  const totalStudents = students.length;
  const minCourses = Math.ceil(totalStudents / MAX_PER_COURSE);
  const maxCourses = Math.floor(totalStudents / MIN_PER_COURSE);
  const courseCount = maxCourses;

  if (courseCount < minCourses || courseCount > maxCourses) {
    throw new Error('Course count does not satisfy size constraints.');
  }

  const baseCoursesPerLecturer = Math.floor(courseCount / lecturers.length);
  const remainderCourses = courseCount % lecturers.length;
  const coursesData: Array<{
    code: string;
    name: string;
    description: string;
    credits: number;
    academicYear: string;
    term: CourseTerm;
    lecturerId: string;
  }> = [];

  let courseIndex = 1;
  lecturers.forEach((lecturer, index) => {
    const classesForLecturer = baseCoursesPerLecturer + (index < remainderCourses ? 1 : 0);
    for (let i = 0; i < classesForLecturer; i += 1) {
      const code = `CLS${padNumber(courseIndex, 3)}`;
      coursesData.push({
        code,
        name: `Class ${code}`,
        description: `Generated class ${code}`,
        credits: 3,
        academicYear: '2025-2026',
        term: CourseTerm.TERM_2,
        lecturerId: lecturer.id,
      });
      courseIndex += 1;
    }
  });

  await prisma.course.createMany({ data: coursesData });
  const courses = await prisma.course.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true },
  });
  console.log(`✅ Created ${courses.length} classes`);

  if (totalStudents < courses.length * MIN_PER_COURSE || totalStudents > courses.length * MAX_PER_COURSE) {
    throw new Error('Student count cannot be distributed with the requested class size.');
  }

  const baseSize = MIN_PER_COURSE;
  let remaining = totalStudents - baseSize * courses.length;
  const extras = new Array<number>(courses.length).fill(0);

  while (remaining > 0) {
    const index = Math.floor(Math.random() * courses.length);
    if (extras[index] < MAX_PER_COURSE - MIN_PER_COURSE) {
      extras[index] += 1;
      remaining -= 1;
    }
  }

  const courseSizes = extras.map((extra) => baseSize + extra);
  const shuffledStudentIds = shuffle(students.map((student) => student.id));
  const enrollmentsData: Array<{ courseId: string; studentId: string }> = [];

  let offset = 0;
  courses.forEach((course, index) => {
    const size = courseSizes[index];
    const assigned = shuffledStudentIds.slice(offset, offset + size);
    offset += size;
    assigned.forEach((studentId) => {
      enrollmentsData.push({ courseId: course.id, studentId });
    });
  });

  if (offset !== shuffledStudentIds.length) {
    throw new Error('Enrollment distribution mismatch.');
  }

  for (const chunk of chunkArray(enrollmentsData, ENROLLMENT_BATCH_SIZE)) {
    await prisma.enrollment.createMany({ data: chunk });
  }
  console.log(`✅ Created ${enrollmentsData.length} enrollments`);

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('📋 TEST ACCOUNTS:');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ Role      │ Email                     │ Password       │ Name │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│ ADMIN     │ admin@tdhuhu.edu.vn        │ 123123123Az!   │ Admin│');
  console.log('│ LECTURER  │ lecturer01@tdhuhu.edu.vn   │ 123123123Az!   │ L01  │');
  console.log('│ STUDENT   │ 522h0001@tdhuhu.edu.vn     │ 123123123Az!   │ S001 │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log('\n📊 DATA SUMMARY:');
  console.log(`   - Users: ${1 + lecturers.length + students.length}`);
  console.log(`   - Lecturers: ${lecturers.length}`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Classes: ${courses.length}`);
  console.log(`   - Enrollments: ${enrollmentsData.length}`);
  console.log(`   - Class size range: ${Math.min(...courseSizes)}-${Math.max(...courseSizes)}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
