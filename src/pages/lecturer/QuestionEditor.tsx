import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function QuestionEditor() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Question Creation & Metadata Editor</CardTitle>
            <p className="text-muted-foreground mt-2">
              Nhập liệu câu hỏi, chỉnh sửa metadata: độ khó, mục tiêu học tập, phân loại, tags.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Question Input</h2>
              <p>
                Nhập nội dung câu hỏi, đáp án, giải thích.<br />
                <b>Ví dụ:</b> Câu hỏi: "Định nghĩa thuật toán Dijkstra?"
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Metadata Editor</h2>
              <p>
                Chỉnh sửa độ khó, mục tiêu học tập, tags.<br />
                <b>Ví dụ:</b> Độ khó: 0.6, Tags: "Graph", "Shortest Path"
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Preview & Save</h2>
              <p>
                Xem trước câu hỏi, xác nhận lưu vào ngân hàng.<br />
                <b>Ví dụ:</b> Preview: "Định nghĩa thuật toán Dijkstra?" - Độ khó: 0.6
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
