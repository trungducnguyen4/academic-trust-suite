import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function ExamQR() {
  const { id } = useParams();
  const [exam, setExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      try {
        const res = await api.getExam(id);
        if (mounted) setExam(res);
      } catch (err) {
        console.error('Failed to load exam for QR', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const link = typeof window !== 'undefined' && id ? `${window.location.origin}/student/exam-ready?examId=${id}` : '';

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4">{exam?.title || 'Exam QR'}</h2>
                <div className="mx-auto mb-4">
                  <img
                    alt="Exam QR"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(link)}`}
                    style={{ width: 640, height: 640 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Ask students to scan the QR code displayed on the monitor to join the exam.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
