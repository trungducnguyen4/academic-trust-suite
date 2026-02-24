import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ExamEventTimeline() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Exam Event Timeline</CardTitle>
            <p className="text-muted-foreground mt-2">
              Nhật ký chi tiết các sự kiện, hành vi trong quá trình thi, giúp minh bạch và kiểm định trung thực.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Event Log Visualization</h2>
              <p>
                Hiển thị các sự kiện: đăng nhập, bắt đầu thi, trả lời, tạm dừng, nộp bài.<br />
                <b>Ví dụ:</b> 09:00 - Đăng nhập; 09:05 - Bắt đầu thi; 09:10 - Trả lời câu 1; ...
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Anomalous Behavior Detection</h2>
              <p>
                Phân tích AI phát hiện hành vi bất thường: chuyển tab, thời gian trả lời quá nhanh/chậm.<br />
                <b>Ví dụ:</b> Cảnh báo: Chuyển tab 3 lần trong 5 phút.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Integrity Notes</h2>
              <p>
                Ghi chú về các sự kiện liên quan đến trung thực học thuật.<br />
                <b>Ví dụ:</b> Hệ thống ghi nhận nghi vấn gian lận ở câu 5.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
