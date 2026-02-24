import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function TransparencyDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>System Transparency Dashboard</CardTitle>
            <p className="text-muted-foreground mt-2">
              Báo cáo tổng quát về tính minh bạch, thống kê, kiểm định và các quyết định học thuật của hệ thống.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Statistical Summary</h2>
              <p>
                Tổng hợp các chỉ số: số lượng kỳ thi, câu hỏi, sinh viên, điểm trung bình, độ phân biệt, độ khó.<br />
                <b>Ví dụ:</b> 10 kỳ thi, 500 câu hỏi, 200 sinh viên, điểm TB: 7.5
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Integrity Alerts & Evidence</h2>
              <p>
                Báo cáo các cảnh báo AI, bằng chứng trung thực, quyết định của hội đồng.<br />
                <b>Ví dụ:</b> 5 cảnh báo, 2 quyết định "Không gian lận", 1 quyết định "Gian lận"
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Academic Actions</h2>
              <p>
                Quyết định học thuật dựa trên bằng chứng, nhật ký sự kiện, thống kê.<br />
                <b>Ví dụ:</b> Đình chỉ 1 sinh viên, cảnh báo 2 sinh viên
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Audit Log</h2>
              <p>
                Lưu trữ và hiển thị lịch sử hoạt động hệ thống, các lần chỉnh sửa, quyết định.<br />
                <b>Ví dụ:</b> Ngày 10/01/2026: Cập nhật chính sách integrity
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
