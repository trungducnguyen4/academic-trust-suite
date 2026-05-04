const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const LECTURER_EMAIL = process.env.LECTURER_EMAIL || 'lecturer@examtrust.edu';
const LECTURER_PASSWORD = process.env.LECTURER_PASSWORD || '123456';
const STUDENT_EMAIL = process.env.STUDENT_EMAIL || 'student@examtrust.edu';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || '123456';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const SKIP_EMAIL = process.env.SKIP_EMAIL === '1';
const SKIP_AI = process.env.SKIP_AI === '1';

const runId = process.env.TEST_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '');
const prefix = process.env.TEST_PREFIX || `smoke-${runId}`;

async function request(method, path, token, body, query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { ok: res.ok, status: res.status, data, url: url.toString() };
}

function requireOk(label, result) {
  if (!result.ok) {
    const payload = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
    throw new Error(`${label} failed (${result.status}) at ${result.url}\n${payload}`);
  }
  return result.data;
}

function pickId(obj, keys = ['id', 'submissionId', 'examId', 'courseId', 'questionId']) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key]) return obj[key];
  }
  if (obj.data && typeof obj.data === 'object') {
    for (const key of keys) {
      if (obj.data[key]) return obj.data[key];
    }
  }
  return null;
}

async function run() {
  console.log(`API_BASE=${API_BASE}`);

  // Auth flow
  const lecturerLogin = requireOk(
    'Login lecturer',
    await request('POST', '/auth/login', null, {
      email: LECTURER_EMAIL,
      password: LECTURER_PASSWORD,
    })
  );
  const lecturerToken = lecturerLogin.accessToken;
  if (!lecturerToken) throw new Error('Missing lecturer accessToken');

  requireOk('Lecturer /auth/me', await request('GET', '/auth/me', lecturerToken));

  const studentLogin = requireOk(
    'Login student',
    await request('POST', '/auth/login', null, {
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    })
  );
  const studentToken = studentLogin.accessToken;
  const studentId = studentLogin.user && studentLogin.user.id;
  if (!studentToken) throw new Error('Missing student accessToken');
  if (!studentId) throw new Error('Missing student id in login response');

  requireOk('Student /auth/me', await request('GET', '/auth/me', studentToken));

  // Core: course
  const course = requireOk(
    'Create course',
    await request('POST', '/courses', lecturerToken, {
      name: `${prefix}-course`,
      description: 'Manual smoke test course',
      credits: 3,
      academicYear: '2025-2026',
      term: 'TERM_1',
    })
  );
  const courseId = pickId(course);
  if (!courseId) throw new Error('Missing course id');

  requireOk('Get course', await request('GET', `/courses/${courseId}`, lecturerToken));
  requireOk('List courses', await request('GET', '/courses', lecturerToken, null, { page: 1, limit: 5 }));

  // Core: question
  const question = requireOk(
    'Create question',
    await request('POST', '/questions', lecturerToken, {
      type: 'MULTIPLE_CHOICE',
      content: '2 + 2 = ?',
      options: { choices: ['2', '3', '4', '5'] },
      correctAnswer: { answer: '4' },
      difficulty: 3,
      points: 1,
      tags: ['smoke'],
      courseId,
    })
  );
  const questionId = pickId(question);
  if (!questionId) throw new Error('Missing question id');

  requireOk('Get question', await request('GET', `/questions/${questionId}`, lecturerToken));

  // Core: exam
  const now = Date.now();
  const startTime = new Date(now - 60 * 1000).toISOString();
  const endTime = new Date(now + 60 * 60 * 1000).toISOString();

  const exam = requireOk(
    'Create exam',
    await request('POST', '/exams', lecturerToken, {
      title: `${prefix}-exam`,
      description: 'Manual smoke test exam',
      courseId,
      duration: 30,
      totalPoints: 1,
      startTime,
      endTime,
    })
  );
  const examId = pickId(exam);
  if (!examId) throw new Error('Missing exam id');

  requireOk('Add question to exam', await request('POST', `/exams/${examId}/questions`, lecturerToken, { questionIds: [questionId] }));
  requireOk('Publish exam', await request('POST', `/exams/${examId}/publish`, lecturerToken));

  // Enrollment
  requireOk('Enroll student', await request('POST', '/enrollments', lecturerToken, { courseId, studentId }));

  // Email notification
  if (!SKIP_EMAIL) {
    if (!TEST_EMAIL) {
      console.warn('TEST_EMAIL not set, skipping email share');
    } else {
      requireOk('Share exam email', await request('POST', `/exams/${examId}/share`, lecturerToken, { emails: [TEST_EMAIL] }));
      console.log(`Email share requested for ${TEST_EMAIL}. Confirm delivery in inbox.`);
    }
  }

  // Student exam flow
  requireOk('Student available exams', await request('GET', '/exams/available', studentToken));
  const started = requireOk('Start exam', await request('POST', '/submissions/start', studentToken, { examId }));
  const submissionId = pickId(started, ['id', 'submissionId']);
  if (!submissionId) throw new Error('Missing submission id');

  requireOk(
    'Submit exam',
    await request('POST', `/submissions/${submissionId}/submit`, studentToken, {
      answers: [{ questionId, answer: { answer: '4' } }],
    })
  );

  requireOk('My submissions', await request('GET', '/submissions/my-submissions', studentToken));
  requireOk('My exam submission', await request('GET', `/submissions/exam/${examId}/my-submission`, studentToken));

  // Notifications
  requireOk('Notifications list', await request('GET', '/notifications/my', studentToken, null, { page: 1, limit: 5, unreadOnly: false }));

  // AI endpoint
  if (!SKIP_AI) {
    requireOk(
      'AI generate question',
      await request('POST', '/ai/generate-question', lecturerToken, {
        prompt: 'Create a multiple choice question about arrays in JavaScript',
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 0.5,
        language: 'en',
        courseName: 'Intro to JS',
        useCase: 'question_bank',
      })
    );
  }

  console.log('Manual smoke test completed successfully.');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
