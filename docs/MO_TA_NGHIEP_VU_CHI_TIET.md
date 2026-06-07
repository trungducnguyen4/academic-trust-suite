# Mo Ta Nghiep Vu Chi Tiet - Academic Trust Suite

Tai lieu nay mo ta nghiep vu hien tai cua Academic Trust Suite theo dung huong cua du an: mot nen tang danh gia hoc thuat co ho tro AI, sinh de rieng cho tung sinh vien, theo doi tinh toan ven, cham diem va cong bo ket qua. He thong khong duoc xem nhu mot LMS CRUD don gian.

## 1. Muc tieu nghiep vu

Academic Trust Suite ho tro cac truong/lop hoc to chuc bai kiem tra truc tuyen theo huong san sang mo rong:

- Giang vien quan ly khoa hoc, ngan hang cau hoi, de thi, bai nop va ket qua.
- Sinh vien lam bai theo lich thi duoc cong bo, co autosave va co trang xem ket qua sau khi diem duoc cong bo.
- He thong luu lai noi dung de thi tai thoi diem thi de dam bao tinh lich su.
- He thong ghi nhan hanh vi bat thuong de giang vien xem xet, khong tu dong ket luan gian lan.
- Cau hoi co phien ban de dam bao bai thi cu khong bi thay doi khi cau hoi goc duoc cap nhat.

## 2. Vai tro nguoi dung

### Student

- Xem dashboard, khoa hoc da ghi danh, lich thi, bai thi cua minh va ket qua.
- Bat dau bai thi khi du dieu kien ve lich thi, trang thai bai thi va ghi danh.
- Lam bai, autosave cau tra loi, xem preview truoc khi nop.
- Xem diem sau khi bai nop da duoc cham va/hoac giang vien cong bo.
- Khong xem lich su cham diem noi bo, audit log hay thong tin dieu tra integrity.

### Lecturer

- Quan ly khoa hoc, cau hoi, de thi va danh sach sinh vien.
- Tao de thi tu cau hoi da duyet, cau hinh diem tung cau trong de.
- Cong bo de thi, theo doi bai nop va tinh trang cham bai.
- Cham cac cau tu luan/chu quan bang diem va nhan xet.
- Chi cong bo diem cho sinh vien khi tat ca cau can cham tay da duoc cham.
- Xem ket qua, thong ke va cac canh bao integrity de danh gia rui ro.

### Admin

- Quan ly nguoi dung, vai tro va cau hinh he thong.
- Theo doi tong quan van hanh, auditability va du lieu demo.
- Ho tro dieu tra, van hanh va cau hinh production.

## 3. Cac quy trinh nghiep vu chinh

### 3.1. Khoa hoc va ghi danh

- Course la don vi hoc phan/lop hoc.
- Enrollment lien ket sinh vien voi course.
- Sinh vien chi duoc truy cap bai thi thuoc course ma minh da ghi danh.
- Du lieu seed demo phai duoc giu nguyen de dam bao cac man hinh demo van hoat dong.

### 3.2. Ngan hang cau hoi va phien ban cau hoi

- Question la dinh danh nghiep vu on dinh cua cau hoi.
- QuestionVersion luu noi dung, dap an, metadata va trang thai tai mot phien ban cu the.
- Khi cau hoi duoc sua, he thong phai tao phien ban moi thay vi ghi de noi dung lich su.
- Bai thi va snapshot nen tham chieu QuestionVersion de bao toan de thi cu.
- AI co the ho tro tao cau hoi nhap, nhung giang vien van la nguoi review va quyet dinh dua cau hoi vao ngan hang.

### 3.3. Tao va cong bo de thi

- Exam luu thong tin chung: ten de, course, lich mo/dong, trang thai, cau hinh attempt va tong quan.
- ExamQuestion gan cau hoi/phien ban cau hoi vao de thi va luu trong so/diem cua cau do.
- Diem khong nen la diem co dinh toan cuc tren Question; trong so thuc te thuoc ve ExamQuestion.
- Khi cong bo de, he thong tao ExamSnapshot/QuestionSnapshot de dong bang cau truc de thi tai thoi diem bat dau/cong bo.
- Sau khi sinh vien bat dau lam bai, payload de thi cua sinh vien phai duoc xem la immutable.

### 3.4. Bat dau bai thi

Khi sinh vien bam bat dau bai thi:

1. He thong kiem tra nguoi dung da dang nhap va co vai tro hop le.
2. He thong kiem tra sinh vien co ghi danh trong course cua exam.
3. He thong kiem tra lich thi, trang thai exam va gioi han attempt.
4. He thong tao hoac tai su dung ExamInstance cho cap exam/student.
5. He thong tao ExamSubmission cho lan lam bai.
6. He thong tao ProctoringSession de ghi nhan integrity events.

Nguyen tac kien truc: moi sinh vien co mot ExamInstance rieng cho mot exam. Submission dai dien cho mot lan nop/attempt.

### 3.5. Lam bai, autosave va nop bai

- Trong qua trinh lam bai, cau tra loi duoc autosave vao SubmissionAnswer.
- Autosave can an toan voi viec goi lap lai va can han che mat du lieu khi reload/truc trac mang.
- Khi nop bai, submission chuyen tu IN_PROGRESS sang SUBMITTING de tranh nop trung.
- He thong tinh diem cac cau objective neu co the cham tu dong.
- Cac loai cau objective hien tai gom: MULTIPLE_CHOICE, MULTI_SELECT va TRUE_FALSE.
- Cac loai cau con lai duoc xem la can cham tay, vi du short answer, essay, matching tuy theo cau hinh.

### 3.6. Cham tay va cong bo diem

Neu bai thi co cau can cham tay:

1. Sau khi sinh vien nop, submission duoc giu o trang thai cho giang vien xu ly, hien tai la SUBMITTED.
2. Giao dien lecturer phai hien ro tien do cham tay cua tung submission.
3. Giang vien vao tung submission de nhap diem va nhan xet cho moi cau can cham.
4. He thong khong cho nhap diem vuot qua diem toi da cua cau.
5. Nut cong bo diem o cap exam chi duoc bat khi tat ca cau can cham tay cua tat ca submission da co diem.
6. Khi cong bo, he thong tinh lai tong diem tu SubmissionAnswer va cap nhat submission thanh GRADED.
7. Sinh vien chi xem ket qua day du sau khi diem da duoc cham/cong bo.

Trong UI sinh vien, cac thong tin noi bo nhu grading history khong can hien thi.

### 3.7. Ket qua va thang diem

- Raw score la tong diem dat duoc theo cac cau trong de.
- Max raw score la tong diem toi da cua exam.
- Diem cuoi cung theo dinh huong nghiep vu nen chuan hoa ve thang diem Viet Nam:

```text
final_score = (raw_score / max_raw_score) * 10
```

- UI co the hien thi raw score, ty le phan tram hoac diem thang 10 tuy theo ngu canh.
- Diem chi nen duoc cong bo khi trang thai submission/exam cho phep sinh vien xem.

### 3.8. Integrity va anti-cheat tracking

He thong ghi nhan cac tin hieu:

- Dia chi IP va user agent.
- Tab switching, focus/blur.
- Tuong tac trong qua trinh lam bai.
- Su kien bat thuong do client gui ve.
- Co nghi van/anomaly flags.

He thong chi danh dau hanh vi dang xem xet. Ket luan cuoi cung thuoc ve giang vien/hoi dong, khong phai ket luan tu dong cua he thong.

### 3.9. Analytics

Du lieu bai thi va bai nop phuc vu:

- Diem trung binh, ti le dat, phan bo diem.
- Do kho cau hoi theo ty le dung/sai.
- Tien do cham bai.
- Theo doi bat thuong trong ky thi.
- Phan tich chat luong cau hoi theo thoi gian va theo phien ban.

## 4. Trang thai nghiep vu

### Exam

- DRAFT: de dang soan.
- PUBLISHED: de da cong bo va co the xuat hien cho sinh vien theo lich.
- ONGOING: de dang trong giai doan thi.
- COMPLETED: de da ket thuc.
- ARCHIVED: de duoc luu tru.

### ExamSubmission

- IN_PROGRESS: sinh vien dang lam bai.
- SUBMITTING: dang xu ly nop bai, dung de tranh nop lap.
- SUBMITTED: da nop, co the dang cho cham tay/cong bo.
- GRADED: da cham xong va co the hien thi ket qua khi nghiep vu cho phep.
- FLAGGED: bai nop co dau hieu can xem xet.
- SUBMIT_FAILED: nop bai gap loi va can xu ly.

Luu y: enum GRADE_PENDING ton tai trong schema de ho tro tien hoa sau nay, nhung luong hien tai dang dung SUBMITTED cho truong hop cho cham tay.

### ExamInstance

- NOT_STARTED: chua bat dau.
- IN_PROGRESS: dang lam bai.
- SUBMITTED: da nop.
- GRADED: da cham xong.
- FLAGGED: can xem xet.
- EXPIRED: het han.

## 5. Thuc the du lieu cot loi

| Thuc the | Y nghia nghiep vu |
| --- | --- |
| User | Tai khoan student, lecturer, admin |
| Course | Hoc phan/lop hoc |
| Enrollment | Ghi danh sinh vien vao course |
| Question | Dinh danh on dinh cua cau hoi |
| QuestionVersion | Noi dung va dap an cua mot phien ban cau hoi |
| QuestionDraft | Ban nhap cau hoi, gom ca cau hoi do AI goi y |
| AIGenerationRecord | Lich su yeu cau va ket qua AI generation |
| Exam | De thi va cau hinh chung |
| ExamQuestion | Cau hoi trong de va trong so/diem cua cau |
| ExamSnapshot | Ban dong bang cua de thi |
| QuestionSnapshot | Ban dong bang noi dung cau hoi trong snapshot |
| ExamInstance | De thi rieng cua mot sinh vien |
| ExamSubmission | Mot lan lam/nop bai |
| SubmissionAnswer | Cau tra loi va diem tung cau |
| ProctoringSession | Phien theo doi integrity trong luc thi |
| IntegrityLog | Su kien bat thuong/tuong tac duoc ghi lai |
| Notification | Thong bao trong he thong |
| EventStore | Su kien he thong phuc vu audit va xu ly bat dong bo |

## 6. Rang buoc quan trong

- Khong reset database va khong xoa seeded data.
- Khong pha vo ID demo hien co.
- Migration phai uu tien ALTER/backfill thay vi drop/recreate.
- Bai thi cu phai giu dung noi dung cau hoi tai thoi diem lam bai.
- QuestionVersion va snapshot la co so cho auditability.
- Cham tay phai co UI cho giang vien nhap diem va nhan xet.
- Cong bo ket qua phai bi chan neu con cau can cham tay chua co diem.
- Sinh vien khong can xem cac thong tin audit noi bo nhu grading history.
- Integrity tracking chi tao canh bao, khong ket luan gian lan.

## 7. Pham vi hien tai va dinh huong tiep theo

Pham vi hien tai tap trung vao MVP co kha nang demo va mo rong:

- Quan ly course, exam, submission va result.
- Cham tu dong cau objective.
- Cham tay cau subjective va cong bo diem sau khi cham xong.
- Theo doi integrity co ban.
- AI-assisted question generation co review.
- Kien truc du lieu co QuestionVersion, ExamInstance va snapshot.

Dinh huong tiep theo:

- Hoan thien migration chuyen exam_questions sang tham chieu questionVersionId mot cach an toan.
- Chuan hoa diem hien thi ve thang 10 o tat ca man hinh.
- Bo sung index/unique constraint cho cac bang nhieu truy van.
- Tang do day audit log va analytics theo QuestionVersion.
- Cai thien offline-capable exam flow va co che dong bo khi mat mang.
