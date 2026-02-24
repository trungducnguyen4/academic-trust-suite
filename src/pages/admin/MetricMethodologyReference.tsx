import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function MetricMethodologyReference() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Academic Metric Methodology Reference</CardTitle>
            <p className="text-muted-foreground mt-2">
              Định nghĩa, công thức và phương pháp tính các chỉ số đảm bảo tính khoa học, minh bạch cho hệ thống đánh giá và kiểm định học thuật.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Difficulty Index (Độ khó)</h2>
              <p>
                <b>Định nghĩa:</b> Tỷ lệ sinh viên trả lời đúng một câu hỏi.<br />
                <b>Công thức:</b> <span className="font-mono">Difficulty = (Số sinh viên trả lời đúng) / (Tổng số sinh viên)</span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Discrimination Index (Độ phân biệt)</h2>
              <p>
                <b>Định nghĩa:</b> Đo lường khả năng phân biệt giữa sinh viên giỏi và yếu.<br />
                <b>Công thức:</b> <span className="font-mono">Discrimination = (Tỷ lệ đúng nhóm giỏi) - (Tỷ lệ đúng nhóm yếu)</span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Reliability (Độ tin cậy)</h2>
              <p>
                <b>Định nghĩa:</b> Độ ổn định của kết quả đánh giá khi lặp lại.<br />
                <b>Công thức:</b> <span className="font-mono">Cronbach's Alpha, Split-half Reliability</span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Integrity Score (Điểm trung thực)</h2>
              <p>
                <b>Định nghĩa:</b> Chỉ số tổng hợp dựa trên hành vi, thời gian, mẫu trả lời và tín hiệu AI.<br />
                <b>Công thức:</b> <span className="font-mono">Tổng hợp các chỉ số: Similarity, Timing, Behavior, Pattern</span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Score Breakdown (Phân tích điểm)</h2>
              <p>
                <b>Định nghĩa:</b> Phân tích chi tiết điểm số theo từng phần, từng kỹ năng.<br />
                <b>Công thức:</b> <span className="font-mono">Score Breakdown = Tổng điểm từng phần / Tổng điểm toàn bài</span>
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Event Timeline Visualization (Minh họa nhật ký sự kiện)</h2>
              <p>
                <b>Định nghĩa:</b> Ghi nhận và minh họa các hành vi, sự kiện trong quá trình thi.<br />
                <b>Phương pháp:</b> Lưu trữ log, phân tích AI, hiển thị trực quan theo thời gian.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">7. AI Cheating Indicator (Chỉ báo gian lận AI)</h2>
              <p>
                <b>Định nghĩa:</b> Chỉ số cảnh báo dựa trên AI về khả năng gian lận.<br />
                <b>Phương pháp:</b> Phân tích mẫu trả lời, thời gian, tín hiệu bất thường, so sánh nguồn ngoài.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">8. Statistical Summary (Tổng hợp thống kê)</h2>
              <p>
                <b>Định nghĩa:</b> Tổng hợp các chỉ số thống kê về kỳ thi, câu hỏi, sinh viên.<br />
                <b>Phương pháp:</b> Sử dụng các chỉ số: Mean, Median, Standard Deviation, Percentile.
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">9. Academic Autonomy (Tính tự chủ học thuật)</h2>
              <p>
                <b>Định nghĩa:</b> Đảm bảo các trường đại học có thể tự cấu hình, kiểm định và giám sát hệ thống.<br />
                <b>Phương pháp:</b> Cho phép cấu hình chỉ số, quy tắc, ngưỡng và báo cáo theo từng trường.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
