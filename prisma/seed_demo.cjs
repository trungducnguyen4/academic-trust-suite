const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const PASSWORD = '123123123Az!';
const TOTAL_USERS = 100;
const COURSE_COUNT = 10;
const QUESTIONS_PER_COURSE = 10;

async function clear() {
  try { await prisma.submissionAnswer.deleteMany(); } catch (e) {}
  try { await prisma.examQuestion.deleteMany(); } catch (e) {}
  try { await prisma.question.deleteMany(); } catch (e) {}
  try { await prisma.course.deleteMany(); } catch (e) {}
}

async function main(){
  console.log('Seeding demo dataset (CJS)...');
  await clear();

  const hashed = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.upsert({ where: { email: 'admin@tdhuhu.edu.vn' }, update: { password: hashed }, create: { email: 'admin@tdhuhu.edu.vn', password: hashed, fullName: 'Admin', role: 'ADMIN', department: 'IT' } });

  await prisma.user.upsert({ where: { email: 'lecturer01@tdhuhu.edu.vn' }, update: { password: hashed }, create: { email: 'lecturer01@tdhuhu.edu.vn', password: hashed, fullName: 'Lecturer 01', role: 'LECTURER', department: 'Computer Science' } });

  await prisma.user.upsert({ where: { email: '522h0001@tdhuhu.edu.vn' }, update: { password: hashed }, create: { email: '522h0001@tdhuhu.edu.vn', password: hashed, fullName: 'Demo Student 522h0001', role: 'STUDENT', studentId: '522h0001' } });

  const existing = await prisma.user.count();
  const toCreate = Math.max(0, TOTAL_USERS - existing);
  const batches = [];
  for (let i=0;i<toCreate;i++){
    const n = i+1;
    batches.push({ email: `student_demo_${n}@tdhuhu.edu.vn`, password: hashed, fullName: `Student Demo ${n}`, role: 'STUDENT', studentId: `SD${String(n).padStart(4,'0')}` });
    if (batches.length>=50){ await prisma.user.createMany({ data: batches }); batches.length=0; }
  }
  if (batches.length) await prisma.user.createMany({ data: batches });

  const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
  console.log(`Students: ${students.length}`);

  const lecturerRow = await prisma.user.findUnique({ where: { email: 'lecturer01@tdhuhu.edu.vn' } });
  const courses = [];
  for (let i=1;i<=COURSE_COUNT;i++){
    const code = `CLS${String(i).padStart(3,'0')}`;
    const c = await prisma.course.create({ data: { code, name: `Demo Course ${code}`, description:`Auto ${code}`, credits:3, academicYear:'2025-2026', term:'TERM_2', lecturerId: lecturerRow.id } });
    courses.push(c);
  }
  console.log(`Created ${courses.length} courses`);

  let totalQ = 0;
  for (const course of courses){
    const qdata = [];
    for (let q=1;q<=QUESTIONS_PER_COURSE;q++){
      const content = `Question ${q} for ${course.code}: What is ${q}+${q}?`;
      const options = [ `${q+q}`, `${q+q+1}`, `${q+q-1}`, `${q+q+2}` ];
      qdata.push({ type:'MULTIPLE_CHOICE', content, options: options, correctAnswer: options[0], difficulty:1, points:1, courseId: course.id, creatorId: lecturerRow.id });
    }
    await prisma.question.createMany({ data: qdata });
    totalQ += qdata.length;
  }
  console.log(`Created ${totalQ} questions`);

  console.log('Done. Demo credentials:');
  console.log('Admin: admin@tdhuhu.edu.vn / 123123123Az!');
  console.log('Lecturer: lecturer01@tdhuhu.edu.vn / 123123123Az!');
  console.log('Student: 522h0001@tdhuhu.edu.vn / 123123123Az!');
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
