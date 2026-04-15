# ExamTrust Backend API Documentation

## 🚀 Quick Start

### Start Backend Server
```bash
cd backend
npm run start:dev
```
Server runs at: `http://localhost:3001/api`

### Test Accounts (Password: `123456`)

| Role | Email | Full Name |
|------|-------|-----------|
| **ADMIN** | admin@examtrust.edu | System Administrator |
| **LECTURER** | lecturer@examtrust.edu | Dr. Nguyễn Văn A |
| **LECTURER** | lecturer2@examtrust.edu | Dr. Trần Thị B |
| **STUDENT** | student@examtrust.edu | Lê Văn C |
| **STUDENT** | student2@examtrust.edu | Phạm Thị D |

---

## 📚 API Endpoints

### Authentication (`/api/auth`)

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@examtrust.edu",
  "password": "123456"
}
```
**Response:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "admin@examtrust.edu",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "fullName": "New User",
  "role": "STUDENT",
  "studentId": "SV999",
  "department": "Computer Science"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Users (`/api/users`) - Admin/Lecturer Only

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/users` | List all users | ADMIN, LECTURER |
| GET | `/api/users/students` | List students | ADMIN, LECTURER |
| GET | `/api/users/lecturers` | List lecturers | ADMIN |
| GET | `/api/users/:id` | Get user by ID | All authenticated |
| POST | `/api/users` | Create user | ADMIN |
| PATCH | `/api/users/:id` | Update user | Authenticated |
| DELETE | `/api/users/:id` | Delete user | ADMIN |

---

### Courses (`/api/courses`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/courses` | List courses (filtered by role) | All |
| GET | `/api/courses/my-courses` | My courses | All |
| GET | `/api/courses/:id` | Get course details | All |
| POST | `/api/courses` | Create course | LECTURER, ADMIN |
| PATCH | `/api/courses/:id` | Update course | LECTURER, ADMIN |
| DELETE | `/api/courses/:id` | Delete course | ADMIN |

---

### Enrollments (`/api/enrollments`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/enrollments` | Enroll student | LECTURER, ADMIN |
| POST | `/api/enrollments/bulk` | Bulk enroll | LECTURER, ADMIN |
| GET | `/api/enrollments/course/:courseId` | Get course enrollments | LECTURER, ADMIN |
| GET | `/api/enrollments/my-enrollments` | Student's enrollments | STUDENT |
| PATCH | `/api/enrollments/:id/status` | Update status | LECTURER, ADMIN |
| DELETE | `/api/enrollments/:id` | Remove enrollment | LECTURER, ADMIN |

---

### Questions (`/api/questions`) - LECTURER/ADMIN Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | List questions (filtered) |
| GET | `/api/questions/stats` | Get question stats |
| GET | `/api/questions/by-tags?tags=tag1,tag2` | Filter by tags |
| GET | `/api/questions/:id` | Get question |
| POST | `/api/questions` | Create question |
| PATCH | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |

**Question Types:**
- `MULTIPLE_CHOICE` - Single answer
- `MULTI_SELECT` - Multiple answers
- `TRUE_FALSE` - Boolean
- `SHORT_ANSWER` - Text input
- `ESSAY` - Long text
- `FILL_IN_BLANK` - Gap fill
- `MATCHING` - Match pairs
- `ORDERING` - Arrange items

---

### Exams (`/api/exams`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/exams` | List exams | All |
| GET | `/api/exams/available` | Available for student | STUDENT |
| GET | `/api/exams/:id` | Get exam details | All |
| GET | `/api/exams/:id/stats` | Exam statistics | LECTURER, ADMIN |
| POST | `/api/exams` | Create exam | LECTURER, ADMIN |
| PATCH | `/api/exams/:id` | Update exam | LECTURER, ADMIN |
| PATCH | `/api/exams/:id/reschedule` | Reschedule exam window | LECTURER, ADMIN |
| POST | `/api/exams/:id/publish` | Publish exam | LECTURER, ADMIN |
| POST | `/api/exams/:id/questions` | Add questions | LECTURER, ADMIN |
| PATCH | `/api/exams/:id/questions/:questionId` | Update exam question | LECTURER, ADMIN |
| DELETE | `/api/exams/:id/questions/:questionId` | Remove question | LECTURER, ADMIN |
| DELETE | `/api/exams/:id` | Delete exam | LECTURER, ADMIN |

---

### Submissions (`/api/submissions`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/submissions/start` | Start exam | STUDENT |
| POST | `/api/submissions/:id/submit` | Submit exam | STUDENT |
| GET | `/api/submissions/my-submissions` | My submissions | STUDENT |
| GET | `/api/submissions/exam/:examId/my-submission` | My exam result | STUDENT |
| GET | `/api/submissions/exam/:examId` | All submissions for exam | LECTURER, ADMIN |
| GET | `/api/submissions/:id` | Submission details | All |
| POST | `/api/submissions/grade-answer` | Grade an answer | LECTURER, ADMIN |
| POST | `/api/submissions/:id/finalize-grading` | Finalize grades | LECTURER, ADMIN |

---

## 🔐 Authentication

All endpoints except `/api/auth/login` and `/api/auth/register` require JWT authentication.

**Header:**
```
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Database Schema

**Users** → Courses (as lecturer), Enrollments, Questions, Submissions

**Courses** → Enrollments, Exams, Questions

**Exams** → ExamQuestions, Submissions

**Questions** → ExamQuestions, SubmissionAnswers

**Enrollments** → Student + Course relationship

**Submissions** → Answers, ProctoringSession

---

## 🛠 Development

### Run migrations
```bash
npx prisma migrate dev --name <migration_name>
```

### Reset and seed database
```bash
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

### Prisma Studio (Database GUI)
```bash
npx prisma studio
```

---

## Example: Complete Exam Flow

### 1. Lecturer creates exam
```bash
# Login as lecturer
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lecturer@examtrust.edu","password":"123456"}' | jq -r '.accessToken')

# Create exam
curl -X POST http://localhost:3001/api/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Exam",
    "courseId": "<course-id>",
    "duration": 60,
    "totalPoints": 100
  }'

# Add questions
curl -X POST http://localhost:3001/api/exams/<exam-id>/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionIds": ["<question-id-1>", "<question-id-2>"]}'

# Publish
curl -X POST http://localhost:3001/api/exams/<exam-id>/publish \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Student takes exam
```bash
# Login as student
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@examtrust.edu","password":"123456"}' | jq -r '.accessToken')

# Start exam
curl -X POST http://localhost:3001/api/submissions/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"examId": "<exam-id>"}'

# Submit answers
curl -X POST http://localhost:3001/api/submissions/<submission-id>/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"questionId": "<q1-id>", "answer": {"answer": "A"}},
      {"questionId": "<q2-id>", "answer": {"answers": ["A","C"]}}
    ]
  }'
```

### 3. View results
```bash
curl http://localhost:3001/api/submissions/exam/<exam-id>/my-submission \
  -H "Authorization: Bearer $TOKEN"
```
