# System Architecture Detailed - Academic Trust Suite

Tai lieu nay mo ta kien truc hien tai cua Academic Trust Suite theo huong production-oriented MVP. Muc tieu la giu dung tinh than thiet ke ban dau: sinh de rieng cho tung sinh vien, cau hoi co phien ban, snapshot bat bien, cham diem co audit, integrity tracking va kha nang mo rong analytics.

## 1. Tong quan kien truc

He thong gom cac lop chinh:

- Frontend: React, Vite, TypeScript, Tailwind/shadcn-style UI.
- Backend API: NestJS, Prisma ORM, JWT authentication, role-based access.
- Database: relational database voi UUID-based entities.
- Queue/worker: Bull/Redis cho tac vu bat dong bo nhu AI generation, notification, analytics va xu ly nen.
- Cache/rate limit: Redis va guard o backend de giam spam request.
- AI integration: provider-based service cho question generation, co co che review truoc khi dua vao ngan hang cau hoi.

```text
Browser
  -> React Student/Lecturer/Admin UI
  -> NestJS REST API
  -> Prisma
  -> Relational Database

NestJS
  -> Redis/Bull queues
  -> Worker processes
  -> AI providers
```

## 2. Nguyen tac thiet ke

- Migration-safe: khong drop/recreate schema khi co the ALTER/backfill.
- Backward compatible: giu seeded data va ID hien co.
- Historical correctness: bai thi cu phai xem lai dung noi dung tai thoi diem lam bai.
- One ExamInstance per student per exam.
- Exam payload immutable sau khi sinh vien bat dau.
- QuestionVersion la nguon su that cho noi dung cau hoi theo thoi gian.
- Integrity system chi ghi nhan va flag, khong tu dong ket luan cheating.
- Cham diem va cong bo ket qua phai co trang thai ro rang.

## 3. Module backend chinh

### Auth va Users

- Xac thuc bang JWT.
- Phan quyen theo vai tro student, lecturer, admin.
- Bao ve API theo role va ownership cua tai nguyen.

### Courses va Enrollment

- Quan ly course.
- Lien ket sinh vien voi course.
- La lop kiem tra quyen truy cap exam cua sinh vien.

### Questions V2

- Quan ly Question va QuestionVersion.
- Ho tro draft workflow va AI-assisted question generation.
- Noi dung cau hoi lich su khong nen bi ghi de.
- Exam nen dung version/snapshot thay vi doc Question hien tai khi sinh vien lam bai.

### Exams

- Quan ly Exam, ExamQuestion, lich thi, trang thai va cau hinh attempt.
- ExamQuestion la noi luu diem/trong so cua cau hoi trong mot de cu the.
- ExamSnapshot/QuestionSnapshot dong bang cau truc de thi de phuc vu audit va xem lai.

### Submissions

- Khoi tao bai lam, autosave, submit, tinh diem tu dong.
- Quan ly SubmissionAnswer cho tung cau.
- Cham tay cau subjective bang diem va feedback.
- Cong bo ket qua sau khi tat ca cau can cham tay da hoan thanh.

### Integrity

- Tao ProctoringSession khi sinh vien lam bai.
- Ghi IntegrityLog cho cac su kien nhu tab switch, focus change, network/client event.
- Cung cap event stream cho giang vien theo doi trong exam.

### Notifications, Events va Queues

- Notification gui thong tin den nguoi dung trong he thong.
- EventStore luu su kien co gia tri audit/async processing.
- Queue dung cho xu ly nen, giam tai API request path.

## 4. Data architecture

### Question versioning

Question giu dinh danh on dinh. QuestionVersion giu noi dung va dap an theo tung phien ban.

Khi sua cau hoi:

1. Tao QuestionVersion moi.
2. Khong ghi de version cu.
3. Exam da cong bo hoac da co submission tiep tuc tham chieu version/snapshot cu.

### Exam composition

Exam luu thong tin chung. ExamQuestion gan cau hoi vao de va luu diem cua cau trong de.

Dinh huong dung:

- `ExamQuestion.questionVersionId` la tham chieu chinh ve version duoc dung trong de.
- `ExamQuestion.questionId` neu con ton tai chi nen la compatibility field trong giai doan migration.
- Backfill questionVersionId phai thuc hien an toan dua tren seeded data hien co.

### Exam snapshot

ExamSnapshot va QuestionSnapshot giup dong bang:

- Thu tu cau hoi.
- Noi dung cau hoi.
- Dap an/lua chon can thiet cho cham diem.
- Cau hinh diem tai thoi diem thi.

Snapshot la co so de xem lai va cham bai chinh xac sau khi ngan hang cau hoi thay doi.

### ExamInstance

ExamInstance dai dien cho de thi rieng cua mot sinh vien trong mot exam.

Nguyen tac:

- Unique theo examId + studentId.
- Luu randomized payload hoac lien ket den payload snapshot da tao.
- Trang thai rieng voi submission de phan biet de thi cua sinh vien va tung lan nop.

### Submission va answer

ExamSubmission dai dien cho mot attempt. SubmissionAnswer dai dien cho cau tra loi tung cau.

Cac truong quan trong:

- answer payload cua sinh vien.
- pointsAwarded.
- feedback.
- metadata/autosave sequence neu co.
- trang thai submission.

## 5. Runtime flows

### 5.1. Publish exam

1. Lecturer tao/cap nhat Exam va ExamQuestion.
2. He thong validate cau hoi va cau hinh diem.
3. Khi publish, exam chuyen sang PUBLISHED.
4. He thong tao hoac cap nhat snapshot phu hop voi quy tac an toan.

### 5.2. Start exam

1. Student goi API start submission.
2. Backend validate auth, enrollment, exam status, schedule va attempt limit.
3. Backend tao/tai su dung ExamInstance.
4. Backend tao ExamSubmission IN_PROGRESS.
5. Backend tao ProctoringSession.
6. Frontend hien thi de thi tu snapshot/payload tuong ung.

### 5.3. Autosave

1. Frontend gui cau tra loi hien tai.
2. Backend upsert SubmissionAnswer.
3. Backend cap nhat sequence/serverVersion neu co.
4. Request lap lai khong duoc lam mat du lieu moi hon.

### 5.4. Submit

1. Backend doi submission tu IN_PROGRESS sang SUBMITTING.
2. Backend ghi final answers.
3. Objective questions duoc cham tu dong.
4. Neu khong co cau can cham tay, submission thanh GRADED.
5. Neu co cau can cham tay, submission thanh SUBMITTED va cho lecturer cham.
6. Integrity/session data duoc dong hoac cap nhat theo trang thai nop bai.

### 5.5. Manual grading

Luồng hiện tại cần đảm bảo:

1. Lecturer xem danh sach submission cua exam.
2. Neu exam co cau can cham tay, UI hien progress manual grading.
3. Lecturer vao tung submission va cham cac cau subjective.
4. API validate diem khong vuot qua diem toi da.
5. Feedback duoc luu tren SubmissionAnswer.
6. Nut Publish Results chi enable khi tat ca cau can cham tay cua tat ca submission da co diem.
7. Khi publish, backend tinh lai score va cap nhat submission thanh GRADED.

Endpoint lien quan:

- `GET /submissions/exam/:examId/manual-grading-status`
- `GET /submissions/:id/manual-grading`
- `POST /submissions/:id/grade-answer`
- `POST /submissions/exam/:examId/publish-results`

### 5.6. Student result

- Student xem danh sach result cua minh.
- Nut View Result chi nen mo khi submission da duoc cham/cong bo.
- Neu submission dang SUBMITTED va con cho cham tay, UI hien trang thai cho diem.
- Student khong xem grading history noi bo.

## 6. API surface quan trong

Mot so API nghiep vu can duoc giu on dinh:

- `POST /submissions/start`
- `POST /submissions/:id/autosave`
- `POST /submissions/:id/submit`
- `GET /submissions/:id`
- `GET /submissions/exam/:examId`
- `GET /submissions/exam/:examId/overview`
- `GET /submissions/exam/:examId/events`
- `GET /submissions/exam/:examId/manual-grading-status`
- `GET /submissions/:id/manual-grading`
- `POST /submissions/:id/grade-answer`
- `POST /submissions/exam/:examId/publish-results`

## 7. Integrity architecture

Integrity tracking gom 3 lop:

### Client events

Frontend ghi nhan cac hanh vi nhu:

- focus/blur.
- tab switch.
- visibility change.
- suspicious interaction event.
- network/offline event neu co.

### Server records

Backend luu:

- ProctoringSession cho phien lam bai.
- IntegrityLog cho tung su kien.
- flags/counters de lecturer xem tong quan.

### Review

Lecturer xem su kien va quyet dinh xu ly. He thong khong tu dong ket luan sinh vien gian lan.

## 8. AI-assisted question generation

AI module phuc vu tao cau hoi co kiem duyet:

1. Lecturer gui yeu cau tao cau hoi.
2. Backend tao AIGenerationRecord/QuestionDraft.
3. Worker hoac service goi AI provider.
4. Ket qua duoc luu thanh draft.
5. Lecturer review, sua va chap nhan.
6. Khi chap nhan, he thong tao Question/QuestionVersion tu draft.

AI chi ho tro bien soan. Quyet dinh hoc thuat cuoi cung van thuoc ve giang vien.

## 9. Status va consistency notes

### Submission status

Schema hien co co cac gia tri:

- IN_PROGRESS
- SUBMITTING
- SUBMITTED
- GRADE_PENDING
- GRADED
- FLAGGED
- SUBMIT_FAILED

Luong hien tai dang dung SUBMITTED cho submission da nop va cho cham tay. GRADE_PENDING co the duoc su dung trong migration/iteration tiep theo neu muon tach ro trang thai cho cham.

### Publish result

Ket qua duoc xem la san sang cho sinh vien khi submission o trang thai GRADED va luong nghiep vu cua exam da cho phep cong bo.

Neu can them trang thai `FINALIZED` trong tuong lai, phai bo sung enum/migration an toan thay vi chi dung chuoi rời trong UI.

## 10. Scalability va production readiness

### Indexing

Can uu tien index/unique constraint cho:

- examId + studentId tren ExamInstance.
- submissionId + questionId/questionVersionId tren SubmissionAnswer.
- examId + studentId + attemptNo tren ExamSubmission neu co.
- courseId/studentId tren Enrollment.
- createdAt/status cho EventStore, Notification, AI jobs.

### Idempotency

Nhung flow can idempotent:

- start exam.
- autosave.
- submit.
- publish results.
- AI job enqueue.

### Queue/backpressure

Tac vu nen khong nen nam trong request path dai:

- AI generation.
- analytics aggregation.
- notification fan-out.
- heavy integrity analysis.

### Auditability

Nen log cac hanh dong quan trong:

- publish exam.
- start/submit exam.
- manual grading/regrading.
- publish results.
- integrity flags.
- AI accept/reject.

## 11. Migration strategy

Khi nang cap schema:

1. Them cot moi nullable truoc.
2. Backfill tu du lieu hien co.
3. Them foreign key/index/unique constraint sau khi du lieu sach.
4. Cap nhat code de doc cot moi.
5. Chi khi chac chan moi enforce NOT NULL.
6. Khong drop cot cu ngay neu UI/API con phu thuoc.

Vi du voi `exam_questions.questionVersionId`:

1. Them `questionVersionId` nullable.
2. Backfill bang latest/published QuestionVersion phu hop voi questionId.
3. Cap nhat code tao exam de ghi questionVersionId.
4. Cap nhat snapshot/submission de doc version.
5. Them FK va index.
6. Sau khi on dinh moi giam phu thuoc vao questionId.

## 12. Acceptance checklist

He thong duoc xem la dung luong khi:

- Auto-only exam nop xong thanh GRADED va student xem duoc result.
- Exam co cau subjective nop xong khong cong bo diem ngay cho student.
- Lecturer thay progress manual grading tren danh sach submission.
- Lecturer cham tung cau voi score va feedback.
- He thong chan score vuot max points.
- Nut Publish Results bi disable khi con cau chua cham.
- Publish xong submission thanh GRADED va student xem duoc ket qua.
- Grading history/audit noi bo khong hien cho student.
- Integrity events duoc ghi nhan nhung khong tu dong ket luan cheating.
- Seeded data va demo flow hien co van hoat dong sau migration.
