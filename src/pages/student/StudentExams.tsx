import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function StudentExams() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await api.getAvailableExams();
        if (mounted) setExams(data || []);
      } catch (err) {
        console.error('Failed to load exams', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exams</h1>
          <p className="text-muted-foreground mt-1">Available examinations for you</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Exams</CardTitle>
            <CardDescription>Start or review exam details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {exams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No available exams</p>
                  </div>
                ) : (
                  exams.map((exam: any) => (
                    <div key={exam.id} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{exam.title}</h4>
                        <p className="text-sm text-muted-foreground">{exam.course?.code ?? exam.course}</p>
                        {exam.startTime && (
                          <p className="text-xs text-muted-foreground">{new Date(exam.startTime).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm">
                          <Link to={`/student/exam-ready?examId=${exam.id}`}>Start</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/student/grading?examId=${exam.id}`}>Result</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
