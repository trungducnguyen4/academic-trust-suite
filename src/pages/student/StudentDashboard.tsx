import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Download,
  Lock,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow, addDays, addHours } from 'date-fns';
import { Link } from 'react-router-dom';
import type { UpcomingExam, ExamHistoryItem } from '@/types/exam';

// Mock data with one exam today
const upcomingExams: (UpcomingExam & { requiresDownload?: boolean })[] = [
  {
    id: '1',
    title: 'Data Structures Final Exam',
    course: 'CS201',
    scheduledAt: addDays(new Date(), 2),
    duration: 120,
    requiresDownload: true,
  },
  {
    id: '2',
    title: 'Algorithms Midterm',
    course: 'CS301',
    scheduledAt: addDays(new Date(), 5),
    duration: 90,
    requiresDownload: true,
  },
  {
    id: '3',
    title: 'Database Systems Quiz',
    course: 'CS401',
    scheduledAt: new Date(),
    duration: 45,
    requiresDownload: false,
  },
  {
    id: '4',
    title: 'Data Structures Final Exam',
    course: 'CS201',
    scheduledAt: new Date(),
    duration: 120,
    requiresDownload: true,
  },
];

const examHistory: ExamHistoryItem[] = [
  {
    id: '1',
    title: 'Programming Fundamentals',
    course: 'CS101',
    score: 87,
    maxScore: 100,
    passed: true,
    completedAt: addDays(new Date(), -7),
  },
  {
    id: '2',
    title: 'Discrete Mathematics',
    course: 'MATH201',
    score: 72,
    maxScore: 100,
    passed: true,
    completedAt: addDays(new Date(), -14),
  },
  {
    id: '3',
    title: 'Computer Architecture',
    course: 'CS202',
    score: 45,
    maxScore: 100,
    passed: false,
    completedAt: addDays(new Date(), -21),
  },
];

const notifications = [
  {
    id: '1',
    type: 'info' as const,
    message: 'Results for "Programming Fundamentals" are now available',
    time: addHours(new Date(), -2),
  },
  {
    id: '2',
    type: 'warning' as const,
    message: 'Reminder: "Data Structures Final Exam" starts in 2 days',
    time: addHours(new Date(), -5),
  },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  // Track download state per exam: undefined = not started, 0-99 = downloading, 100 = done
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const handleDownload = async (examId: string) => {
    setDownloadProgress((p) => ({ ...p, [examId]: 0 }));
    for (let i = 2; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 40));
      setDownloadProgress((p) => ({ ...p, [examId]: i }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            You have {upcomingExams.length} upcoming exams
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{upcomingExams.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {examHistory.filter((e) => e.passed).length}/{examHistory.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Exams Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {Math.round(examHistory.reduce((acc, e) => acc + e.score, 0) / examHistory.length)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming Exams */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Upcoming Exams</CardTitle>
                  <CardDescription>Your scheduled examinations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link to="/student/exams">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingExams.map((exam) => {
                    const isToday = exam.scheduledAt.toDateString() === new Date().toDateString();
                    const progress = downloadProgress[exam.id];
                    const isDownloading = progress !== undefined && progress < 100;
                    const isDownloaded = progress === 100;
                    const needsDownload = exam.requiresDownload === true;
                    const startUrl = `/student/exam-ready?examId=${exam.id}&download=false&title=${encodeURIComponent(exam.title)}&course=${encodeURIComponent(exam.course)}&duration=${exam.duration}`;

                    // CTA for today's exams
                    const todayCTA = needsDownload ? (
                      isDownloaded ? (
                        // Downloaded but locked — waiting for lecturer
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                          <Lock className="h-4 w-4" />
                          Waiting for unlock
                        </div>
                      ) : isDownloading ? (
                        // Actively downloading
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Downloading {progress}%
                          </div>
                          <Progress value={progress} className="h-1.5 w-28" />
                        </div>
                      ) : (
                        // Not yet downloaded
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(exam.id); }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download to unlock
                        </Button>
                      )
                    ) : (
                      // No download required — open directly
                      <Button size="sm" asChild>
                        <Link to={startUrl}>Start Now</Link>
                      </Button>
                    );

                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{exam.title}</h4>
                            {needsDownload && isDownloaded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">LOCKED</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" />
                              {exam.course}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(exam.scheduledAt, 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {exam.duration} min
                            </span>
                            {isToday ? (
                              <span className="px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">Today</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(exam.scheduledAt, { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                        {isToday ? todayCTA : (
                          <StatusBadge variant="info">
                            {formatDistanceToNow(exam.scheduledAt, { addSuffix: true })}
                          </StatusBadge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Recent updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        notification.type === 'warning' ? 'bg-warning' : 'bg-info'
                      }`} />
                      <div className="space-y-1">
                        <p className="text-sm text-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.time, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Results</CardTitle>
              <CardDescription>Your exam history and scores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to="/student/results">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examHistory.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/student/grading?examId=${exam.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      exam.passed ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {exam.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{exam.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {exam.course} • {format(exam.completedAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">
                      {exam.score}/{exam.maxScore}
                    </p>
                    <StatusBadge variant={exam.passed ? 'success' : 'destructive'}>
                      {exam.passed ? 'Passed' : 'Failed'}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
