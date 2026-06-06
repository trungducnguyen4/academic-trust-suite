# Deploy Checklist Từng Bước

Tài liệu này là checklist thực hành để deploy dự án theo cấu hình hiện tại.

## Mục tiêu

- Frontend trên Cloudflare Pages
- Backend trên Oracle Always Free
- AI worker chạy riêng
- Redis và Ollama private

## 1) Chuẩn bị tài khoản

### Việc cần làm

- Tạo tài khoản Cloudflare
- Tạo tài khoản Oracle Cloud
- Chuẩn bị repo GitHub đã có code

### Kiểm tra xong khi nào?

- Bạn đăng nhập được Cloudflare
- Bạn đăng nhập được Oracle
- Repo đã push lên GitHub

## 2) Chuẩn bị file env

### Frontend local

Copy file mẫu:

```bash
cp .env.local.example .env.local
```

Nội dung chính:

- `VITE_API_BASE_URL=http://localhost:3001/api`

### Frontend production

```bash
cp .env.production.example .env.production
```

Sửa thành domain thật:

- `VITE_API_BASE_URL=https://api.example.com/api`

### Backend local

```bash
cp backend/.env.example backend/.env
```

### Backend production

```bash
cp backend/.env.production.example backend/.env
```

Sửa các giá trị:

- `FRONTEND_URL=https://app.example.com`
- `APP_BASE_URL=https://app.example.com`
- `CORS_ORIGINS=https://app.example.com`
- `DATABASE_URL=...`
- `JWT_SECRET=...`

## 3) Test local trước

### Cài dependency

```bash
npm install
cd backend
npm install
```

### Build local

```bash
npm run build
cd backend
npm run build
```

### Kiểm tra xong khi nào?

- Frontend build ra `dist`
- Backend build không lỗi

## 4) Chạy local

### Backend

```bash
cd backend
npm run start:dev
```

### Frontend

```bash
npm run dev
```

### Kiểm tra xong khi nào?

- Mở được frontend trên `http://localhost:5173`
- API gọi về `http://localhost:3001/api`
- Login hoạt động
- Exam start, autosave, submit hoạt động

## 5) Deploy frontend lên Cloudflare Pages

### Cấu hình chính

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: thư mục gốc repo

### Biến môi trường

Đặt:

```bash
VITE_API_BASE_URL=https://api.example.com/api
```

### Kiểm tra xong khi nào?

- Site mở được trên `*.pages.dev`
- Frontend không còn gọi `localhost`

## 6) Tạo Oracle VM

### Việc cần làm

- Tạo Oracle Always Free VM
- Cài Docker và Docker Compose
- Mở port cần thiết cho web/app

### Kiểm tra xong khi nào?

- SSH vào VM được
- `docker --version` chạy được
- `docker compose version` chạy được

## 7) Deploy backend + worker + Redis + Ollama

### Cách chạy

Trên VM, dùng file compose deploy:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

### Dịch vụ cần chạy

- `backend`
- `ai-worker`
- `redis`
- `ollama`

### Kiểm tra xong khi nào?

- Backend lên được
- Worker lên được
- Redis chạy private
- Ollama chạy private

## 8) Pull model AI

### Chạy trên VM

```bash
docker compose exec ollama ollama pull gemma3:4b
```

### Kiểm tra xong khi nào?

- Model đã có trong Ollama
- AI generation không báo thiếu model

## 9) Cập nhật env production

Sửa các giá trị:

- `FRONTEND_URL`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `AI_PROVIDER=ollama`
- `AI_OLLAMA_URL=http://ollama:11434`

### Kiểm tra xong khi nào?

- Frontend gửi request sang đúng backend public
- Backend tạo đúng link mời thi
- CORS không chặn frontend thật

## 10) Test chức năng chính

### Test login

- Login bằng tài khoản demo hoặc tài khoản thật
- Kiểm tra token lưu đúng

### Test exam

- Mở exam
- Start submission
- Autosave đáp án
- Submit bài thi

### Test AI

- Tạo câu hỏi bằng AI
- Kiểm tra job vào queue
- Kiểm tra `ai-worker` xử lý xong

### Kiểm tra xong khi nào?

- API không treo khi AI chạy
- Kết quả AI quay về database
- Frontend hiển thị được trạng thái job

## 11) Checklist lỗi thường gặp

### Frontend vẫn gọi localhost

- Kiểm tra `VITE_API_BASE_URL`
- Build lại frontend
- Deploy lại Cloudflare Pages

### Link email hoặc link exam sai domain

- Kiểm tra `FRONTEND_URL`
- Kiểm tra `APP_BASE_URL`

### CORS bị chặn

- Kiểm tra `CORS_ORIGINS`
- Đảm bảo domain production đã được thêm vào

### AI job bị nghẽn

- Kiểm tra `ai-worker` có chạy không
- Kiểm tra Ollama có private network đúng không
- Giữ concurrency của AI worker ở mức 1

### Redis/Ollama bị public

- Không map port public ra internet
- Chỉ để backend và worker gọi nội bộ

## 12) Trạng thái deploy thành công

Bạn có thể xem là deploy xong khi:

- Frontend mở được trên Cloudflare Pages
- Backend chạy trên Oracle VM
- AI worker chạy riêng
- Redis và Ollama private
- Login, exam, autosave, submit, AI đều hoạt động

