import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function AdvancedExamRuleConfig() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Exam Rule Configuration</CardTitle>
            <p className="text-muted-foreground mt-2">
              Cấu hình chi tiết các quy tắc phát hành đề thi: phân bổ độ khó, độ phủ kiến thức, thuật toán xáo trộn, ngưỡng integrity.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Difficulty Distribution</h2>
              <p>
                Cấu hình tỷ lệ câu hỏi dễ, trung bình, khó.<br />
                <b>Ví dụ:</b> 30% dễ, 50% trung bình, 20% khó
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Knowledge Coverage</h2>
              <p>
                Đảm bảo đề thi phủ đủ các chủ đề, kỹ năng.<br />
                <b>Ví dụ:</b> 5 chủ đề: Thuật toán, Cấu trúc dữ liệu, Logic, Lập trình, Phân tích
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Shuffle Algorithm</h2>
              <p>
                Thuật toán xáo trộn câu hỏi, đáp án.<br />
                <b>Ví dụ:</b> Xáo trộn ngẫu nhiên, xáo trộn theo nhóm chủ đề
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Integrity Thresholds</h2>
              <p>
                Cấu hình ngưỡng cảnh báo trung thực, AI flag.<br />
                <b>Ví dụ:</b> Ngưỡng similarity: 80%, ngưỡng timing anomaly: 3 lần
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
