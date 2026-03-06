import { useState, useEffect } from 'react';
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
  Loader2,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { format, addHours } from 'date-fns';
import { Link } from 'react-router-dom';
import api, { unwrapPaginatedData } from '@/lib/api';

interface Exam {
  id: string;
  title: string;
  course: { code: string; name: string };
  duration: number;
  totalPoints: number;
  status: string;
  startTime: string | null;
  createdAt: string;
  _count?: { examQuestions: number; submissions: number };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  PUBLISHED: { label: 'Published', variant: 'info' },
  ONGOING: { label: 'Ongoing', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'default' },
};

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [examsData, questionsData] = await Promise.all([
          api.getExams(),
          api.getQuestions(),
        ]);
        setExams(unwrapPaginatedData(examsData));
        setQuestionCount(unwrapPaginatedData(questionsData).length);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const alerts: { id: string; type: 'info' | 'warning'; title: string; message: string; time: Date }[] = [
    {
      id: '1',
      type: 'info',
      title: 'Dashboard Ready',
      message: `You have ${exams.length} exams and ${questionCount} questions in your bank`,
      time: addHours(new Date(), -2),
    },
  ];

  const stats = {
    totalExams: exams.length,
    activeExams: exams.filter((e) => e.status === 'PUBLISHED' || e.status === 'ONGOING').length,
    totalSubmissions: exams.reduce((acc, e) => acc + (e._count?.submissions || 0), 0),
    questionsInBank: questionCount,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="animate-fade-in opacity-0">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.fullName.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your exams today.
            </p>
          </div>
          <Button asChild className="rounded-xl shadow-sm gap-2 shine animate-fade-in opacity-0" style={{ animationDelay: '0.1s' }}>
            <Link to="/lecturer/exams/create">
              <Plus className="h-4 w-4" />
              Create Exam
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Exams', value: stats.totalExams, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10', gradient: 'card-gradient-blue', trend: '+2 this month' },
            { label: 'Active Exams', value: stats.activeExams, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-500/10', gradient: 'card-gradient-violet', trend: 'In progress' },
            { label: 'Submissions', value: stats.totalSubmissions, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10', gradient: 'card-gradient-emerald', trend: 'Total received' },
            { label: 'Questions', value: stats.questionsInBank, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-500/10', gradient: 'card-gradient-amber', trend: 'In question bank' },
          ].map((stat, i) => (
            <Card key={stat.label} className={`card-elevated ${stat.gradient} animate-fade-in-up opacity-0 stagger-${i + 1}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Exams */}
          <div className="lg:col-span-2">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Recent Exams</CardTitle>
                  <CardDescription>Your latest examinations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1 rounded-xl" asChild>
                  <Link to="/lecturer/exams">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exams.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No exams created yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your first exam to get started</p>
                      <Button asChild className="mt-4 rounded-xl" size="sm">
                        <Link to="/lecturer/exams/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Exam
                        </Link>
                      </Button>
                    </div>
                  ) : exams.slice(0, 4).map((exam, i) => {
                    const status = statusConfig[exam.status] || statusConfig.DRAFT;
                    const questionCount = exam._count?.examQuestions || 0;
                    return (
                      <div
                        key={exam.id}
                        className={`flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-secondary/50 hover:border-primary/10 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-semibold text-foreground">{exam.title}</h4>
                            <StatusBadge variant={status.variant}>
                              {status.label}
                            </StatusBadge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">{exam.course?.code}</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {questionCount} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exam.duration} min
                            </span>
                          </div>
                        </div>
                        {exam.status === 'COMPLETED' && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              {exam._count?.submissions || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submissions
                            </p>
                          </div>
                        )}
                        {exam.status === 'PUBLISHED' && exam.startTime && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {format(new Date(exam.startTime), 'MMM d')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Scheduled
                            </p>
                          </div>
                        )}
                        {exam.status === 'ONGOING' && (
                          <Button size="sm" className="rounded-xl" asChild>
                            <Link to={`/lecturer/exam/${exam.id}/monitor`}>
                              Monitor
                            </Link>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Notifications</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                      {alert.type === 'warning' ? (
                        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-info" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {alert.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Quick Action */}
            <Card className="card-elevated overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">Generate questions with AI</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Use AI to auto-generate exam questions from your course content.
                </p>
                <Button asChild variant="outline" className="w-full rounded-xl gap-2" size="sm">
                  <Link to="/lecturer/question-bank">
                    <Zap className="h-4 w-4" />
                    Open Question Bank
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: Plus, label: 'Create Exam', href: '/lecturer/exams/create', color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { icon: BookOpen, label: 'Question Bank', href: '/lecturer/question-bank', color: 'text-violet-600', bg: 'bg-violet-500/10' },
                { icon: BarChart3, label: 'View Analytics', href: '/lecturer/analytics', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { icon: FileText, label: 'Manage Exams', href: '/lecturer/exams', color: 'text-amber-600', bg: 'bg-amber-500/10' },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-5 flex-col gap-3 rounded-xl border-border/50 hover:border-primary/20 hover:bg-secondary/50 transition-all"
                  asChild
                >
                  <Link to={action.href}>
                    <div className={`h-10 w-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
