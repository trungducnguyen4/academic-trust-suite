import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Users,
  Shield,
  Settings,
  BarChart3,
  Activity,
  Database,
  ArrowRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import api, { unwrapPaginatedData } from '@/lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  course?: { code: string };
}

interface Submission {
  id: string;
  score: number | null;
  startedAt: string;
  exam?: { title: string };
  student?: { fullName: string; email: string };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, examsRes, submissionsRes, coursesRes] = await Promise.all([
          api.getUsers(),
          api.getExams(),
          api.getSubmissions(),
          api.getCourses(),
        ]);
        setUsers(unwrapPaginatedData(usersRes));
        setExams(unwrapPaginatedData(examsRes));
        setSubmissions(unwrapPaginatedData(submissionsRes));
        setCourses(unwrapPaginatedData(coursesRes));
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate stats from real data
  const now = new Date();
  const activeExams = exams.filter(e => new Date(e.startTime) <= now && new Date(e.endTime) >= now).length;
  const totalUsers = users.length;
  
  const studentCount = users.filter(u => u.role === 'STUDENT').length;
  const lecturerCount = users.filter(u => u.role === 'LECTURER').length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  
  const userBreakdown = [
    { role: 'Students', count: studentCount, percentage: totalUsers ? (studentCount / totalUsers) * 100 : 0 },
    { role: 'Lecturers', count: lecturerCount, percentage: totalUsers ? (lecturerCount / totalUsers) * 100 : 0 },
    { role: 'Administrators', count: adminCount, percentage: totalUsers ? (adminCount / totalUsers) * 100 : 0 },
  ];

  // Recent activity from submissions and users
  const recentActivity = [
    ...submissions.slice(0, 2).map(s => ({
      id: s.id,
      action: `Exam submission: ${s.exam?.title || 'Unknown'}`,
      user: s.student?.fullName || 'Student',
      time: new Date(s.startedAt).toLocaleDateString()
    })),
    ...users.slice(0, 2).map(u => ({
      id: u.id,
      action: `User registered: ${u.role}`,
      user: u.fullName,
      time: new Date(u.createdAt).toLocaleDateString()
    }))
  ].slice(0, 4);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            System Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage the examination platform
          </p>
        </div>

        {/* System Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeExams}</p>
                  <p className="text-sm text-muted-foreground">Active Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{submissions.length}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Distribution</CardTitle>
              <CardDescription>Breakdown by role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userBreakdown.map((item) => (
                <div key={item.role} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{item.role}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Submissions</CardTitle>
                <CardDescription>Latest exam submissions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/admin/integrity">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
                ) : (
                  submissions.slice(0, 3).map((sub) => (
                    <div key={sub.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.exam?.title || 'Unknown Exam'}</p>
                          <p className="text-xs text-muted-foreground">{sub.student?.fullName || 'Unknown Student'}</p>
                        </div>
                        <StatusBadge variant={sub.score !== null ? 'success' : 'warning'}>
                          {sub.score !== null ? `${sub.score}%` : 'Pending'}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(sub.startedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Administration</CardTitle>
            <CardDescription>System management options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/users">
                  <Users className="h-5 w-5" />
                  <span>Manage Users</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/exams">
                  <FileText className="h-5 w-5" />
                  <span>Manage Exams</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/integrity">
                  <Shield className="h-5 w-5" />
                  <span>Review Integrity</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/settings">
                  <Settings className="h-5 w-5" />
                  <span>System Settings</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/courses">
                  <BarChart3 className="h-5 w-5" />
                  <span>Manage Courses</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/question-bank">
                  <BookOpen className="h-5 w-5" />
                  <span>Question Bank</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
