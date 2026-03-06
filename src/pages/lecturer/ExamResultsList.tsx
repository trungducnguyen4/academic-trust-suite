import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { unwrapPaginatedData } from '@/lib/api';

function formatTimeSpent(start?: string | null, end?: string | null) {
  if (!start || !end) return '-';
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ExamResultsList() {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const [examTitle, setExamTitle] = useState('Exam Results');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchData = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const [examRes, subsRes] = await Promise.all([
          api.getExam(examId),
          api.getExamSubmissions(examId, page, ITEMS_PER_PAGE),
        ]);
        setExamTitle(examRes?.title || 'Exam Results');
        const data = unwrapPaginatedData(subsRes);
        setSubmissions(data);
        setTotalPages(subsRes?.totalPages ?? 1);
        setTotal(subsRes?.total ?? data.length);
      } catch (err) {
        console.error('Failed to load exam results', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, page]);

  const filtered = submissions.filter((s) => {
    if (!search) return true;
    const name = s.student?.fullName || '';
    const sid = s.student?.studentId || '';
    return name.toLowerCase().includes(search.toLowerCase()) || sid.toLowerCase().includes(search.toLowerCase());
  });

  const handleExport = async (format = 'csv') => {
    if (!examId) return;
    try {
      // Use fetch directly to receive CSV with correct headers
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.REACT_APP_API_BASE || 'http://localhost:3001/api'}/submissions/exam/${examId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${examTitle.replace(/\s+/g, '_') || 'exam'}-results.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error', err);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Student Exam Results List - {examTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search by Name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={() => handleExport('csv')}>Export to CSV</Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>Export to CSV/PDF</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Score (Points)</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <a className="text-blue-600 hover:underline" onClick={() => navigate(`/lecturer/exam/${examId}/monitor`)}>{s.student?.fullName || '—'}</a>
                      </TableCell>
                      <TableCell>{s.student?.studentId || s.student?.id}</TableCell>
                      <TableCell>{s.score != null ? `${s.score}% | ${s.score}/${s.exam?.totalPoints ?? '-'}` : '-'}</TableCell>
                      <TableCell>{formatTimeSpent(s.startedAt, s.submittedAt)}</TableCell>
                      <TableCell>{s.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lt;</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&gt;</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
