import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function QuestionHistoryAnalysis() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Question History & Performance Analysis</CardTitle>
            <p className="text-muted-foreground mt-2">
              Phân tích lịch sử câu hỏi, theo dõi "Difficulty Drift", chất lượng và hiệu quả qua các kỳ thi.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Performance Over Time</h2>
              <p>
                Biểu đồ điểm, độ khó, độ phân biệt qua các kỳ thi.<br />
                <b>Ví dụ:</b> Câu 1: Độ khó tăng từ 0.5 lên 0.7 qua 3 kỳ thi
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Difficulty Drift Tracking</h2>
              <p>
                Theo dõi sự thay đổi độ khó, phân biệt, reliability.<br />
                <b>Ví dụ:</b> Câu 2: Độ phân biệt giảm từ 0.6 xuống 0.4
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Revision History</h2>
              <p>
                Lịch sử chỉnh sửa, cập nhật metadata, nhận xét.<br />
                <b>Ví dụ:</b> Câu 3: Đã chỉnh sửa nhận xét ngày 10/01/2026
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
