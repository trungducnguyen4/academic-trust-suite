# Deploy Cloud Cho Người Mới

Tài liệu này giải thích cách deploy dự án theo cách dễ hiểu nhất:

- Frontend lên Cloudflare Pages
- Backend lên Oracle Always Free
- AI worker chạy riêng khỏi API
- Redis và Ollama để private, không public ra internet

Mục tiêu là để bạn có thể chạy production mà không cần nhiều kinh nghiệm hosting.

## 1) Dự án này đang chạy theo kiểu nào?

Project của bạn không phải app chỉ có 1 server đơn giản. Nó có nhiều phần:

- **Frontend**: giao diện web React
- **Backend**: API NestJS xử lý đăng nhập, exam, autosave, submit
- **AI worker**: tiến trình riêng để xử lý job AI trong background
- **Redis**: hàng đợi job và cache
- **Ollama**: nơi chạy model AI local

Điểm quan trọng:

- AI không chạy trực tiếp trong request của user
- Job AI được đẩy vào queue
- `ai-worker` lấy job sau, nên API không bị nghẽn

## 2) Vì sao frontend để ở Cloudflare Pages?

Frontend là phần giao diện.

Cloudflare Pages phù hợp vì:

- miễn phí
- deploy nhanh
- build ra file tĩnh nên rất nhẹ
- có domain miễn phí dạng `*.pages.dev`

Bạn chỉ cần:

- build frontend bằng Vite
- upload source vào Cloudflare Pages
- đặt `VITE_API_BASE_URL` trỏ tới backend thật

Ví dụ:

```bash
VITE_API_BASE_URL=https://api.example.com/api
```

## 3) Vì sao backend để ở Oracle Always Free?

Backend cần một máy chạy liên tục để:

- nhận request từ frontend
- làm việc với MySQL
- nói chuyện với Redis
- xử lý auth, exam, autosave, submit

Oracle Always Free hợp với dự án này vì:

- có VM miễn phí
- chạy Docker được
- đủ để host backend + worker + Redis + Ollama ở mức demo/thesis

## 4) AI worker là gì?

`ai-worker` là một tiến trình riêng.

Nó không nhận request từ trình duyệt.
Nó chỉ:

- lấy job từ Redis queue
- gọi Ollama
- ghi kết quả về database

Lợi ích:

- API vẫn phản hồi nhanh
- nếu AI chậm thì chỉ job AI bị chậm
- exam flow không bị treo

## 5) Redis và Ollama vì sao phải private?

### Redis

Redis dùng cho:

- queue
- cache
- rate limiting

Redis không cần public.
Nếu public thì dễ bị lộ dữ liệu hoặc bị spam job.

### Ollama

Ollama là nơi chạy model AI local.

Không nên public vì:

- tốn tài nguyên
- dễ bị người ngoài gọi làm quá tải
- không cần thiết, vì backend và worker đã đủ để gọi nó nội bộ

## 6) Luồng chạy thực tế

Ví dụ một job AI:

1. Lecturer yêu cầu sinh câu hỏi AI
2. Backend tạo record job
3. Backend đẩy job vào Redis queue
4. `ai-worker` lấy job
5. `ai-worker` gọi Ollama
6. Kết quả lưu về database
7. Frontend polling hoặc nhận trạng thái job

Ví dụ một bài thi:

1. Student mở exam từ frontend
2. Frontend gọi backend
3. Backend tạo submission
4. Student autosave đáp án
5. Khi submit, backend ghi dữ liệu chính và đẩy job phụ sang queue
6. Worker xử lý hậu kỳ

## 7) Vì sao kiến trúc này hợp với project của bạn?

Dự án của bạn cần:

- exam theo từng student
- snapshot immutable
- integrity tracking
- AI sinh câu hỏi nhưng có review
- analytics
- offline support

Kiến trúc này tốt vì:

- API luôn gọn và ổn định
- AI được tách riêng nên không làm chậm luồng thi
- Redis giúp xử lý job nền
- Cloudflare Pages giảm chi phí frontend
- Oracle Always Free đủ tốt cho phần backend/worker/demo

## 8) Những biến môi trường quan trọng

Frontend:

- `VITE_API_BASE_URL`

Backend:

- `FRONTEND_URL`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `AI_PROVIDER`
- `AI_OLLAMA_URL`
- `AI_OLLAMA_MODEL`

Ví dụ local:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:5173
APP_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

Ví dụ production:

```bash
VITE_API_BASE_URL=https://api.example.com/api
FRONTEND_URL=https://app.example.com
APP_BASE_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
```

## 9) Checklist suy nghĩ trước khi deploy

- Frontend đã build được chưa?
- Backend đã build được chưa?
- API base trong frontend đã trỏ đúng chưa?
- CORS đã cho phép đúng domain chưa?
- Redis và Ollama đã để private chưa?
- `ai-worker` có chạy riêng chưa?

Nếu câu trả lời là “có” cho tất cả, bạn đã sẵn sàng deploy.

