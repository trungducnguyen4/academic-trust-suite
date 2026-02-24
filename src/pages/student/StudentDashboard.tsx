import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Calendar, 
  Clock, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { format, formatDistanceToNow, addDays, addHours } from 'date-fns';
import { Link } from 'react-router-dom';
import type { UpcomingExam, ExamHistoryItem } from '@/types/exam';

// Mock data with one exam today
const upcomingExams: UpcomingExam[] = [
  {
    id: '1',
    title: 'Data Structures Final Exam',
    course: 'CS201',
    scheduledAt: addDays(new Date(), 2),
    duration: 120,
  },
  {
    id: '2',
    title: 'Algorithms Midterm',
    course: 'CS301',
    scheduledAt: addDays(new Date(), 5),
    duration: 90,
  },
  {
    id: '3',
    title: 'Database Systems Quiz',
    course: 'CS401',
    scheduledAt: addDays(new Date(), 7),
    duration: 45,
  },
  {
    id: '4',
    title: 'Data Structures Final Exam',
    course: 'CS201',
    scheduledAt: new Date(),
    duration: 120,
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
                    const examCard = (
                      <div
                        className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground">{exam.title}</h4>
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
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">Today</span>
                            ) : (
                              <span className="ml-2 text-xs text-muted-foreground">{formatDistanceToNow(exam.scheduledAt, { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                        {isToday ? (
                          <Button size="sm" asChild>
                            <Link to="/student/exam-ready">Start Now</Link>
                          </Button>
                        ) : (
                          <StatusBadge variant="info">
                            {formatDistanceToNow(exam.scheduledAt, { addSuffix: true })}
                          </StatusBadge>
                        )}
                      </div>
                    );
                    return isToday ? (
                      <Link key={exam.id} to="/student/exam-ready" style={{ textDecoration: 'none' }}>
                        {examCard}
                      </Link>
                    ) : (
                      <div key={exam.id}>{examCard}</div>
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
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
