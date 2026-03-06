# Academic Trust Suite — Optimization Report

> Generated after full-project audit covering responsive design, API efficiency, and database optimization.

---

## 1. Responsive Design (Mobile — iPhone 12 Pro / 390px)

### 1.1 DashboardLayout (Global Layout)
**File:** `src/components/layout/DashboardLayout.tsx`

| Issue | Fix Applied |
|-------|------------|
| Sidebar fixed at 250px, no mobile toggle | Rewrote: mobile overlay sidebar (280px) with hamburger toggle, backdrop blur, slide-in animation |
| Topbar height/padding not responsive | `h-14 lg:h-16`, `px-4 lg:px-6` |
| Content padding too large on mobile | `p-4 lg:p-6 xl:p-8` |
| Body scroll while sidebar open | Added `useEffect` to toggle `overflow-hidden` on `<body>` |
| Sidebar doesn't close on route change | Added `useEffect` on `location.pathname` to auto-close |

### 1.2 Grid Breakpoints Fixed (16 pages)

| Page | Before | After |
|------|--------|-------|
| **QuestionBankManagement** | `grid-cols-4` | `grid-cols-2 md:grid-cols-4` |
| **QuestionEditor** | `grid-cols-2` (metadata) | `grid-cols-1 sm:grid-cols-2` |
| **UploadDocAIGen** | `grid-cols-3` | `grid-cols-1 md:grid-cols-3` |
| **QuestionHistoryAnalysis** | `grid-cols-3` | `grid-cols-1 md:grid-cols-3` |
| **GenerateExamLink** | `grid-cols-2`, `grid-cols-3` | `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3` |
| **CreateExam** | 5× `grid-cols-2`, `grid-cols-3` | `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| **UserRoleManagement** | `grid-cols-4` | `grid-cols-2 md:grid-cols-4` + table `overflow-x-auto` |
| **AuditLogViewer** | `grid-cols-4`, filter no wrap | `grid-cols-2 md:grid-cols-4`, added `flex-wrap` + table `overflow-x-auto` |
| **IntegrityOverview** | Table overflow | Added `overflow-x-auto` wrapper |
| **ExamTaking** | Fixed `w-60` sidebar, `ml-60` | Sidebar `hidden md:flex`, main `md:ml-60 ml-0`, `grid-cols-4 md:grid-cols-5` |
| **ExamReadyCheck** | `grid-cols-4` | `grid-cols-2 md:grid-cols-4` |
| **ExamEventTimeline** | `grid-cols-4` | `grid-cols-2 md:grid-cols-4` |
| **FeedbackDetail** | `grid-cols-4`, `grid-cols-3`, `col-span-2` | All prefixed with `md:`/`lg:` breakpoints |
| **GradingBreakdown** | `grid-cols-3` | `grid-cols-1 sm:grid-cols-3` + table `overflow-x-auto` |
| **OfflineExamDownload** | `grid-cols-3` | `grid-cols-1 sm:grid-cols-3` |

---

## 2. API Efficiency & Pagination

### 2.1 Problem
All `findMany()` calls in the backend returned **unbounded datasets** with zero `take`/`skip` parameters. As data grows, this causes:
- Excessive memory usage per request
- Slow JSON serialization of large arrays
- Frontend rendering bottlenecks

### 2.2 Changes Applied

#### Shared Pagination DTO
**File:** `backend/src/common/dto/pagination.dto.ts`
```typescript
// Accepts ?page=1&limit=20 query params
// Returns { data: T[], total, page, limit, totalPages }
```

#### Backend Services Updated

| Service | Method | Pagination Added |
|---------|--------|-----------------|
| `questions.service.ts` | `findAll()` | ✅ `skip`/`take` + `count()` |
| `users.service.ts` | `findAll()` | ✅ `skip`/`take` + `count()` |
| `exams.service.ts` | `findAll()` | ✅ `skip`/`take` + `count()` |
| `submissions.service.ts` | `findByExam()` | ✅ `skip`/`take` + `count()` |
| `submissions.service.ts` | `findAll()` | ✅ NEW — admin endpoint |

> **All use `Promise.all([findMany, count])` to run the data query and count query in parallel** — no extra round-trip.

#### Controllers Updated
All list endpoints now accept optional `?page=N&limit=N` query parameters:
- `GET /api/questions?page=1&limit=20`
- `GET /api/users?page=1&limit=20`
- `GET /api/exams?page=1&limit=20`
- `GET /api/submissions?page=1&limit=20` (NEW — admin only)
- `GET /api/submissions/exam/:examId?page=1&limit=20`

#### Frontend API Client Updated
**File:** `src/lib/api.ts`
- `getQuestions()` — accepts `page`, `limit` in filters
- `getUsers()` — accepts `page`, `limit` params
- `getExams()` — accepts `page`, `limit` in filters
- `getExamSubmissions()` — accepts `page`, `limit`
- `getSubmissions()` — NEW method for admin dashboard
- `unwrapPaginatedData()` — helper to safely extract array from paginated or raw responses

#### Frontend Pages with Pagination UI
- **QuestionBankManagement** — server-side pagination with page controls (Previous / page numbers / Next)
- **UserRoleManagement** — server-side pagination with page controls

#### Backward Compatibility
Pages that consume list APIs but don't need full pagination use `unwrapPaginatedData()` to safely handle both array and `{ data: [...] }` response formats:
- `LecturerDashboard.tsx`
- `AdminDashboard.tsx`
- `CourseManagement.tsx`
- `CreateCourse.tsx`
- `CourseDetail.tsx`
- `QuestionEditor.tsx`

### 2.3 Bug Fixed
**AdminDashboard.tsx** called `api.getSubmissions()` which didn't exist — caused runtime error. Added:
- Backend: `GET /api/submissions` endpoint (admin-only, paginated)
- Frontend: `api.getSubmissions()` method

---

## 3. Database Optimization

### 3.1 Indexes Added

**File:** `prisma/schema.prisma`

| Model | Index | Reason |
|-------|-------|--------|
| **Course** | `@@index([lecturerId])` | `findAll(lecturerId)`, `getMyCoursesAsLecturer()` filter by lecturer |
| **Enrollment** | `@@index([studentId])` | `findByStudent()` queries. Composite unique starts with `courseId`, so `studentId`-only queries were full scans |
| **Exam** | `@@index([courseId])` | `findAll({ courseId })`, student enrollment checks |
| **Exam** | `@@index([creatorId])` | `findAll({ creatorId })` — lecturer's exams |
| **Exam** | `@@index([status])` | `getAvailableExamsForStudent()` filters by `PUBLISHED`/`ONGOING` status |
| **Question** | `@@index([courseId])` | Filtering questions by course |
| **Question** | `@@index([creatorId])` | Filtering questions by creator (lecturer) |
| **SubmissionAnswer** | `@@index([questionId])` | JOIN queries on question relation |

> **Pre-existing indexes** that were already correct: `ExamSubmission.examId`, `ExamSubmission.studentId`, `ExamQuestion.examId`, `SubmissionAnswer.submissionId`, `IntegrityLog.proctoringId`, `ProctoringSession.submissionId` (unique).

### 3.2 Transactions Added

| Service | Method | What Changed |
|---------|--------|-------------|
| `submissions.service.ts` | `submitExam()` | Wrapped all `submissionAnswer.create()` calls + final `examSubmission.update()` in `prisma.$transaction()`. **Before:** a crash mid-loop left partial answers without updating submission status. |
| `submissions.service.ts` | `finalizeGrading()` | Wrapped score calculation read + status update in `prisma.$transaction()`. **Before:** concurrent grade calls could read stale answer scores. |
| `exams.service.ts` | `create()` | Wrapped exam creation + `examQuestion.create()` loop in `prisma.$transaction()`. **Before:** question attachment failure left an orphaned exam record. |

### 3.3 Why NOT Transactional

| Method | Reason |
|--------|--------|
| `bulkEnroll()` | **Partial success is intended** — some students may fail (already enrolled, not found) while others succeed. A transaction would make it all-or-nothing. |
| `bulkEnrollByEmails()` | Same as above — partial success with per-email error reporting. |

### 3.4 Migration Required

After pulling these changes, run:
```bash
cd backend
npx prisma migrate dev --name add_indexes
npx prisma generate
```

This will create the new indexes without altering any data or columns.

---

## 4. Summary of All Files Modified

### Backend
| File | Changes |
|------|---------|
| `backend/src/common/dto/pagination.dto.ts` | **NEW** — shared PaginationDto + buildPaginatedResult helper |
| `backend/src/questions/questions.service.ts` | Pagination support in `findAll()` |
| `backend/src/questions/questions.controller.ts` | Added `page`, `limit` query params |
| `backend/src/users/users.service.ts` | Pagination support in `findAll()` |
| `backend/src/users/users.controller.ts` | Added `page`, `limit` query params |
| `backend/src/exams/exams.service.ts` | Pagination in `findAll()`, transaction in `create()` |
| `backend/src/exams/exams.controller.ts` | Added `page`, `limit` query params |
| `backend/src/submissions/submissions.service.ts` | Pagination in `findByExam()`, new `findAll()`, transactions in `submitExam()` and `finalizeGrading()` |
| `backend/src/submissions/submissions.controller.ts` | New `GET /submissions` endpoint, `page`/`limit` params on `findByExam` |
| `backend/src/courses/courses.controller.ts` | Added `Query` import for future pagination |
| `prisma/schema.prisma` | 8 new indexes across 5 models |

### Frontend
| File | Changes |
|------|---------|
| `src/lib/api.ts` | Pagination params on `getQuestions`, `getUsers`, `getExams`, `getExamSubmissions`; new `getSubmissions()` method; `unwrapPaginatedData()` utility |
| `src/components/layout/DashboardLayout.tsx` | Complete mobile responsive rewrite |
| `src/pages/lecturer/QuestionBankManagement.tsx` | Server-side pagination + pagination UI controls |
| `src/pages/admin/UserRoleManagement.tsx` | Server-side pagination + pagination UI controls |
| `src/pages/lecturer/QuestionEditor.tsx` | `unwrapPaginatedData` + responsive grid |
| `src/pages/lecturer/LecturerDashboard.tsx` | `unwrapPaginatedData` for list APIs |
| `src/pages/lecturer/CreateCourse.tsx` | `unwrapPaginatedData` for courses |
| `src/pages/lecturer/CourseManagement.tsx` | `unwrapPaginatedData` for courses |
| `src/pages/lecturer/CourseDetail.tsx` | `unwrapPaginatedData` for courses |
| `src/pages/admin/AdminDashboard.tsx` | `unwrapPaginatedData` + fixed `getSubmissions()` bug |
| 13 additional pages | Responsive grid breakpoint fixes (see Section 1.2) |
