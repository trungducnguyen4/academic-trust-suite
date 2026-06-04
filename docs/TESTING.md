# Hướng dẫn Testing — Manual & Integration (Main Flow)

## Mục lục
- Giới thiệu
- Môi trường & chuẩn bị
- Chạy nhanh các lệnh test
- Manual testing (Main flow và các trường hợp cạnh)
- Integration / E2E testing (phạm vi, ví dụ, curl)
- Dữ liệu test & seed
- Checklist kiểm thử
- Báo lỗi

## 1. Giới thiệu
Tài liệu này mô tả cách thực hiện kiểm thử thủ công (manual) và kiểm thử tích hợp (integration / E2E) cho dự án `academic-trust-suite`, tập trung vào "main flow" người dùng: đăng nhập → chọn khóa/học phần → đăng ký → thi → nộp bài → xem kết quả.

## 2. Môi trường & chuẩn bị
- Frontend: chạy local bằng `npm run dev` (hoặc `pnpm dev` / `yarn dev`).
- Backend: vào thư mục `backend/` và chạy server (ví dụ `npm run start:dev`).
- Database: dùng môi trường dev (SQLite/Postgres tuỳ cấu hình). Nếu cần dữ liệu mẫu, xem `prisma/seed.ts`.
- Các biến môi trường quan trọng: `DATABASE_URL`, `JWT_SECRET`, `MAIL_*`.

## 3. Chạy nhanh các lệnh test
- Chạy unit/integration tests (frontend):

```bash
npm run test
# hoặc
pnpm test
# hoặc
yarn test
```

- Chạy dev servers (frontend + backend):

```bash
# frontend
npm run dev
# backend
cd backend && npm run start:dev
```

- Nếu dùng Cypress/Playwright cho E2E, tham khảo script tương ứng trong `package.json`.

## 4. Manual testing
Mục tiêu: xác thực main flow hoạt động như mong đợi cho người dùng chuẩn.

### 4.1 Thiết lập
- Khởi động frontend và backend.
- Nếu cần, khởi tạo dữ liệu mẫu: chạy `node prisma/seed.ts` hoặc script seed tương ứng.
- Mở trình duyệt vào `http://localhost:5173` (hoặc port dev frontend).

### 4.2 Main Flow — Test case chính
Mỗi test case gồm: Mô tả ngắn → Các bước thực hiện → Kết quả mong đợi.

Test 1 — Đăng ký tài khoản (nếu áp dụng)
- Bước:
  1. Mở trang Đăng ký
  2. Nhập tên, email hợp lệ, mật khẩu
  3. Submit
- Kỳ vọng: nhận email xác thực (nếu áp dụng) hoặc thấy thông báo tạo tài khoản thành công, user được redirect đến trang dashboard.

Test 2 — Đăng nhập
- Bước:
  1. Mở trang Đăng nhập
  2. Nhập email và mật khẩu hợp lệ
  3. Submit
- Kỳ vọng: đăng nhập thành công, xem được dashboard với danh sách khóa học.

Test 3 — Chọn khóa & đăng ký
- Bước:
  1. Từ dashboard, chọn một khóa học có sẵn
  2. Click `Enroll` / `Register`
- Kỳ vọng: API trả về success, giao diện hiển thị status "Enrolled" và khóa xuất hiện trong danh sách "My courses".

Test 4 — Bắt đầu làm bài thi
- Bước:
  1. Mở phần thi của khóa đã đăng ký
  2. Bắt đầu exam, trả lời các câu hỏi, nhấn `Submit`
- Kỳ vọng: khi nộp bài, backend nhận dữ liệu đáp án, lưu submission. Giao diện hiển thị trang kết quả với điểm và phân tích (nếu có).

Test 5 — Xem lịch sử & kết quả
- Bước: Vào trang lịch sử thi / submissions
- Kỳ vọng: hiển thị tất cả submissions với ngày, thời gian, điểm.

### 4.3 Test case cạnh (edge cases)
- Thử nộp bài khi mất kết nối mạng: UI cần thông báo lỗi và retry.
- Nộp đáp án rỗng / invalid payload: backend trả lỗi hợp lệ (4xx).
- Truy cập exam khi chưa đăng ký: được redirect/blocked.
- Token hết hạn: redirect tới trang đăng nhập.

## 5. Integration / E2E testing
Mục tiêu: tự động hoá các kịch bản end-to-end cho main flow.

### 5.1 Phạm vi
- Đăng nhập / đăng ký
- Đăng ký khóa học
- Bắt đầu exam -> nộp -> kiểm tra submission và kết quả
- APIs liên quan: `/auth/login`, `/courses`, `/enrollments`, `/exams`, `/submissions` (tên endpoint tham khảo, kiểm tra trong `backend/src`)

### 5.2 Công cụ gợi ý
- Frontend e2e: Playwright hoặc Cypress (Playwright tích hợp tốt với Vite + Vitest).
- Backend API tests: Supertest + Vitest / Jest, hoặc Postman Collections.

### 5.3 Ví dụ curl (smoke API checks)
Đăng nhập (ví dụ):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Lấy danh sách courses:

```bash
curl http://localhost:3000/courses -H "Authorization: Bearer <token>"
```

Tạo submission (ví dụ):

```bash
curl -X POST http://localhost:3000/exams/123/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"answers":[{"questionId":1,"answer":"A"}]}'
```

### 5.4 Kịch bản E2E ví dụ (Playwright)
1. Khởi tạo môi trường test (seed dữ liệu). 
2. Chạy Playwright script: đăng nhập bằng tài khoản test, enroll khóa, bắt đầu exam, submit, assert kết quả xuất hiện.

## 6. Dữ liệu test & seed
- Xem `prisma/seed.ts` và `prisma/seed_demo.ts` để biết các script seed hiện có.
- Nếu cần seed nhanh: `node prisma/seed.ts` (hoặc `npm run prisma:seed` nếu có script trong `package.json`).
- Sau khi test, xóa dữ liệu test hoặc reset DB tuỳ môi trường.

## 7. Checklist kiểm thử (Acceptance)
- [ ] Người dùng đăng nhập/đăng ký thành công
- [ ] Người dùng có thể enroll vào course
- [ ] Người dùng có thể bắt đầu và nộp exam
- [ ] Submission được lưu ở backend
- [ ] Kết quả hiển thị chính xác sau submit
- [ ] Các lỗi biên (401/403/4xx) được xử lý hiển thị thân thiện
- [ ] E2E smoke test chạy thành công trong CI (nếu có)

## 8. Báo lỗi
Khi phát hiện bug, tạo issue với thông tin:
- Mô tả ngắn gọn
- Các bước tái tạo (repro steps)
- Môi trường (frontend url, backend url, DB)
- Logs / Network captures / Screenshot
- Priority / ảnh hưởng (blocker / high / medium / low)

## 9. Ghi chú thêm
- Tùy repo hiện có, hãy kiểm tra `package.json` (root và `backend/package.json`) để biết các script test và seed chính xác.
- Nếu muốn, mình có thể tạo các test skeleton (Playwright + Vitest) hoặc một Postman collection mẫu.

---
Tạo bởi GitHub Copilot — cần mình thêm test scripts tự động không?