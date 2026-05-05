# Redis trong dự án

Có. Redis không phải cấu hình thừa, mà là một phần hạ tầng backend đang được dùng thật trong dự án này.

Nói đơn giản, Redis đang được dùng để làm 4 việc chính:

1. Tăng tốc đọc dữ liệu bằng cache.
2. Chặn request quá dày bằng rate limit.
3. Gửi và nhận event realtime qua pub/sub.
4. Chạy các job nền thông qua queue.

## 1. Redis dùng để làm gì

### Cache dữ liệu

Redis lưu tạm một số dữ liệu hay được đọc lặp lại để backend không phải query database liên tục.

Trong dự án này, phần cache đang áp dụng cho:

- exam dành cho sinh viên
- danh sách câu hỏi
- answers của submission

Mục đích là giảm tải database và làm response nhanh hơn.

### Rate limiting

Redis cũng được dùng để giới hạn tần suất request.

Service `RateLimiterService` đang dùng token-bucket algorithm lưu trạng thái trong Redis. Cách này giúp tránh spam request hoặc thao tác quá nhanh. Nếu Redis gặp lỗi, hệ thống đang chọn hướng fail-open, tức là vẫn cho request đi tiếp để không làm gián đoạn sinh viên.

### Realtime pub/sub

Redis pub/sub được dùng để phát event giữa các phần của hệ thống.

Ví dụ:

- event của exam
- notification theo role
- các luồng realtime khác như proctoring hoặc cập nhật trạng thái

Mô hình này hữu ích khi backend chạy nhiều instance, vì event không phụ thuộc vào bộ nhớ local của một process riêng lẻ.

### Queue / jobs

Redis còn là backend cho `BullModule`.

Điều đó có nghĩa các công việc không cần xử lý ngay lập tức sẽ được đẩy vào queue, ví dụ:

- integrity logs
- notifications
- grading
- events

Nhờ vậy, các tác vụ nặng có thể chạy nền thay vì chặn request chính.

## 2. Redis được cấu hình ở đâu

Redis được khởi tạo tập trung tại:

- `backend/src/redis/redis.module.ts`

File này đọc các biến môi trường sau:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

Giá trị mặc định hiện tại là:

- host: `localhost`
- port: `6379`

## 3. Các file đang dùng Redis

- `backend/src/redis/redis.module.ts` - cấu hình Redis module dùng chung cho toàn backend
- `backend/src/cache/cache.service.ts` - cache exam, question, submission
- `backend/src/common/rate-limiter.service.ts` - giới hạn request bằng Redis
- `backend/src/events/distributed-events.service.ts` - pub/sub realtime
- `backend/src/queue/queue.module.ts` - cấu hình Bull queue chạy trên Redis
- `backend/src/app.module.ts` - import các module liên quan để Redis sẵn sàng cho toàn hệ thống

## 4. Kết luận

Redis trong dự án này đang đóng vai trò hạ tầng cho backend, không phải chỉ để cấu hình cho có.

Nếu bỏ Redis đi, các phần sau sẽ bị ảnh hưởng:

- cache sẽ mất
- rate limit sẽ mất hoặc phải thay cơ chế khác
- realtime event sẽ yếu đi hoặc phải đổi kiến trúc
- queue job sẽ không chạy theo cách hiện tại

Tóm lại, Redis là một phần quan trọng của backend hiện tại.
