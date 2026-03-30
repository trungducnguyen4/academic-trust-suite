import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, BookOpen, PencilLine, ArrowLeft, BarChart3 } from 'lucide-react';
import api from '@/lib/api';

type ExamQuestion = {
  id: string;
  orderIndex: number;
  question: {
    id: string;
    type: string;
    content: string;
    difficulty?: number;
    points?: number;
  };
};

type ExamData = {
  id: string;
  title: string;
  description?: string;
  status: string;
  startTime?: string | null;
  duration: number;
  course?: { code?: string; name?: string };
  examQuestions: ExamQuestion[];
};

function normalizeType(rawType?: string) {
  if (!rawType) return 'Unknown';
  return rawType
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export default function ExamPreview() {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const res = await api.getExam(examId);
        setExam(res);
      } catch (error) {
        console.error('Failed to load exam preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  const timeline = useMemo(() => {
    if (!exam?.startTime) {
      return { isScheduled: false, isEnded: false, start: null as Date | null, end: null as Date | null };
    }

    const now = Date.now();
    const start = new Date(exam.startTime);
    const end = new Date(start.getTime() + (exam.duration || 0) * 60000);

    return {
      start,
      end,
      isScheduled: now < start.getTime(),
      isEnded: now > end.getTime(),
    };
  }, [exam]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Exam not found.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Button variant="ghost" className="px-0" onClick={() => navigate('/lecturer/exams')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Exams
            </Button>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {exam.course?.code ? `${exam.course.code} - ${exam.course?.name || ''}` : exam.course?.name || 'No course'}
            </p>
          </div>

          {timeline.isEnded ? (
            <Button asChild>
              <Link to={`/lecturer/exam/${exam.id}/results`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Results
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/lecturer/question-bank">Open Question Bank</Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Preview</CardTitle>
            <CardDescription>Review questions before students start the exam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {exam.duration} min</span>
              <span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4" /> {exam.examQuestions?.length || 0} questions</span>
              {timeline.start && (
                <Badge variant={timeline.isScheduled ? 'secondary' : timeline.isEnded ? 'destructive' : 'default'}>
                  {timeline.isScheduled ? `Scheduled ${format(timeline.start, 'MMM d, HH:mm')}` : timeline.isEnded ? 'Exam Ended' : 'Exam Ongoing'}
                </Badge>
              )}
            </div>

            {exam.description ? (
              <p className="text-sm text-muted-foreground">{exam.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {timeline.isEnded ? 'Exam has ended. Editing is locked in this view.' : 'Preview and edit individual questions.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!exam.examQuestions?.length ? (
              <div className="py-8 text-center text-muted-foreground">No questions attached to this exam.</div>
            ) : (
              <div className="space-y-4">
                {exam.examQuestions.map((eq, index) => (
                  <div key={eq.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Q{index + 1}</Badge>
                        <Badge variant="secondary">{normalizeType(eq.question?.type)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Difficulty: {eq.question?.difficulty ?? '-'} | Points: {eq.question?.points ?? '-'}
                      </div>
                    </div>

                    <p className="text-sm whitespace-pre-wrap">{eq.question?.content || 'No content'}</p>
                    <Separator />

                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" disabled={timeline.isEnded} asChild>
                        <Link to={`/lecturer/question-editor?id=${eq.question.id}`}>
                          <PencilLine className="h-4 w-4 mr-1" />
                          Edit Question
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
