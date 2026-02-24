import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function GradingBreakdown() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Grading Breakdown & Transparency</CardTitle>
            <p className="text-muted-foreground mt-2">
              Minh bạch chi tiết cách chấm điểm, phân biệt giữa chấm tự động và thủ công.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Auto-Graded Questions</h2>
              <p>
                Hiển thị các câu hỏi được chấm tự động, kết quả và tiêu chí.<br />
                <b>Ví dụ:</b> Câu 1: Đúng, Câu 2: Sai, Câu 3: Đúng
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Manual Grading</h2>
              <p>
                Hiển thị các câu hỏi được chấm thủ công, nhận xét của giảng viên.<br />
                <b>Ví dụ:</b> Câu 4: Đúng, Nhận xét: "Diễn giải tốt"; Câu 5: Sai, Nhận xét: "Thiếu ví dụ minh họa"
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Score Calculation</h2>
              <p>
                Công thức tính điểm tổng, điểm từng phần.<br />
                <b>Ví dụ:</b> Tổng điểm = Điểm tự động + Điểm thủ công
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Grading History</h2>
              <p>
                Xem lại lịch sử chấm điểm, các lần chỉnh sửa, nhận xét.<br />
                <b>Ví dụ:</b> Câu 4: Đã chỉnh sửa nhận xét ngày 10/01/2026
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
