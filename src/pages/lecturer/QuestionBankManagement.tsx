import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function QuestionBankManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Question Bank Management</CardTitle>
            <p className="text-muted-foreground mt-2">
              Quản lý danh sách câu hỏi, chỉ số chất lượng, lịch sử chỉnh sửa và phân tích psychometrics.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Question List</h2>
              <p>
                Hiển thị danh sách câu hỏi, trạng thái, độ khó, độ phân biệt.<br />
                <b>Ví dụ:</b> Câu 1: Độ khó 0.7, Độ phân biệt 0.4
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Question Metrics</h2>
              <p>
                Phân tích psychometrics: Difficulty, Discrimination, Reliability.<br />
                <b>Ví dụ:</b> Câu 2: Reliability 0.85
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Edit & History</h2>
              <p>
                Lịch sử chỉnh sửa, cập nhật metadata, tracking "Difficulty Drift".<br />
                <b>Ví dụ:</b> Câu 3: Độ khó tăng từ 0.5 lên 0.7 qua 3 kỳ thi
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
