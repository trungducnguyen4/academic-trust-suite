import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Mock data
const students = [
  { id: 's1', name: 'Nguyen Van A', joined: true, score: 85, flagged: false },
  { id: 's2', name: 'Tran Thi B', joined: true, score: 72, flagged: true },
  { id: 's3', name: 'Le Van C', joined: false, score: null, flagged: false },
  { id: 's4', name: 'Pham Thi D', joined: true, score: 90, flagged: false },
  { id: 's5', name: 'Hoang Van E', joined: true, score: 60, flagged: true },
];

const chartData = {
  labels: ['0-50', '51-70', '71-85', '86-100'],
  datasets: [
    {
      label: 'Số lượng thí sinh',
      data: [1, 1, 2, 1],
      backgroundColor: 'rgba(37, 99, 235, 0.7)',
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Phân bố điểm số' },
  },
  scales: {
    y: { beginAtZero: true, stepSize: 1 },
  },
};

export default function ExamMonitor() {
  const { id } = useParams();
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Giám sát kỳ thi (ID: {id})</h1>
          <Button asChild>
            <Link to="/lecturer/exams">Quay lại danh sách kỳ thi</Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Danh sách thí sinh */}
          <Card>
            <CardHeader>
              <CardTitle>Thí sinh đã vào phòng</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tên</th>
                    <th className="text-left">Trạng thái</th>
                    <th className="text-left">Điểm</th>
                    <th className="text-left">Giám sát</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2">{s.name}</td>
                      <td>{s.joined ? 'Đã vào' : 'Chưa vào'}</td>
                      <td>{s.score !== null ? s.score : '-'}</td>
                      <td>
                        {s.joined ? (
                          <Button size="sm" variant={s.flagged ? 'destructive' : 'outline'}>
                            {s.flagged ? 'Flagged' : 'Monitor'}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {/* Biểu đồ điểm số */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê điểm số</CardTitle>
            </CardHeader>
            <CardContent>
              <Bar data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
