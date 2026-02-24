import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Plus,
  FileText, 
  Users,
  AlertTriangle,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { Link } from 'react-router-dom';
import type { Exam, ExamStatus } from '@/types/exam';

// Mock data
const recentExams: (Exam & { submissionCount?: number; averageScore?: number })[] = [
  {
    id: '4',
    title: 'Operating Systems Final',
    course: 'CS305',
    duration: 120,
    totalQuestions: 40,
    status: 'ongoing',
    scheduledAt: new Date(),
    createdAt: addDays(new Date(), -2),
    createdBy: '2',
    submissionCount: 3,
  },
  {
    id: '1',
    title: 'Data Structures Final Exam',
    course: 'CS201',
    duration: 120,
    totalQuestions: 50,
    status: 'published',
    scheduledAt: addDays(new Date(), 2),
    createdAt: addDays(new Date(), -5),
    createdBy: '2',
    submissionCount: 0,
  },
  {
    id: '2',
    title: 'Algorithms Midterm',
    course: 'CS301',
    duration: 90,
    totalQuestions: 35,
    status: 'completed',
    scheduledAt: addDays(new Date(), -3),
    createdAt: addDays(new Date(), -10),
    createdBy: '2',
    submissionCount: 48,
    averageScore: 76,
  },
  {
    id: '3',
    title: 'Programming Quiz 3',
    course: 'CS101',
    duration: 30,
    totalQuestions: 20,
    status: 'draft',
    createdAt: addDays(new Date(), -1),
    createdBy: '2',
  },
];

const alerts = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'Low Quality Questions',
    message: '3 questions in "Algorithms Midterm" have low discrimination index',
    time: addHours(new Date(), -2),
  },
  {
    id: '2',
    type: 'info' as const,
    title: 'Submission Complete',
    message: 'All students have completed "Database Systems Quiz"',
    time: addHours(new Date(), -8),
  },
];

const statusConfig: Record<ExamStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  draft: { label: 'Draft', variant: 'default' },
  published: { label: 'Published', variant: 'info' },
  ongoing: { label: 'Ongoing', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  archived: { label: 'Archived', variant: 'default' },
};

export default function LecturerDashboard() {
  const { user } = useAuth();

  const stats = {
    totalExams: recentExams.length,
    activeExams: recentExams.filter((e) => e.status === 'published' || e.status === 'ongoing').length,
    totalSubmissions: recentExams.reduce((acc, e) => acc + (e.submissionCount || 0), 0),
    questionsInBank: 256,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back, {user?.name.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your exams and review student performance
            </p>
          </div>
          <Button asChild>
            <Link to="/lecturer/exams/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.totalExams}</p>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.activeExams}</p>
                  <p className="text-sm text-muted-foreground">Active Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.totalSubmissions}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
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
                  <p className="text-2xl font-semibold">{stats.questionsInBank}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Exams */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Exams</CardTitle>
                  <CardDescription>Your latest examinations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link to="/lecturer/exams">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentExams.map((exam) => {
                    const status = statusConfig[exam.status];
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{exam.title}</h4>
                            <StatusBadge variant={status.variant}>
                              {status.label}
                            </StatusBadge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{exam.course}</span>
                            <span>{exam.totalQuestions} questions</span>
                            <span>{exam.duration} min</span>
                          </div>
                        </div>
                        {exam.status === 'completed' && exam.averageScore !== undefined && (
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                              {exam.averageScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Avg. Score
                            </p>
                          </div>
                        )}
                        {exam.status === 'published' && exam.scheduledAt && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {format(exam.scheduledAt, 'MMM d')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Scheduled
                            </p>
                          </div>
                        )}
                        {exam.status === 'ongoing' && (
                          <div className="text-right">
                            <Button size="sm" asChild>
                              <Link to={`/lecturer/exam/${exam.id}/monitor`}>
                                Giám sát
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alerts</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        {alert.type === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-info mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {alert.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/lecturer/exams/create">
                  <Plus className="h-5 w-5" />
                  <span>Create Exam</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/lecturer/questions">
                  <BookOpen className="h-5 w-5" />
                  <span>Question Bank</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/lecturer/analytics">
                  <BarChart3 className="h-5 w-5" />
                  <span>View Analytics</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/lecturer/exams">
                  <FileText className="h-5 w-5" />
                  <span>Manage Exams</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
