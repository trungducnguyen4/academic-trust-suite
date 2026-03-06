import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.integrityLog.deleteMany();
  await prisma.proctoringSession.deleteMany();
  await prisma.submissionAnswer.deleteMany();
  await prisma.examSubmission.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create password hash (password: 123456)
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@examtrust.edu',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      department: 'IT Department',
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Create Lecturers
  const lecturer1 = await prisma.user.create({
    data: {
      email: 'lecturer@examtrust.edu',
      password: hashedPassword,
      fullName: 'Dr. Nguyễn Văn A',
      role: 'LECTURER',
      department: 'Computer Science',
    },
  });

  const lecturer2 = await prisma.user.create({
    data: {
      email: 'lecturer2@examtrust.edu',
      password: hashedPassword,
      fullName: 'Dr. Trần Thị B',
      role: 'LECTURER',
      department: 'Information Technology',
    },
  });
  console.log('✅ Created lecturers');

  // Create Students
  const students = await Promise.all([
    prisma.user.create({
      data: {
        email: 'student@examtrust.edu',
        password: hashedPassword,
        fullName: 'Lê Văn C',
        role: 'STUDENT',
        studentId: 'SV001',
        department: 'Computer Science',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student2@examtrust.edu',
        password: hashedPassword,
        fullName: 'Phạm Thị D',
        role: 'STUDENT',
        studentId: 'SV002',
        department: 'Computer Science',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student3@examtrust.edu',
        password: hashedPassword,
        fullName: 'Hoàng Văn E',
        role: 'STUDENT',
        studentId: 'SV003',
        department: 'Information Technology',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student4@examtrust.edu',
        password: hashedPassword,
        fullName: 'Ngô Thị F',
        role: 'STUDENT',
        studentId: 'SV004',
        department: 'Information Technology',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student5@examtrust.edu',
        password: hashedPassword,
        fullName: 'Vũ Văn G',
        role: 'STUDENT',
        studentId: 'SV005',
        department: 'Computer Science',
      },
    }),
  ]);
  console.log('✅ Created', students.length, 'students');

  // Create Courses
  const course1 = await prisma.course.create({
    data: {
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Learn the basics of programming with Python',
      credits: 3,
      semester: '2024-1',
      lecturerId: lecturer1.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      description: 'Advanced concepts in data structures and algorithmic thinking',
      credits: 4,
      semester: '2024-1',
      lecturerId: lecturer1.id,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      code: 'IT301',
      name: 'Database Management Systems',
      description: 'Learn about relational databases and SQL',
      credits: 3,
      semester: '2024-1',
      lecturerId: lecturer2.id,
    },
  });

  const course4 = await prisma.course.create({
    data: {
      code: 'IT401',
      name: 'Web Development',
      description: 'Full-stack web development with modern technologies',
      credits: 4,
      semester: '2024-1',
      lecturerId: lecturer2.id,
    },
  });
  console.log('✅ Created 4 courses');

  // Enroll students
  await prisma.enrollment.createMany({
    data: [
      { studentId: students[0].id, courseId: course1.id },
      { studentId: students[0].id, courseId: course2.id },
      { studentId: students[0].id, courseId: course3.id },
      { studentId: students[1].id, courseId: course1.id },
      { studentId: students[1].id, courseId: course2.id },
      { studentId: students[2].id, courseId: course3.id },
      { studentId: students[2].id, courseId: course4.id },
      { studentId: students[3].id, courseId: course3.id },
      { studentId: students[3].id, courseId: course4.id },
      { studentId: students[4].id, courseId: course1.id },
      { studentId: students[4].id, courseId: course4.id },
    ],
  });
  console.log('✅ Created enrollments');

  // Create Questions
  const questions = await Promise.all([
    // Multiple Choice Questions
    prisma.question.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        content: 'What is the time complexity of binary search?',
        options: {
          A: 'O(1)',
          B: 'O(n)',
          C: 'O(log n)',
          D: 'O(n²)',
        },
        correctAnswer: { answer: 'C' },
        explanation: 'Binary search divides the search space in half each time, resulting in O(log n) complexity.',
        difficulty: 3,
        points: 2,
        tags: JSON.stringify(['algorithms', 'searching', 'complexity']),
        creatorId: lecturer1.id,
        courseId: course2.id,
      },
    }),
    prisma.question.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        content: 'Which data structure uses LIFO principle?',
        options: {
          A: 'Queue',
          B: 'Stack',
          C: 'Linked List',
          D: 'Array',
        },
        correctAnswer: { answer: 'B' },
        explanation: 'Stack follows Last-In-First-Out (LIFO) principle.',
        difficulty: 2,
        points: 1,
        tags: JSON.stringify(['data-structures', 'stack']),
        creatorId: lecturer1.id,
        courseId: course2.id,
      },
    }),
    prisma.question.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        content: 'What does SQL stand for?',
        options: {
          A: 'Structured Query Language',
          B: 'Simple Query Language',
          C: 'Standard Query Logic',
          D: 'System Query Language',
        },
        correctAnswer: { answer: 'A' },
        explanation: 'SQL stands for Structured Query Language.',
        difficulty: 1,
        points: 1,
        tags: JSON.stringify(['database', 'sql', 'basics']),
        creatorId: lecturer2.id,
        courseId: course3.id,
      },
    }),
    // True/False Questions
    prisma.question.create({
      data: {
        type: 'TRUE_FALSE',
        content: 'Python is a compiled language.',
        correctAnswer: { answer: false },
        explanation: 'Python is an interpreted language, not compiled.',
        difficulty: 1,
        points: 1,
        tags: JSON.stringify(['python', 'programming-languages']),
        creatorId: lecturer1.id,
        courseId: course1.id,
      },
    }),
    prisma.question.create({
      data: {
        type: 'TRUE_FALSE',
        content: 'A primary key can contain NULL values.',
        correctAnswer: { answer: false },
        explanation: 'Primary keys must be unique and NOT NULL.',
        difficulty: 2,
        points: 1,
        tags: JSON.stringify(['database', 'constraints']),
        creatorId: lecturer2.id,
        courseId: course3.id,
      },
    }),
    // Multi-Select Questions
    prisma.question.create({
      data: {
        type: 'MULTI_SELECT',
        content: 'Which of the following are valid Python data types? (Select all that apply)',
        options: {
          A: 'int',
          B: 'varchar',
          C: 'list',
          D: 'dictionary',
          E: 'float',
        },
        correctAnswer: { answers: ['A', 'C', 'D', 'E'] },
        explanation: 'Python supports int, list, dict (dictionary), and float. varchar is a SQL data type.',
        difficulty: 2,
        points: 3,
        tags: JSON.stringify(['python', 'data-types']),
        creatorId: lecturer1.id,
        courseId: course1.id,
      },
    }),
    // Short Answer Questions
    prisma.question.create({
      data: {
        type: 'SHORT_ANSWER',
        content: 'What keyword is used to define a function in Python?',
        correctAnswer: { answer: 'def' },
        difficulty: 1,
        points: 1,
        tags: JSON.stringify(['python', 'functions']),
        creatorId: lecturer1.id,
        courseId: course1.id,
      },
    }),
    // Essay Questions
    prisma.question.create({
      data: {
        type: 'ESSAY',
        content: 'Explain the difference between a stack and a queue. Provide real-world examples for each.',
        explanation: 'Expected answer should cover LIFO vs FIFO principles with appropriate examples.',
        difficulty: 4,
        points: 10,
        tags: JSON.stringify(['data-structures', 'concepts']),
        creatorId: lecturer1.id,
        courseId: course2.id,
      },
    }),
    // Fill in Blank
    prisma.question.create({
      data: {
        type: 'FILL_IN_BLANK',
        content: 'The SELECT statement is used to _____ data from a database.',
        correctAnswer: { answers: ['retrieve', 'select', 'fetch', 'get'] },
        difficulty: 1,
        points: 1,
        tags: JSON.stringify(['sql', 'basics']),
        creatorId: lecturer2.id,
        courseId: course3.id,
      },
    }),
    // More questions for variety
    prisma.question.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        content: 'What is the default port for HTTP?',
        options: {
          A: '21',
          B: '22',
          C: '80',
          D: '443',
        },
        correctAnswer: { answer: 'C' },
        explanation: 'HTTP uses port 80 by default, HTTPS uses 443.',
        difficulty: 2,
        points: 1,
        tags: JSON.stringify(['web', 'networking']),
        creatorId: lecturer2.id,
        courseId: course4.id,
      },
    }),
  ]);
  console.log('✅ Created', questions.length, 'questions');

  // Create Exams
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const exam1 = await prisma.exam.create({
    data: {
      title: 'Midterm Exam - Data Structures',
      description: 'Covers topics from weeks 1-7',
      courseId: course2.id,
      creatorId: lecturer1.id,
      duration: 90,
      totalPoints: 100,
      passingScore: 50,
      startTime: now,
      endTime: nextWeek,
      status: 'PUBLISHED',
      settings: {
        shuffleQuestions: true,
        showResults: true,
        allowReview: true,
      },
    },
  });

  const exam2 = await prisma.exam.create({
    data: {
      title: 'Quiz 1 - Python Basics',
      description: 'Short quiz on Python fundamentals',
      courseId: course1.id,
      creatorId: lecturer1.id,
      duration: 30,
      totalPoints: 20,
      passingScore: 10,
      startTime: now,
      endTime: nextMonth,
      status: 'PUBLISHED',
      settings: {
        shuffleQuestions: false,
        showResults: true,
        allowReview: true,
      },
    },
  });

  const exam3 = await prisma.exam.create({
    data: {
      title: 'Database Final Exam',
      description: 'Comprehensive exam covering all SQL topics',
      courseId: course3.id,
      creatorId: lecturer2.id,
      duration: 120,
      totalPoints: 100,
      passingScore: 60,
      startTime: nextWeek,
      endTime: nextMonth,
      status: 'DRAFT',
      settings: {
        shuffleQuestions: true,
        showResults: false,
        allowReview: false,
        proctoring: true,
      },
    },
  });
  console.log('✅ Created 3 exams');

  // Add questions to exams
  await prisma.examQuestion.createMany({
    data: [
      { examId: exam1.id, questionId: questions[0].id, orderIndex: 1, points: 10 },
      { examId: exam1.id, questionId: questions[1].id, orderIndex: 2, points: 5 },
      { examId: exam1.id, questionId: questions[7].id, orderIndex: 3, points: 20 },
      { examId: exam2.id, questionId: questions[3].id, orderIndex: 1, points: 5 },
      { examId: exam2.id, questionId: questions[5].id, orderIndex: 2, points: 10 },
      { examId: exam2.id, questionId: questions[6].id, orderIndex: 3, points: 5 },
      { examId: exam3.id, questionId: questions[2].id, orderIndex: 1, points: 10 },
      { examId: exam3.id, questionId: questions[4].id, orderIndex: 2, points: 10 },
      { examId: exam3.id, questionId: questions[8].id, orderIndex: 3, points: 10 },
    ],
  });
  console.log('✅ Added questions to exams');

  // Create sample submissions
  const submission1 = await prisma.examSubmission.create({
    data: {
      examId: exam2.id,
      studentId: students[0].id,
      status: 'GRADED',
      startedAt: new Date(now.getTime() - 3600000),
      submittedAt: new Date(now.getTime() - 1800000),
      gradedAt: now,
      score: 18,
    },
  });

  await prisma.submissionAnswer.createMany({
    data: [
      {
        submissionId: submission1.id,
        questionId: questions[3].id,
        answer: { answer: false },
        isCorrect: true,
        pointsAwarded: 5,
        timeTaken: 120,
      },
      {
        submissionId: submission1.id,
        questionId: questions[5].id,
        answer: { answers: ['A', 'C', 'D', 'E'] },
        isCorrect: true,
        pointsAwarded: 10,
        timeTaken: 180,
      },
      {
        submissionId: submission1.id,
        questionId: questions[6].id,
        answer: { answer: 'def' },
        isCorrect: true,
        pointsAwarded: 3,
        timeTaken: 60,
      },
    ],
  });
  console.log('✅ Created sample submission');

  console.log('\n🎉 Seeding completed successfully!\n');

  console.log('📋 TEST ACCOUNTS:');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ Role      │ Email                    │ Password │ Name       │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│ ADMIN     │ admin@examtrust.edu      │ 123456   │ System Admin│');
  console.log('│ LECTURER  │ lecturer@examtrust.edu   │ 123456   │ Dr. Nguyễn │');
  console.log('│ LECTURER  │ lecturer2@examtrust.edu  │ 123456   │ Dr. Trần   │');
  console.log('│ STUDENT   │ student@examtrust.edu    │ 123456   │ Lê Văn C   │');
  console.log('│ STUDENT   │ student2@examtrust.edu   │ 123456   │ Phạm Thị D │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log('\n📊 DATA SUMMARY:');
  console.log(`   - Users: 8 (1 admin, 2 lecturers, 5 students)`);
  console.log(`   - Courses: 4`);
  console.log(`   - Enrollments: 11`);
  console.log(`   - Questions: ${questions.length}`);
  console.log(`   - Exams: 3 (1 draft, 2 published)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
