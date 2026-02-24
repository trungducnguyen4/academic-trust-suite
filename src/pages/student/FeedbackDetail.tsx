import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function FeedbackDetail() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Learning Feedback & Insights</CardTitle>
            <p className="text-muted-foreground mt-2">
              Phân tích chi tiết kết quả thi, phản hồi cá nhân hóa giúp sinh viên cải thiện kỹ năng và kiến thức.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Score Breakdown</h2>
              <p>
                Xem chi tiết điểm số theo từng phần: Lý thuyết, thực hành, kỹ năng.<br />
                <b>Ví dụ:</b> Lý thuyết: 8/10, Thực hành: 7/10, Kỹ năng: 5/10
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Answer Pattern Analysis</h2>
              <p>
                Phân tích mẫu trả lời, nhận diện điểm mạnh/yếu, đề xuất cải thiện.<br />
                <b>Ví dụ:</b> Bạn thường trả lời đúng các câu về thuật toán, cần cải thiện phần logic.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Learning Recommendations</h2>
              <p>
                Đề xuất tài liệu, khóa học, bài tập phù hợp dựa trên kết quả.<br />
                <b>Ví dụ:</b> Nên luyện thêm bài tập về cấu trúc dữ liệu.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Feedback History</h2>
              <p>
                Xem lại các phản hồi trước đây, tiến trình học tập qua các kỳ thi.<br />
                <b>Ví dụ:</b> Điểm trung bình tăng 10% so với kỳ trước.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
