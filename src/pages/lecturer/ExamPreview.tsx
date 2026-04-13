import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Share2, QrCode } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, BookOpen, PencilLine, ArrowLeft, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmails, setShareEmails] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [sendToCourse, setSendToCourse] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

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

  const handleShare = async () => {
    if (!exam) return;
    const raw = (shareEmails || '').trim();
    if (!raw) {
      toast.error('Please enter recipient email(s)');
      return;
    }
    const emails = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!emails.length) {
      toast.error('Please enter valid email address(es)');
      return;
    }
    try {
      setIsSharing(true);
      await api.shareExam(exam.id, emails, sendToCourse);
      toast.success('Exam link sent');
      setShowShareDialog(false);
      setShareEmails('');
      setSendToCourse(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send exam link');
    } finally {
      setIsSharing(false);
    }
  };

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
        {/* <BackToDashboardButton to="/lecturer" className="-ml-2" /> */}

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

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowQRDialog(true)}>
              <QrCode className="h-4 w-4 mr-1" />
              Show QR
            </Button>
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
        </div>

        {/* Share dialog */}
        <Dialog open={showShareDialog} onOpenChange={(open) => setShowShareDialog(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Exam Link</DialogTitle>
              <DialogDescription>Enter recipient email addresses (comma separated)</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Label htmlFor="share-emails">Emails</Label>
              <Input
                id="share-emails"
                placeholder="teacher@example.com, parent@example.com"
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
              />
            </div>
            <div className="mt-3 flex items-start gap-2">
              <Checkbox checked={sendToCourse} onCheckedChange={(v: any) => setSendToCourse(!!v)} />
              <div>
                <p className="text-sm font-medium">Send to all students enrolled in this course</p>
                <p className="text-xs text-muted-foreground">Adds all enrolled students as recipients in addition to addresses above.</p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <div className="flex gap-2 justify-end w-full">
                <Button variant="ghost" onClick={() => setShowShareDialog(false)}>Cancel</Button>
                <Button onClick={handleShare} disabled={isSharing}>{isSharing ? 'Sending...' : 'Send'}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR dialog */}
        <Dialog open={showQRDialog} onOpenChange={(open) => setShowQRDialog(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exam QR</DialogTitle>
              <DialogDescription>Show this QR on your monitor for students to scan</DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-center">
              <img
                alt="Exam QR"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=720x720&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/student/exam-ready?examId=${exam?.id}`)}`}
                style={{ width: 560, height: 560 }}
              />
              <div className="mt-4">
                <Button asChild>
                  <Link to={`/lecturer/exam/${exam?.id}/qr`}>
                    Open Full Screen
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
