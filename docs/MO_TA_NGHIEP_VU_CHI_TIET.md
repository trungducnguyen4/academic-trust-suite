# Mô Tả Nghiệp Vụ Chi Tiết Dự Án Academic Trust Suite

## 1. Tổng quan dự án

### 1.1 Tên hệ thống
Academic Trust Suite (ExamTrust) là nền tảng tổ chức thi, kiểm tra học thuật có hỗ trợ AI, giám sát tính liêm chính học thuật, tự động hóa chấm điểm và phân tích chất lượng đề.

### 1.2 Bài toán nghiệp vụ
Các đơn vị đào tạo thường gặp các vấn đề:
- Quy trình thi phân tán, thiếu chuẩn hóa giữa tạo đề, tổ chức thi, chấm điểm và công bố kết quả.
- Rủi ro gian lận cao trong thi trực tuyến (chuyển tab, sao chép, nhiều bất thường thao tác).
- Độ trễ phản hồi cao khi số lượng sinh viên làm bài lớn cùng lúc.
- Thiếu cơ chế lưu tạm an toàn khi mất mạng hoặc thoát trình duyệt.
- Thiếu dữ liệu phân tích để cải thiện ngân hàng câu hỏi và độ tin cậy đề thi.

### 1.3 Mục tiêu nghiệp vụ
- Chuẩn hóa vòng đời thi cử số từ khâu chuẩn bị đến hậu kiểm.
- Nâng cao độ tin cậy kết quả thi thông qua giám sát liêm chính và kiểm soát truy cập.
- Đảm bảo khả năng chịu tải cao trong các đợt thi đồng thời.
- Đảm bảo không mất dữ liệu bài làm nhờ autosave và đồng bộ khi mạng phục hồi.
- Cung cấp báo cáo/analytics để giảng viên cải tiến chất lượng đánh giá.

### 1.4 Phạm vi áp dụng
- Đối tượng sử dụng chính: Sinh viên, Giảng viên, Quản trị viên.
- Loại đánh giá: Quiz, giữa kỳ, cuối kỳ, thi thử, thi chính thức.
- Môi trường: Thi online trong lớp/lab hoặc từ xa, có thể kèm ràng buộc truy cập.

---

## 2. Đối tượng sử dụng và trách nhiệm

### 2.1 Sinh viên
- Đăng nhập, tham gia môn học, vào ca thi bằng link/mã/QR.
- Bắt đầu bài thi đúng khung thời gian, làm bài và nộp bài.
- Theo dõi trạng thái lưu tạm, nộp bài thành công, xem kết quả theo quyền.

### 2.2 Giảng viên
- Tạo và quản lý khóa học.
- Xây dựng ngân hàng câu hỏi (thủ công hoặc hỗ trợ AI).
- Thiết lập đề thi, cấu hình luật thi, phát hành lịch thi.
- Theo dõi thi trực tiếp, nhận cảnh báo liêm chính.
- Chấm tự động/chấm tay, khóa điểm và công bố kết quả.
- Phân tích chất lượng câu hỏi và hiệu quả đề.

### 2.3 Quản trị viên
- Quản lý người dùng, vai trò và chính sách hệ thống.
- Theo dõi nhật ký kiểm toán và vận hành.
- Thiết lập chính sách bảo mật, lưu trữ dữ liệu và tuân thủ.

---

## 3. Mô hình nghiệp vụ tổng thể (Business Capability Map)

### 3.1 Quản trị danh tính và phân quyền
- Đăng nhập bằng tài khoản, cấp JWT.
- Kiểm soát quyền theo vai trò: ADMIN, LECTURER, STUDENT.
- Ràng buộc quyền theo ngữ cảnh (môn học, đề thi, bài nộp).

### 3.2 Quản lý học phần và ghi danh
- Tạo/sửa/xóa khóa học.
- Ghi danh thủ công hoặc hàng loạt.
- Kiểm tra điều kiện sinh viên đủ tư cách dự thi.

### 3.3 Quản lý ngân hàng câu hỏi
- Quản lý câu hỏi đa dạng loại: trắc nghiệm, đúng/sai, tự luận, ghép nối, sắp xếp.
- Gắn metadata: độ khó, chủ đề, tag, media.
- Tái sử dụng câu hỏi qua nhiều đề.
- Hỗ trợ luồng AI gợi ý/generating draft và kiểm duyệt trước khi dùng chính thức.

### 3.4 Thiết kế và phát hành đề thi
- Chọn câu hỏi từ ngân hàng theo tiêu chí.
- Cấu hình thời lượng, điểm đạt, lịch mở/đóng.
- Bật/tắt trộn câu, trộn đáp án, công bố điểm ngay.
- Tạo mã truy cập/link/QR cho ca thi.

### 3.5 Tổ chức thi và nộp bài
- Sinh viên bắt đầu bài thi, hệ thống tạo bản ghi lần thi.
- Lưu đáp án định kỳ và theo thay đổi (autosave).
- Nộp bài thủ công hoặc tự động khi hết giờ.

### 3.6 Giám sát liêm chính học thuật
- Thu thập sự kiện hành vi: chuyển tab, tương tác bất thường, sự kiện đáng ngờ.
- Tính toán mức rủi ro/suspicious flags.
- Gửi cảnh báo thời gian thực cho giảng viên.

### 3.7 Chấm điểm và công bố
- Chấm tự động cho câu objective.
- Chấm tay cho câu tự luận/khó.
- Tổng hợp điểm, xác định đạt/chưa đạt.
- Công bố kết quả theo cấu hình đề.

### 3.8 Báo cáo và phân tích
- Thống kê phân phối điểm, tỷ lệ đạt.
- Phân tích mức độ khó/phân biệt câu hỏi.
- Cung cấp dữ liệu phục vụ cải tiến ngân hàng đề.

---

## 4. Quy trình nghiệp vụ chi tiết theo giai đoạn

## 4.1 Giai đoạn chuẩn bị kỳ thi

### Bước 1: Thiết lập học phần
- Giảng viên tạo học phần (mã môn, tên môn, học kỳ).
- Cập nhật trạng thái hoạt động.

### Bước 2: Ghi danh sinh viên
- Ghi danh từng sinh viên hoặc hàng loạt.
- Nghiệp vụ kiểm tra trùng và trạng thái ghi danh.

### Bước 3: Chuẩn bị ngân hàng câu hỏi
- Tạo câu hỏi mới hoặc nhập nguồn.
- Gắn tag/chủ đề/độ khó.
- Kiểm duyệt chất lượng trước khi đưa vào đề.

### Bước 4: Cấu hình đề thi
- Chọn tập câu hỏi và trọng số.
- Thiết lập lịch thi, thời lượng, quy tắc trộn.
- Bật chính sách hiển thị điểm và mức giám sát.

### Bước 5: Phát hành đề
- Chuyển trạng thái sang published.
- Sinh link/mã/QR phục vụ truy cập.
- Gửi thông báo mời thi.

## 4.2 Giai đoạn tổ chức thi

### Bước 1: Sinh viên vào ca thi
- Xác thực tài khoản hợp lệ.
- Kiểm tra quyền dự thi (đúng học phần, đúng khung giờ, đủ điều kiện).
- Xác minh mã truy cập/link/QR nếu bật.

### Bước 2: Bắt đầu thi
- Tạo bản ghi lần thi với trạng thái IN_PROGRESS.
- Ghi nhận metadata bắt đầu: thời điểm, nguồn truy cập, thông tin theo chính sách.

### Bước 3: Làm bài và autosave
- Mỗi thay đổi đáp án được đưa vào hàng đợi lưu tạm.
- Debounce theo nhịp ngắn để tránh ghi quá dày.
- Autosave định kỳ để giảm rủi ro mất dữ liệu.
- Nếu mất mạng: giữ đáp án trong queue cục bộ, tự đồng bộ khi online lại.
- Nếu thoát trang: dùng cơ chế gửi nhanh để chốt dữ liệu cuối cùng.

### Bước 4: Giám sát liêm chính
- Thu sự kiện bất thường theo phiên thi.
- Đẩy log theo hàng đợi nền để không ảnh hưởng trải nghiệm làm bài.
- Gửi cảnh báo cho giảng viên theo mức độ rủi ro.

### Bước 5: Nộp bài
- Sinh viên chủ động nộp hoặc hệ thống tự nộp khi hết giờ.
- Hệ thống xác nhận tính hợp lệ bộ đáp án cuối.
- Chuyển trạng thái SUBMITTED.

## 4.3 Giai đoạn hậu kiểm và công bố kết quả

### Bước 1: Chấm điểm
- Job chấm tự động xử lý các câu objective.
- Các câu cần chấm tay được đưa vào danh sách giảng viên.

### Bước 2: Chuẩn hóa kết quả
- Tổng hợp điểm thành phần, điểm tổng.
- Tính trạng thái đạt/chưa đạt theo passing score.

### Bước 3: Công bố
- Nếu đề bật công bố ngay: trả điểm sau chấm objective.
- Nếu không: đợi finalize chấm tay rồi mới công bố.

### Bước 4: Phân tích
- Cập nhật thống kê đề/câu hỏi.
- Cung cấp báo cáo hỗ trợ cải tiến nội dung thi.

---

## 5. Quy tắc nghiệp vụ cốt lõi

### 5.1 Quy tắc về truy cập và quyền
- Chỉ người dùng đã xác thực mới gọi API nghiệp vụ.
- Sinh viên chỉ truy cập bài nộp của chính mình.
- Giảng viên chỉ quản lý dữ liệu trong phạm vi môn/đề có quyền.
- Quản trị viên có quyền cấu hình và kiểm toán toàn hệ thống.

### 5.2 Quy tắc về thời gian thi
- Chỉ cho phép bắt đầu trong cửa sổ đề thi cho phép.
- Trạng thái đề quyết định khả năng truy cập (draft/published/ongoing/completed).
- Hết thời lượng có thể tự động khóa nộp theo chính sách.

### 5.3 Quy tắc về lần thi và idempotency
- Mỗi lần bắt đầu thi phải có định danh attempt rõ ràng.
- Ngăn tạo trùng bài nộp khi request lặp/timeout/retry.
- Mục tiêu: một hành động nghiệp vụ tương đương một kết quả dữ liệu duy nhất.

### 5.4 Quy tắc về đáp án
- Mỗi câu hỏi trong một bài nộp chỉ có một bản ghi đáp án hiệu lực.
- Cập nhật đáp án theo upsert để đảm bảo an toàn khi gửi lặp.
- Dữ liệu lưu tạm không làm thay đổi trạng thái nộp cuối cùng.

### 5.5 Quy tắc về chấm điểm
- Objective: chấm tự động dựa trên đáp án chuẩn và trọng số.
- Subjective: cần giảng viên đánh giá và finalize.
- Điểm tổng là tổng hợp có kiểm soát theo thang điểm đề thi.

### 5.6 Quy tắc liêm chính học thuật
- Mỗi sự kiện bất thường phải truy vết được theo submission/session.
- Cảnh báo không chặn luồng nộp bài nhưng phải ghi nhận đầy đủ.
- Rủi ro liêm chính là dữ liệu tham chiếu phục vụ hậu kiểm, không mặc định là kết luận vi phạm.

---

## 6. Dữ liệu nghiệp vụ chính

### 6.1 Danh mục thực thể
- User: tài khoản, vai trò, trạng thái.
- Course: học phần, giảng viên phụ trách.
- Enrollment: quan hệ sinh viên - học phần.
- Question và QuestionVersion: nội dung và phiên bản câu hỏi.
- Exam và ExamQuestion: đề thi và cấu phần câu hỏi.
- ExamSubmission: bài nộp theo sinh viên và lần thi.
- SubmissionAnswer: đáp án chi tiết theo câu.
- ProctoringSession và IntegrityLog: phiên giám sát và nhật ký sự kiện.
- Notification: thông báo hệ thống theo đối tượng nhận.

### 6.2 Quan hệ dữ liệu quan trọng
- Một học phần có nhiều đề thi.
- Một đề thi có nhiều câu hỏi.
- Một sinh viên có thể có nhiều lần thi (attempt).
- Một bài nộp có nhiều đáp án và log giám sát.

### 6.3 Chất lượng dữ liệu và ràng buộc
- Unique/composite index để chống trùng và tối ưu truy vấn.
- Ràng buộc khóa ngoại đảm bảo toàn vẹn quan hệ.
- Các trường trạng thái phục vụ kiểm soát vòng đời nghiệp vụ.

---

## 7. Luồng realtime và bất đồng bộ

### 7.1 Nguyên tắc
- Các nghiệp vụ nặng không chạy đồng bộ trong request nộp bài.
- Dùng queue để tách biệt write-path trọng yếu và xử lý hậu kỳ.

### 7.2 Nhóm job nền
- integrity-logs: ghi nhật ký hành vi.
- notifications: gửi thông báo theo sự kiện.
- grading: chấm điểm tự động.

### 7.3 Giá trị nghiệp vụ
- Giảm thời gian phản hồi nộp bài.
- Tăng ổn định khi tải cao.
- Cho phép retry có kiểm soát khi lỗi tạm thời.

### 7.4 Realtime monitoring
- Phát sự kiện theo exam/role để giảng viên theo dõi thi trực tiếp.
- Cơ chế pub/sub phân tán giúp hoạt động ổn định trong môi trường nhiều instance.

---

## 8. Nghiệp vụ autosave và chống mất dữ liệu

### 8.1 Mục tiêu
- Không mất đáp án khi mất mạng, reload, hoặc đóng tab đột ngột.

### 8.2 Chính sách autosave
- Autosave theo thay đổi đáp án (debounce).
- Autosave chu kỳ theo khoảng thời gian định sẵn.
- Flush khi online trở lại.
- Cố gắng gửi payload cuối khi rời trang.

### 8.3 Quy tắc phục hồi
- Khi vào lại bài thi, hệ thống trả đáp án đã lưu gần nhất.
- UI khôi phục trạng thái làm bài từ dữ liệu backend.
- Không ghi đè dữ liệu mới hơn bởi bản cũ.

### 8.4 Tiêu chí thành công
- Tỷ lệ mất dữ liệu gần 0 trong các tình huống gián đoạn thường gặp.
- Trạng thái autosave minh bạch để sinh viên yên tâm khi làm bài.

---

## 9. Yêu cầu phi chức năng gắn với nghiệp vụ

### 9.1 Hiệu năng
- Ưu tiên độ trễ thấp cho start/submit/autosave.
- Tối ưu truy vấn bằng composite index theo access pattern thực tế.
- Áp dụng cache cho dữ liệu đọc nhiều (exam payload, question payload).

### 9.2 Khả năng mở rộng
- Hỗ trợ nhiều người thi đồng thời trong cùng ca.
- Thành phần queue/cache/realtime phải chạy tốt khi scale ngang.

### 9.3 Độ tin cậy
- Có cơ chế retry và idempotency.
- Không để lỗi hậu kỳ làm hỏng nghiệp vụ nộp bài.

### 9.4 Bảo mật
- JWT và phân quyền theo vai trò.
- Hạn chế truy cập dữ liệu theo phạm vi nghiệp vụ.
- Ghi log kiểm toán cho các thao tác nhạy cảm.

### 9.5 Khả năng quan sát
- Theo dõi queue depth, tỷ lệ lỗi job, độ trễ autosave.
- Theo dõi cảnh báo liêm chính theo ca thi.

---

## 10. Chỉ số nghiệp vụ cần theo dõi (KPI/KRI)

### 10.1 KPI vận hành thi
- Tỷ lệ bắt đầu thi thành công.
- Tỷ lệ nộp bài thành công.
- Độ trễ trung vị và p95 của start/submit/autosave.
- Tỷ lệ autosave thành công theo ca thi.

### 10.2 KPI liêm chính học thuật
- Số sự kiện bất thường trung bình mỗi bài nộp.
- Tỷ lệ bài nộp bị gắn cờ theo mức độ.
- Thời gian phản ứng của giảng viên với cảnh báo realtime.

### 10.3 KPI chất lượng đánh giá
- Tỷ lệ đạt theo đề/môn/học kỳ.
- Phân phối điểm và độ phân tán.
- Chỉ số độ khó và khả năng phân biệt của câu hỏi.

### 10.4 KRI rủi ro
- Tỷ lệ gián đoạn mạng ảnh hưởng đến trải nghiệm thi.
- Tỷ lệ job queue quá hạn xử lý.
- Tỷ lệ sự cố công bố điểm sai/thiếu.

---

## 11. Kịch bản nghiệp vụ quan trọng

### 11.1 Kịch bản chuẩn (happy path)
1. Giảng viên tạo đề, publish.
2. Sinh viên vào thi đúng giờ, làm bài, autosave diễn ra bình thường.
3. Sinh viên nộp bài thành công.
4. Hệ thống chấm objective, giảng viên hoàn tất phần còn lại.
5. Kết quả được công bố đúng chính sách.

### 11.2 Kịch bản mất mạng giữa giờ
1. Sinh viên đang làm bài thì offline.
2. Đáp án tiếp tục được giữ trong queue cục bộ.
3. Khi online lại, hệ thống tự flush lên backend.
4. Sinh viên tiếp tục thi mà không mất dữ liệu.

### 11.3 Kịch bản retry request do timeout
1. Client gửi lại yêu cầu start/submit.
2. Backend áp idempotency + unique constraints.
3. Trả về kết quả nhất quán, không tạo bản ghi trùng.

### 11.4 Kịch bản tải cao
1. Nhiều sinh viên nộp bài cùng lúc.
2. Luồng nộp chỉ ghi dữ liệu lõi, việc phụ chuyển sang queue.
3. Hệ thống giữ độ trễ ổn định, giảm nghẽn DB.

---

## 12. Ma trận quyền nghiệp vụ tóm tắt

### 12.1 Sinh viên
- Được phép: tham gia thi, làm bài, nộp bài, xem kết quả theo chính sách.
- Không được phép: chỉnh sửa đề, xem bài người khác, thay đổi cấu hình hệ thống.

### 12.2 Giảng viên
- Được phép: quản lý môn, câu hỏi, đề thi, giám sát thi, chấm điểm.
- Không được phép: thao tác quản trị hệ thống vượt phạm vi được cấp.

### 12.3 Quản trị viên
- Được phép: quản trị người dùng, chính sách, audit, vận hành.

---

## 13. Rủi ro nghiệp vụ và biện pháp kiểm soát

### 13.1 Rủi ro mất dữ liệu bài làm
- Kiểm soát: autosave nhiều lớp, queue offline, flush khi reconnect.

### 13.2 Rủi ro gian lận
- Kiểm soát: logging hành vi, cảnh báo realtime, hậu kiểm theo bằng chứng.

### 13.3 Rủi ro nghẽn hệ thống giờ cao điểm
- Kiểm soát: queue async, caching, index tối ưu, sự kiện phân tán.

### 13.4 Rủi ro sai lệch điểm số
- Kiểm soát: tách bạch auto-grade/manual-grade, finalize workflow, audit trail.

---

## 14. Giá trị mang lại cho các bên liên quan

### 14.1 Với sinh viên
- Trải nghiệm thi mượt và an tâm hơn nhờ autosave.
- Giảm rủi ro mất bài và chờ đợi phản hồi lâu.

### 14.2 Với giảng viên
- Giảm tải tác vụ lặp lại nhờ tự động hóa.
- Có dữ liệu giám sát và analytics phục vụ quyết định học thuật.

### 14.3 Với nhà trường/đơn vị đào tạo
- Tăng tính minh bạch, truy vết và tin cậy của đánh giá.
- Nền tảng sẵn sàng mở rộng cho quy mô thi lớn.

---

## 15. Định hướng mở rộng nghiệp vụ

- Chuẩn hóa rubric chấm tự luận và phản hồi theo tiêu chí.
- Bổ sung dashboard rủi ro liêm chính theo thời gian thực cấp khoa/trường.
- Mở rộng tích hợp LMS/SSO/email chính thức của đơn vị đào tạo.
- Nâng cao AI hỗ trợ tạo đề, gợi ý thay thế câu hỏi theo chất lượng thực đo.

---

## 16. Kết luận

Academic Trust Suite không chỉ là hệ thống thi trực tuyến mà là nền tảng quản trị đánh giá học thuật đầu-cuối, tập trung vào ba trụ cột nghiệp vụ:
- Độ tin cậy dữ liệu và kết quả.
- Tính liêm chính học thuật có thể kiểm chứng.
- Khả năng vận hành ổn định ở quy mô lớn.

Tài liệu này là chuẩn mô tả nghiệp vụ nền tảng để đồng bộ giữa các nhóm Product, Engineering, QA, Academic Operations và Security khi triển khai, kiểm thử và mở rộng hệ thống.

---

## 17. Phân Tích High-Level -> Low-Level Cho Các Bước Trọng Yếu

Mục này đi sâu các phần bạn yêu cầu theo 3 tầng:
- High-Level: mục tiêu nghiệp vụ và kết quả cần đạt.
- Mid-Level: luồng hệ thống, thành phần tham gia, điểm quyết định.
- Low-Level: dữ liệu, API, trạng thái, job, retry, kiểm soát lỗi, chỉ số đo lường.

## 17.1 Bước 2 Giai đoạn tổ chức thi: Bắt đầu thi

### 17.1.1 High-Level
- Mục tiêu: tạo phiên thi hợp lệ cho sinh viên và đảm bảo một lần bắt đầu thi không bị tạo trùng khi client retry.
- Kết quả: có bản ghi `ExamSubmission` trạng thái `IN_PROGRESS`, có metadata đầu phiên để phục vụ giám sát và kiểm toán.

### 17.1.2 Mid-Level
- Actor: Student, Auth service, Submission service, DB.
- Luồng chính:
1. Student gọi API start exam với JWT.
2. Hệ thống kiểm tra quyền dự thi, thời gian thi, trạng thái đề.
3. Hệ thống tạo hoặc trả về bản ghi lần thi hiện hành theo nguyên tắc idempotent.
4. Trả payload cần thiết để client bắt đầu timer và render đề.
- Quyết định nghiệp vụ:
- Nếu đề chưa mở hoặc đã đóng: từ chối.
- Nếu sinh viên không thuộc lớp/môn: từ chối.
- Nếu request lặp do timeout: trả về kết quả nhất quán, không tạo thêm bản ghi.

### 17.1.3 Low-Level
- API: `POST /api/submissions/start`.
- Trường bắt buộc: `examId`.
- Dữ liệu tạo:
- `examId`, `studentId`, `attemptNo`, `status=IN_PROGRESS`, `startedAt`.
- Metadata bắt đầu:
- `startedAt` (server time), `ipAddress` (nếu chính sách bật), `entryMethod` (link/QR/code), `clientHints` (tuỳ chính sách).
- Ràng buộc dữ liệu:
- Unique theo bộ khóa lần thi (ví dụ: `examId + studentId + attemptNo`).
- Index phục vụ check nhanh bản ghi đang làm.
- Idempotency kỹ thuật:
- Ưu tiên bắt lỗi duplicate constraint rồi đọc lại bản ghi đã tồn tại.
- Có thể kết hợp `Idempotency-Key` để dedupe ở tầng HTTP.
- SLA đề xuất:
- p95 start exam < 300ms.
- tỷ lệ start thành công > 99.5% trong khung thi bình thường.

## 17.2 Bước 3 Giai đoạn tổ chức thi: Làm bài và autosave

### 17.2.1 High-Level
- Mục tiêu: không mất bài làm trong các tình huống phổ biến (mạng chập chờn, refresh, đóng tab).
- Kết quả: dữ liệu đáp án trên server luôn gần thời gian thực và có thể phục hồi khi vào lại bài thi.

### 17.2.2 Mid-Level
- Actor: Student UI, Autosave hook, Submission API, DB, Redis (tuỳ chọn), Queue (tuỳ tải).
- Luồng chính:
1. Sinh viên thay đổi đáp án.
2. UI cập nhật local state ngay lập tức.
3. Autosave hook đưa thay đổi vào hàng đợi tạm cục bộ.
4. Debounce gom nhiều thay đổi gần nhau thành một lần gửi.
5. Gửi API autosave theo lô nhỏ.
6. Khi offline: tạm giữ local queue.
7. Khi online lại: flush queue lên server theo thứ tự an toàn.
8. Khi rời trang: gửi payload cuối bằng cơ chế nhanh (beacon/keepalive request).

### 17.2.3 Low-Level
- API: `POST /api/submissions/:id/autosave`.
- Payload khuyến nghị:
- `answers[]` gồm `questionId`, `answer`, `timeTaken`, `clientUpdatedAt`.
- Cơ chế ghi:
- Upsert theo khóa `submissionId + questionId`.
- Mỗi câu chỉ giữ bản ghi hiệu lực mới nhất theo quy tắc thời gian.
- Debounce:
- Mốc 500ms - 1500ms cho thay đổi liên tục.
- Autosave định kỳ:
- Mốc 15s - 30s để giảm mất dữ liệu khi người dùng không đổi đáp án lâu.
- Offline queue:
- Dùng map theo `questionId` để giữ bản mới nhất, tránh gửi lặp quá nhiều.
- Flush online:
- Gửi theo batch nhỏ (ví dụ 10-30 answers/batch) với retry giới hạn.
- Before unload:
- Ưu tiên payload tối thiểu, không phụ thuộc response để tránh treo trang.
- Quy tắc chống ghi đè bản mới:
- Chỉ update nếu bản incoming mới hơn `updatedAt` hiện có.
- Trạng thái hiển thị cho người dùng:
- `saving`, `saved`, `offline queued`, `syncing`, `sync error`.
- SLA đề xuất:
- p95 autosave < 150ms (không tính offline).
- tỷ lệ flush thành công sau reconnect > 99%.

## 17.3 Chấm tay, công bố và phân tích hậu kỳ

### 17.3.1 Các câu cần chấm tay được đưa vào danh sách giảng viên

#### High-Level
- Mục tiêu: tách rõ câu objective và subjective để đảm bảo chấm nhanh nhưng vẫn đúng học thuật.

#### Mid-Level
- Khi submit:
- Job `grading` chấm objective trước.
- Các câu subjective tạo danh sách chấm tay theo giảng viên/phân công.

#### Low-Level
- Danh sách chấm tay gồm: `submissionId`, `questionId`, `studentId`, `pendingSince`, `priority`.
- Trạng thái gợi ý: `PENDING_MANUAL`, `IN_REVIEW`, `REVIEWED`.
- Cần audit trail: ai chấm, lúc nào, điểm trước/sau chỉnh sửa.

### 17.3.2 Bước 3 Công bố

#### High-Level
- Mục tiêu: công bố điểm đúng chính sách từng đề thi.

#### Mid-Level
- Nếu `showResultsImmediately=true`: công bố phần objective ngay sau submit.
- Nếu `showResultsImmediately=false`: chỉ công bố khi finalize chấm tay.

#### Low-Level
- Trường chính sách đề: `showResultsImmediately`, `requiresManualReview`.
- Trạng thái công bố gợi ý:
- `NOT_RELEASED`, `PARTIAL_RELEASED`, `RELEASED`.
- Kiểm soát lỗi:
- Không công bố nếu còn bản ghi chấm tay `PENDING_MANUAL`.
- Ghi notification theo vai trò sau khi release.

### 17.3.3 Bước 4 Phân tích

#### High-Level
- Mục tiêu: biến dữ liệu thi thành insight để cải tiến ngân hàng câu hỏi và thiết kế đề.

#### Mid-Level
- Job analytics tổng hợp theo đề, theo câu, theo kỳ.
- Cập nhật dashboard cho giảng viên và quản trị.

#### Low-Level
- Chỉ số theo đề: điểm trung bình, median, p90, tỷ lệ đạt.
- Chỉ số theo câu: tỷ lệ đúng, độ phân biệt, thời gian trả lời trung bình.
- Chạy batch theo lịch (cuối ca thi hoặc theo giờ), tránh tranh chấp với traffic realtime.

## 17.4 Quy tắc liêm chính học thuật (5.6) từ High-Level -> Low-Level

### 17.4.1 High-Level
- Mục tiêu: ghi nhận đầy đủ bằng chứng rủi ro để phục vụ hậu kiểm công bằng, không làm gián đoạn luồng thi.

### 17.4.2 Mid-Level
- Sự kiện bất thường từ client được đẩy vào log pipeline.
- Hệ thống phát cảnh báo realtime cho giảng viên theo mức độ.
- Luồng submit vẫn ưu tiên hoàn tất, cảnh báo xử lý bất đồng bộ.

### 17.4.3 Low-Level
- Mỗi log phải có khóa truy vết:
- `submissionId`, `sessionId`, `eventType`, `eventTime`, `source`, `metadata`.
- Mức độ cảnh báo gợi ý: `INFO`, `WARN`, `CRITICAL`.
- Chính sách xử lý:
- Không chặn submit chỉ vì cảnh báo.
- Bắt buộc lưu log thành công hoặc retry queue.
- Cảnh báo là dữ liệu tham chiếu, quyết định vi phạm do giảng viên/hội đồng.

## 17.5 Chất lượng dữ liệu và ràng buộc (6.3) từ High-Level -> Low-Level

### 17.5.1 High-Level
- Mục tiêu: dữ liệu đúng, không trùng, truy vấn nhanh, trạng thái nhất quán.

### 17.5.2 Mid-Level
- Dùng unique/composite index chống trùng nghiệp vụ trọng yếu.
- Dùng FK bảo toàn quan hệ cha-con.
- Dùng state machine để quản lý vòng đời thực thể.

### 17.5.3 Low-Level
- Unique gợi ý:
- `ExamSubmission(examId, studentId, attemptNo)`.
- `SubmissionAnswer(submissionId, questionId)`.
- Composite index gợi ý:
- `ExamSubmission(examId, studentId, status)` cho check phiên đang thi.
- `ExamSubmission(studentId, status, createdAt)` cho lịch sử theo sinh viên.
- FK bắt buộc:
- `SubmissionAnswer.submissionId -> ExamSubmission.id`.
- `ExamSubmission.examId -> Exam.id`.
- Trạng thái vòng đời:
- Submission: `IN_PROGRESS -> SUBMITTED -> GRADED`.
- Exam: `DRAFT -> PUBLISHED -> ONGOING -> COMPLETED`.

## 17.6 Luồng realtime và bất đồng bộ (7) từ High-Level -> Low-Level

### 17.6.1 Nguyên tắc (7.1)

#### High-Level
- Tối ưu trải nghiệm người dùng bằng cách giữ request quan trọng nhẹ và nhanh.

#### Mid-Level
- Tách write-path trọng yếu (start/autosave/submit) khỏi hậu kỳ (logs/notify/grading).

#### Low-Level
- Trong submit chỉ làm: validate, persist đáp án cuối, đổi trạng thái.
- Đẩy các tác vụ hậu kỳ vào queue với retry + backoff.

### 17.6.2 Nhóm job nền (7.2)

#### integrity-logs
- Input: danh sách sự kiện bất thường.
- Output: bản ghi `IntegrityLog` đã lưu.
- Retry: 3 lần, backoff tăng dần.

#### notifications
- Input: sự kiện nghiệp vụ (`submission_received`, `integrity_risk`, ...).
- Output: notification gửi đúng đối tượng.
- Retry: 2 lần, không làm fail submit.

#### grading
- Input: submission đã nộp.
- Output: điểm objective + trạng thái chấm.
- Retry: 3 lần, có dead-letter strategy nếu lỗi kéo dài.

### 17.6.3 Giá trị nghiệp vụ (7.3)

#### High-Level
- Nâng chất lượng dịch vụ giờ cao điểm.

#### Mid-Level
- Giảm thời gian response submit, tăng tính đàn hồi khi có lỗi tạm thời.

#### Low-Level
- KPI kỹ thuật:
- submit p95 giảm đáng kể khi tách queue.
- queue lag trong ngưỡng cho phép (ví dụ < 60s với grading thường).

### 17.6.4 Realtime monitoring (7.4)

#### High-Level
- Giảng viên thấy được diễn biến ca thi theo thời gian thực.

#### Mid-Level
- Event bus phát theo scope `exam` và `role`.
- Client giảng viên subscribe để hiển thị dashboard trực tiếp.

#### Low-Level
- Channel gợi ý:
- `exam:{examId}:events`
- `role:{role}:notifications`
- Dùng pub/sub phân tán (Redis/NATS) để chạy tốt khi nhiều instance API.

## 17.7 Autosave và chống mất dữ liệu (8) từ High-Level -> Low-Level

### 17.7.1 Mục tiêu (8.1)

#### High-Level
- Không mất đáp án trong các tình huống gián đoạn thông dụng.

#### Mid-Level
- Kết hợp local queue + autosave API + cơ chế phục hồi sau reconnect/reload.

#### Low-Level
- Tỷ lệ mất dữ liệu mục tiêu: gần 0 với sự cố mạng ngắn hạn.

### 17.7.2 Chính sách autosave (8.2)

#### High-Level
- Lưu kịp thời nhưng không gây quá tải hệ thống.

#### Mid-Level
- Trigger theo thay đổi + trigger định kỳ + trigger online lại + trigger rời trang.

#### Low-Level
- Debounce 1s mặc định.
- Interval 30s mặc định.
- Flush ngay khi `online` event.
- Beacon payload cuối khi `beforeunload`.

### 17.7.3 Quy tắc phục hồi (8.3)

#### High-Level
- Sinh viên quay lại vẫn tiếp tục từ trạng thái mới nhất đã lưu.

#### Mid-Level
- Mở lại trang thi -> gọi API lấy submission + answers -> hydrate UI.

#### Low-Level
- Quy tắc chống ghi đè:
- so sánh `serverUpdatedAt` và `clientUpdatedAt`.
- ưu tiên bản mới hơn theo timestamp/version.

### 17.7.4 Tiêu chí thành công (8.4)

#### High-Level
- Người dùng tin tưởng hệ thống không làm mất bài.

#### Mid-Level
- Có chỉ báo trạng thái lưu rõ ràng ngay trên UI.

#### Low-Level
- KPI:
- autosave success rate >= 99%.
- recover success rate sau reconnect >= 99%.
- số ticket mất bài gần 0.

## 17.8 Yêu cầu phi chức năng gắn nghiệp vụ (9) từ High-Level -> Low-Level

### 17.8.1 Hiệu năng (9.1)

#### High-Level
- Trải nghiệm nhanh ở các thao tác sống còn: start, autosave, submit.

#### Mid-Level
- Tối ưu query bằng index và giảm hit DB bằng cache.

#### Low-Level
- Mục tiêu ví dụ:
- start p95 < 300ms, autosave p95 < 150ms, submit p95 < 500ms.
- cache TTL phân lớp: exam payload dài hơn answers payload.

### 17.8.2 Khả năng mở rộng (9.2)

#### High-Level
- Hệ thống vẫn ổn khi số người thi tăng mạnh.

#### Mid-Level
- API scale ngang, queue worker scale độc lập, cache và pub/sub dùng hạ tầng chia sẻ.

#### Low-Level
- Thiết kế stateless cho API.
- Dùng distributed lock/counter khi cần đồng bộ tác vụ hiếm.

### 17.8.3 Độ tin cậy (9.3)

#### High-Level
- Lỗi tạm thời không làm mất giao dịch nghiệp vụ cốt lõi.

#### Mid-Level
- Retry có giới hạn, idempotency chống nhân đôi dữ liệu.

#### Low-Level
- Chuẩn retry: exponential backoff + max attempts + dead-letter.
- Submit chỉ fail khi dữ liệu lõi không ghi được.

### 17.8.4 Bảo mật (9.4)

#### High-Level
- Đúng người, đúng quyền, đúng dữ liệu.

#### Mid-Level
- JWT xác thực, guard phân quyền, policy theo ngữ cảnh tài nguyên.

#### Low-Level
- Audit log cho thao tác nhạy cảm: publish exam, finalize grading, release result.
- Che/mã hóa thông tin nhạy cảm theo chuẩn của đơn vị.

### 17.8.5 Khả năng quan sát (9.5)

#### High-Level
- Có thể phát hiện sớm và khoanh vùng sự cố vận hành kỳ thi.

#### Mid-Level
- Tập trung metric cho API, queue, autosave, integrity alert.

#### Low-Level
- Dashboard tối thiểu:
- API latency/error rate theo endpoint.
- Queue depth, processing time, fail/retry count.
- Autosave latency và success rate theo exam.
- Integrity alerts theo mức độ và theo phòng thi/ca thi.

---

## 18. Thiết Kế Lại Flow SUBMIT Chống Duplicate, Race Condition và Xung Đột Với Autosave

Mục tiêu của phần này là thiết kế flow submit theo hướng có thể chịu concurrent load cao mà vẫn đảm bảo:
- Không tạo duplicate submission.
- Không bị race condition khi retry hoặc spam submit.
- Không bị conflict với autosave đang chạy song song.

### 18.1 State machine cho submission

#### 18.1.1 Các trạng thái
- `IN_PROGRESS`: sinh viên đang làm bài, autosave được phép ghi.
- `SUBMITTING`: hệ thống đã nhận request submit và đang khóa logic submit để xử lý cuối cùng.
- `SUBMITTED`: bài làm đã được chốt dữ liệu cuối và không còn cho phép autosave thay đổi nội dung.
- `GRADE_PENDING`: bài đã nộp, chờ job chấm hoặc finalize.
- `GRADED`: đã chấm xong.
- `SUBMIT_FAILED`: submit bị lỗi có thể retry an toàn, nhưng phải có kiểm soát trạng thái.

#### 18.1.2 Luồng chuyển trạng thái hợp lệ
- `IN_PROGRESS -> SUBMITTING`: khi nhận submit hợp lệ đầu tiên.
- `SUBMITTING -> SUBMITTED`: khi snapshot đáp án cuối và ghi transaction thành công.
- `SUBMITTED -> GRADE_PENDING`: khi enqueue job chấm hoặc chuyển sang chấm tay.
- `GRADE_PENDING -> GRADED`: khi grading hoàn tất.
- `SUBMITTING -> SUBMIT_FAILED`: khi transaction submit fail trước lúc commit.
- `SUBMIT_FAILED -> SUBMITTING`: chỉ cho phép khi request retry hợp lệ và chưa có bản `SUBMITTED`.

#### 18.1.3 Invalid transition
- `SUBMITTED -> IN_PROGRESS`: không hợp lệ.
- `GRADED -> IN_PROGRESS`: không hợp lệ.
- `SUBMITTED -> SUBMITTING`: không hợp lệ nếu đã có bản chốt cuối.
- `SUBMIT_FAILED -> SUBMITTED` mà không qua submit lại: không hợp lệ.
- `SUBMITTING -> SUBMITTING` đồng thời từ nhiều request: không được tạo hai tiến trình song song, phải khóa theo submission.

#### 18.1.4 Quy tắc trạng thái quan trọng
- Chỉ có 1 state machine chủ đạo cho một submission.
- Autosave chỉ được phép ghi khi submission ở `IN_PROGRESS`.
- Khi submit chuyển sang `SUBMITTING`, autosave phải bị chặn theo version/lock để không ghi đè lên snapshot cuối.

### 18.2 DB schema chi tiết

#### 18.2.1 Bảng `exam_submissions`
Thiết kế đề xuất:

```sql
CREATE TABLE exam_submissions (
	id CHAR(36) PRIMARY KEY,
	exam_id CHAR(36) NOT NULL,
	student_id CHAR(36) NOT NULL,
	attempt_no INT NOT NULL DEFAULT 1,
	status ENUM('IN_PROGRESS','SUBMITTING','SUBMITTED','GRADE_PENDING','GRADED','SUBMIT_FAILED') NOT NULL,
	version INT NOT NULL DEFAULT 0,
	started_at DATETIME(3) NOT NULL,
	submitting_at DATETIME(3) NULL,
	submitted_at DATETIME(3) NULL,
	grading_started_at DATETIME(3) NULL,
	graded_at DATETIME(3) NULL,
	submit_token CHAR(36) NULL,
	submit_idempotency_key VARCHAR(255) NULL,
	submit_request_hash VARCHAR(64) NULL,
	last_autosave_at DATETIME(3) NULL,
	last_activity_at DATETIME(3) NULL,
	submit_locked_at DATETIME(3) NULL,
	final_snapshot_version INT NULL,
	score DECIMAL(10,2) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at DATETIME(3) NULL,
	CONSTRAINT uq_exam_student_attempt UNIQUE (exam_id, student_id, attempt_no),
	CONSTRAINT uq_submit_token UNIQUE (submit_token),
	CONSTRAINT uq_submit_idempotency UNIQUE (exam_id, student_id, submit_idempotency_key),
	INDEX idx_exam_student_status (exam_id, student_id, status),
	INDEX idx_student_status_created (student_id, status, created_at),
	INDEX idx_submit_locked (id, submit_locked_at, status),
	INDEX idx_submit_token_lookup (submit_token)
);
```

#### 18.2.2 Ý nghĩa các cột khóa
- `version`: optimistic locking, tăng mỗi lần autosave/submit hợp lệ.
- `submit_token`: token một lần cho submit transaction hiện tại, giúp chống replay.
- `submit_idempotency_key`: khóa dedupe từ request header.
- `submit_request_hash`: hash của payload submit để phát hiện retry cùng nội dung.
- `submit_locked_at`: thời điểm hệ thống bắt đầu khóa bài trước khi chốt dữ liệu.
- `final_snapshot_version`: version của autosave cuối cùng đã được chốt vào submit.

#### 18.2.3 Bảng `submission_idempotency_keys`
Nên tách riêng để phục vụ retry an toàn ở tầng API, nhất là khi client timeout nhưng server đã xử lý xong.

```sql
CREATE TABLE submission_idempotency_keys (
	id CHAR(36) PRIMARY KEY,
	idempotency_key VARCHAR(255) NOT NULL,
	scope VARCHAR(64) NOT NULL,
	submission_id CHAR(36) NOT NULL,
	request_hash VARCHAR(64) NOT NULL,
	response_status INT NOT NULL,
	response_body JSON NOT NULL,
	locked_at DATETIME(3) NOT NULL,
	expires_at DATETIME(3) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT uq_submit_idem_scope UNIQUE (scope, idempotency_key),
	CONSTRAINT uq_submit_idem_submission UNIQUE (submission_id, idempotency_key),
	INDEX idx_submit_idem_expiry (expires_at),
	INDEX idx_submit_idem_submission (submission_id)
);
```

#### 18.2.4 Bảng `submission_answers`
- `submission_id`, `question_id` unique để mỗi câu chỉ có một đáp án hiệu lực.
- Có thêm `version` hoặc `updated_at` để hỗ trợ last-write-wins có kiểm soát.

#### 18.2.5 Gợi ý trạng thái dữ liệu khi submit
- Khi submit bắt đầu, `exam_submissions.status = SUBMITTING`.
- Khi snapshot hoàn tất, ghi `SUBMITTED` và set `submitted_at`.
- Khi enqueue grading thành công, chuyển `GRADE_PENDING`.

### 18.3 API thiết kế: `POST /submissions/{id}/submit`

#### 18.3.1 Request headers
- `Authorization: Bearer <token>`.
- `Idempotency-Key: <uuid-or-random-string>`.
- `X-Request-Id: <trace-id>` để trace log.

#### 18.3.2 Request body
Nên tối giản, không gửi toàn bộ bài nếu server đã lưu autosave đầy đủ.

```json
{
	"clientVersion": 42,
	"finalReason": "manual-submit",
	"clientSubmittedAt": "2026-04-29T10:12:30.123Z"
}
```

#### 18.3.3 Response cases

##### a) Success
HTTP `200 OK` hoặc `201 Created` nếu đây là submit đầu tiên.

```json
{
	"submissionId": "uuid",
	"status": "SUBMITTED",
	"attemptNo": 1,
	"submittedAt": "2026-04-29T10:12:31.456Z",
	"serverVersion": 43,
	"gradingStatus": "GRADE_PENDING"
}
```

##### b) Duplicate request
HTTP `200 OK` nếu request trùng idempotency key và server đã có kết quả.

```json
{
	"submissionId": "uuid",
	"status": "SUBMITTED",
	"duplicate": true,
	"submittedAt": "2026-04-29T10:12:31.456Z"
}
```

##### c) Retry after timeout
HTTP `202 Accepted` hoặc `409 Conflict` tùy trạng thái.

- Nếu server đang xử lý nhưng chưa commit xong: trả `202 Accepted`.
- Nếu submit đã commit nhưng client chưa nhận được response: trả lại kết quả từ idempotency store.
- Nếu state đang `SUBMITTING` do request khác giữ lock: trả `409 Conflict` kèm thông điệp retry sau vài trăm ms.

```json
{
	"submissionId": "uuid",
	"status": "SUBMITTING",
	"retryAfterMs": 500,
	"message": "Submission is being finalized"
}
```

### 18.4 Xử lý concurrency

#### 18.4.1 Mô hình khuyến nghị: Hybrid locking
Kết hợp 3 lớp để chống duplicate tối đa:
1. Pessimistic lock ở thời điểm chốt submit.
2. Optimistic locking bằng `version`.
3. Idempotency store cho retry từ client.

#### 18.4.2 Pessimistic locking
- Khi nhận submit, dùng transaction và lock dòng submission theo `SELECT ... FOR UPDATE`.
- Mục tiêu: chỉ một request có thể chuyển state từ `IN_PROGRESS` sang `SUBMITTING`.
- Nếu không lock được trong thời gian ngắn, trả `409 Conflict` hoặc `202 Accepted` tùy chiến lược.

#### 18.4.3 Optimistic locking
- Mỗi autosave tăng `version`.
- Submit phải đọc `version` hiện tại, snapshot answers tại version đó, và cập nhật `final_snapshot_version`.
- Nếu version đã đổi trong lúc submit đang chạy, hệ thống kiểm tra lại và dùng version mới nhất trước khi commit final.

#### 18.4.4 Tránh double grading trigger
- Chỉ enqueue grading khi transition `SUBMITTED -> GRADE_PENDING` thành công.
- Dùng unique job key: `grading:{submissionId}`.
- Job processor phải kiểm tra lại trạng thái submission trước khi chấm.
- Nếu job bị retry, nó phải là idempotent và không cộng điểm/chạy chấm hai lần.

### 18.5 Submit flow chuẩn ở mức nghiệp vụ

#### 18.5.1 Mục tiêu
- Snapshot dữ liệu cuối.
- Khóa đáp án khỏi autosave.
- Chuyển trạng thái một lần duy nhất.

#### 18.5.2 Luồng chuẩn
1. Client gửi submit kèm `Idempotency-Key`.
2. Server kiểm tra idempotency store.
3. Server lock submission row.
4. Server kiểm tra trạng thái hiện tại.
5. Server chuyển trạng thái sang `SUBMITTING`.
6. Server đọc toàn bộ answers hiện hành theo snapshot version.
7. Server ghi final submission data và đổi sang `SUBMITTED`.
8. Server ghi response vào idempotency store.
9. Server enqueue grading đúng 1 lần.
10. Server trả response cuối cho client.

### 18.6 Quan hệ giữa submit và autosave

#### 18.6.1 Nguyên tắc
- Autosave được phép ghi khi `status = IN_PROGRESS`.
- Khi `SUBMITTING` bắt đầu, autosave phải đọc trạng thái trước khi ghi.
- Nếu thấy `SUBMITTING` hoặc `SUBMITTED`, autosave không được update nữa.

#### 18.6.2 Cách tránh conflict
- Dùng `version` trên submission.
- Autosave gửi kèm `baseVersion`.
- Nếu `baseVersion` khác `currentVersion`, server trả `409 Conflict` hoặc `412 Precondition Failed` để client refetch.
- Submit sẽ chốt `final_snapshot_version` và khóa ghi mới.

#### 18.6.3 Hành vi khi submit và autosave chạy song song
- Nếu autosave đến trước và commit xong: submit dùng version mới nhất để snapshot.
- Nếu submit lock trước: autosave bị từ chối hoặc queue local cho đến khi submit hoàn tất.
- Không cho phép hai nhánh cùng update final state mà không có version check.

### 18.7 Sequence diagram dạng text

#### 18.7.1 Client retry do timeout
```text
Client -> API: POST /submissions/{id}/submit (Idempotency-Key=A)
API -> IdempotencyStore: lookup A
IdempotencyStore --> API: miss
API -> DB: BEGIN TRANSACTION
API -> DB: SELECT submission FOR UPDATE
API -> DB: status = SUBMITTING
API -> DB: snapshot answers + mark SUBMITTED
API -> IdempotencyStore: store A with response
API -> Queue: enqueue grading(submissionId)
API --> Client: 200 OK { status: SUBMITTED }

Client --timeout-->
Client -> API: POST /submissions/{id}/submit (Idempotency-Key=A)
API -> IdempotencyStore: lookup A
IdempotencyStore --> API: hit
API --> Client: 200 OK cached response
```

#### 18.7.2 Server xử lý idempotent khi submit bị spam
```text
Client1 -> API: submit (A)
Client2 -> API: submit (A)
API -> DB: lock submission row
API1 succeeds first and stores response
API2 sees idempotency hit or SUBMITTED state
API2 returns same result
```

### 18.8 Edge cases

#### 18.8.1 Submit đúng lúc autosave đang chạy
- Nếu autosave commit xong trước submit: submit snapshot version mới nhất.
- Nếu submit lock trước autosave: autosave nhận `SUBMITTING/SUBMITTED` và dừng cập nhật.
- Không để autosave ghi đè snapshot cuối sau khi `SUBMITTING` đã bắt đầu.

#### 18.8.2 Submit gần hết giờ
- Hệ thống phải ưu tiên chốt submit ngay cả khi timer client sắp hết.
- Server time là nguồn chuẩn, không tin hoàn toàn vào client timer.
- Nếu hết giờ trong lúc submit: vẫn cho phép commit nếu request đã vào trước deadline policy.

#### 18.8.3 Submit khi network chập chờn
- Client phải giữ idempotency key cố định cho một lần submit.
- Nếu timeout, client retry với cùng key.
- Server trả lại kết quả đã lưu thay vì tạo submission mới.

#### 18.8.4 Submit trùng nhiều lần do spam click
- UI disable nút submit ngay khi request đầu tiên được gửi.
- Backend vẫn phải chống spam bằng lock + idempotency + unique state.

#### 18.8.5 Autosave chạy sát submit cuối
- Autosave cuối cùng được cho phép nếu nó vào trước lock.
- Sau khi lock, mọi autosave tiếp theo phải fail fast hoặc queue local cho tới khi client nhận trạng thái cuối.

### 18.9 Khuyến nghị triển khai thực tế

#### 18.9.1 Tầng API
- Dùng middleware/guard để validate `Idempotency-Key`.
- Ghi request hash để phát hiện key trùng với payload khác.

#### 18.9.2 Tầng DB
- Dùng transaction ngắn, lock đúng 1 row submission.
- Tránh giữ lock lâu cho các tác vụ grading, notification, log.

#### 18.9.3 Tầng queue
- Enqueue grading/notification sau commit thành công.
- Job phải idempotent theo `submissionId`.

#### 18.9.4 Tầng client
- Một submit session chỉ có một idempotency key.
- Khi timeout thì retry cùng key.
- Khi nhận `SUBMITTING`, client hiển thị đang chốt bài và tự poll kết quả nếu cần.

### 18.10 Tóm tắt kiến trúc submit an toàn
- `IN_PROGRESS`: autosave bình thường.
- `SUBMITTING`: khóa finalization, chống concurrency.
- `SUBMITTED`: chốt dữ liệu, không cho autosave nữa.
- `GRADE_PENDING`: enqueue chấm, không ảnh hưởng submit.
- Idempotency store: chống retry/timeout duplicate.
- Row lock + version: chống race condition.
- Unique job key: chống double grading trigger.

---

## 19. Thiết Kế Lại Cơ Chế AUTOSAVE Theo Version/Sequence

Mục tiêu của thiết kế này là thay thế cách resolve conflict chỉ bằng timestamp bằng cơ chế version/sequence rõ ràng theo từng câu hỏi, để đảm bảo dữ liệu mới không bao giờ bị ghi đè bởi dữ liệu cũ, kể cả khi packet đến lệch thứ tự hoặc client offline rồi reconnect.

### 19.1 Nguyên tắc cốt lõi
- Mỗi câu hỏi trong một submission có một `sequence` hoặc `version` riêng.
- Server chỉ chấp nhận update có `sequence` lớn hơn giá trị đã lưu.
- Nếu payload đến trễ nhưng sequence thấp hơn, server bỏ qua toàn bộ phần thay đổi đó.
- Autosave phải idempotent theo cặp `submissionId + questionId + sequence`.
- Offline queue chỉ lưu phiên bản mới nhất của mỗi câu hỏi, không giữ nhiều bản cũ cùng câu.

### 19.2 Model dữ liệu đề xuất

#### 19.2.1 SubmissionAnswer
Thiết kế tối thiểu cần có các trường sau:

```sql
submission_answers
	id
	submissionId
	questionId
	answer
	timeTaken
	sequence
	clientMessageId
	serverVersion
	updatedAt
	createdAt
```

#### 19.2.2 Ý nghĩa các trường
- `sequence`: số thứ tự tăng dần do client tạo cho từng lần thay đổi của một câu hỏi.
- `clientMessageId`: định danh duy nhất của 1 bản ghi autosave batch hoặc single update.
- `serverVersion`: version hiện tại mà server đã chấp nhận, dùng để đối chiếu và debug.
- `updatedAt`: chỉ còn ý nghĩa audit, không dùng để resolve conflict.
- `sequence` phải là nguồn quyết định chính, không dùng timestamp làm luật thắng thua.

#### 19.2.3 Ràng buộc dữ liệu
- Unique: `submissionId + questionId` để mỗi câu chỉ có một bản ghi hiện hành.
- Index: `submissionId + questionId + sequence` để đọc/so sánh nhanh.
- Index: `submissionId + updatedAt` chỉ phục vụ audit hoặc thống kê, không phục vụ conflict resolution.

### 19.3 API `POST /submissions/{id}/autosave`

#### 19.3.1 Payload batch chuẩn
Payload nên gửi batch theo lô thay vì từng câu riêng lẻ mỗi lần gõ:

```json
{
	"clientBatchId": "b8d8b1be-0d0d-4e6e-9f9b-1c8d4a4d7d65",
	"baseSubmissionVersion": 41,
	"answers": [
		{
			"questionId": "q1",
			"sequence": 12,
			"answer": { "value": "A" },
			"timeTaken": 34
		},
		{
			"questionId": "q2",
			"sequence": 8,
			"answer": { "text": "Paris" },
			"timeTaken": 51
		}
	]
}
```

#### 19.3.2 Payload single update
Khi chỉ có một câu thay đổi hoặc khi flush nhanh trước unload, client có thể gửi một phần tử trong `answers[]`:

```json
{
	"clientBatchId": "single-9c8f",
	"baseSubmissionVersion": 41,
	"answers": [
		{
			"questionId": "q1",
			"sequence": 13,
			"answer": { "value": "B" },
			"timeTaken": 39
		}
	]
}
```

#### 19.3.3 Batch vs single
- Batch là mặc định để giảm write amplification và giảm số round-trip.
- Single update chỉ dùng cho flush cuối, event quan trọng, hoặc khi local queue đang rỗng.
- Server xử lý cùng một code path cho cả batch và single, chỉ khác số lượng phần tử trong `answers[]`.

### 19.4 Conflict resolution strategy

#### 19.4.1 Hai update cùng question đến out-of-order
- Server đọc `existing.sequence` hiện tại của câu hỏi.
- Nếu `incoming.sequence <= existing.sequence`, server bỏ qua update đó.
- Nếu `incoming.sequence > existing.sequence`, server ghi đè.
- Kết quả: dữ liệu cũ không bao giờ thắng dữ liệu mới, kể cả network reorder.

#### 19.4.2 Client retry gửi lại payload cũ
- Retry với cùng `clientBatchId` và cùng `sequence` phải an toàn.
- Nếu server đã lưu sequence đó rồi, request được coi là duplicate và trả về `noop`.
- Nếu payload cũ đến sau payload mới hơn, nó bị reject theo sequence check.

#### 19.4.3 Khi client gửi nhiều batch cùng lúc
- Server chấp nhận độc lập từng question trong batch.
- Mỗi question được compare riêng theo sequence, không cần batch-level ordering tuyệt đối.
- Nếu một phần của batch lỗi validation, phần còn lại vẫn có thể được ghi nếu thiết kế cho phép partial success.

### 19.5 Offline queue

#### 19.5.1 Cách lưu local
- Dùng `IndexedDB` làm nguồn chính trên web app.
- Mỗi câu hỏi chỉ giữ bản mới nhất theo key `submissionId + questionId`.
- Metadata tối thiểu cần lưu: `sequence`, `answer`, `timeTaken`, `updatedAt`, `clientBatchId`.
- Nếu IndexedDB không khả dụng, có thể fallback sang `localStorage` cho chế độ đơn giản, nhưng không nên là mặc định.

#### 19.5.2 Cách flush lại
- Flush theo batch size 10-30 answers mỗi lần để tránh spike và giảm payload quá lớn.
- Flush ngay khi online trở lại, rồi tiếp tục flush theo hàng đợi còn lại.
- Mỗi batch nên có retry policy với exponential backoff: 1s, 2s, 4s, 8s, rồi dừng.
- Nếu một batch thất bại vì sequence conflict, client loại bỏ các entry cũ hơn và chỉ giữ version mới nhất.

#### 19.5.3 Chính sách retry
- Retry network error: có.
- Retry 4xx validation: không retry tự động, vì dữ liệu sai logic.
- Retry conflict do sequence thấp: không retry nội dung cũ, chỉ gửi lại snapshot mới nhất.

### 19.6 Before unload

#### 19.6.1 Mục tiêu
- Đảm bảo gửi được payload cuối mà không block UI hoặc làm treo tab.

#### 19.6.2 Cách làm
- Tập hợp các answer pending thành một batch nhỏ nhất có thể.
- Dùng `navigator.sendBeacon()` hoặc `fetch(..., { keepalive: true })`.
- Không chờ response để giữ UI, chỉ best-effort delivery.
- Nếu beacon thất bại, dữ liệu vẫn còn trong offline queue để flush khi quay lại.

#### 19.6.3 Quy tắc quan trọng
- Before unload không được làm chậm điều hướng của người dùng.
- Không phụ thuộc vào confirm dialog để bảo toàn dữ liệu, vì confirm có thể bị chặn bởi trình duyệt.

### 19.7 UI state machine

#### 19.7.1 Trạng thái
- `saving`: đang gửi autosave lên server.
- `saved`: server đã xác nhận sequence mới nhất.
- `offline`: mất mạng, dữ liệu đang nằm trong queue local.
- `syncing`: đang flush lại queue sau reconnect.
- `error`: một batch bị lỗi cần hiển thị cảnh báo hoặc retry thủ công.

#### 19.7.2 Chuyển trạng thái
- `saved -> saving` khi user thay đổi đáp án.
- `saving -> saved` khi server ack success với sequence mới nhất.
- `saving -> offline` khi request fail do network.
- `offline -> syncing` khi mạng phục hồi và bắt đầu flush queue.
- `syncing -> saved` khi toàn bộ queue được flush xong.
- `saving/syncing -> error` khi retry exhausted hoặc gặp lỗi logic.

#### 19.7.3 UI cần hiển thị gì
- Badge trạng thái hiện tại.
- Số lượng thay đổi đang chờ flush.
- Mốc thời gian lần sync gần nhất.
- Cảnh báo khi server từ chối sequence cũ hoặc khi queue bị nghẽn.

### 19.8 SLA và performance

#### 19.8.1 Mục tiêu kỹ thuật
- Giảm write amplification bằng batch autosave và last-write-per-question.
- Giảm số request đồng thời bằng debounce và compaction ở client.
- Giảm tải DB khi 1000+ concurrent users bằng cách không ghi từng keystroke.

#### 19.8.2 Chỉ số đề xuất
- p95 autosave latency dưới 150ms trong trạng thái online bình thường.
- Số write thật trên DB phải thấp hơn số lần user gõ phím rất nhiều, lý tưởng là theo batch thay vì per keystroke.
- Offline reconnect phải flush thành công mà không tạo duplicate rows.
- Khi 1000+ users đồng thời, DB chỉ nhìn thấy batch đã compaction, không phải mọi event gõ phím.

### 19.9 Timeline ví dụ khi packet bị reorder

Giả sử câu hỏi `q1` có sequence tăng dần theo client:

```text
t0  Client sửa q1 -> sequence 10
t1  Client sửa q1 -> sequence 11
t2  Client gửi batch A chứa sequence 10
t3  Client gửi batch B chứa sequence 11
t4  Network reorder: batch B đến server trước
t5  Server lưu q1 sequence 11
t6  Batch A đến muộn
t7  Server so sánh 10 <= 11 và bỏ qua batch A
```

Kết quả cuối cùng:
- Giá trị lưu trên server là của sequence 11.
- Dữ liệu cũ sequence 10 không thể overwrite dữ liệu mới.
- Nếu batch A và B cùng retry nhiều lần, server vẫn giữ sequence 11.

### 19.10 Một ví dụ offline -> reconnect

```text
t0  User offline, sửa q1 sequence 21
t1  User sửa q1 sequence 22
t2  Queue local chỉ giữ q1 sequence 22
t3  Online trở lại
t4  Client flush batch {q1, sequence 22}
t5  Server chấp nhận vì 22 > current.sequence
t6  Client nhận ack, xóa entry local của q1
```

### 19.11 Kết luận thiết kế autosave mới
- Timestamp chỉ còn là metadata audit, không dùng để quyết định thắng thua.
- Version/sequence mới là nguồn chân lý của conflict resolution.
- Local queue phải compaction theo question để tránh replay dữ liệu cũ.
- Server phải idempotent theo batch và theo question.
- UI phải phản ánh đúng trạng thái sync để người dùng hiểu hệ thống đang làm gì.
