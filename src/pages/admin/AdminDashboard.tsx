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
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

// Mock data
const systemStats = {
  totalUsers: 1248,
  activeExams: 12,
  flaggedSubmissions: 3,
  systemHealth: 99.8,
};

const userBreakdown = [
  { role: 'Students', count: 1156, percentage: 92.6 },
  { role: 'Lecturers', count: 84, percentage: 6.7 },
  { role: 'Administrators', count: 8, percentage: 0.6 },
];

const recentActivity = [
  { id: '1', action: 'New exam published', user: 'Dr. Chen', time: '10 min ago' },
  { id: '2', action: 'User role updated', user: 'System', time: '25 min ago' },
  { id: '3', action: 'Integrity flag reviewed', user: 'Admin', time: '1 hour ago' },
  { id: '4', action: 'New lecturer added', user: 'System', time: '2 hours ago' },
];

const integrityAlerts = [
  {
    id: '1',
    examTitle: 'Data Structures Final',
    studentId: 'STU-2024-0892',
    confidence: 'High',
    reason: 'Unusual answer pattern similarity',
  },
  {
    id: '2',
    examTitle: 'Algorithms Midterm',
    studentId: 'STU-2024-1034',
    confidence: 'Medium',
    reason: 'Rapid sequential correct answers',
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();

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
                  <p className="text-2xl font-semibold">{systemStats.totalUsers.toLocaleString()}</p>
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
                  <p className="text-2xl font-semibold">{systemStats.activeExams}</p>
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
                  <p className="text-2xl font-semibold">{systemStats.flaggedSubmissions}</p>
                  <p className="text-sm text-muted-foreground">Flagged</p>
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
                  <p className="text-2xl font-semibold">{systemStats.systemHealth}%</p>
                  <p className="text-sm text-muted-foreground">System Health</p>
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

          {/* Integrity Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Integrity Alerts</CardTitle>
                <CardDescription>Flagged submissions</CardDescription>
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
                {integrityAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.examTitle}</p>
                        <p className="text-xs text-muted-foreground">{alert.studentId}</p>
                      </div>
                      <StatusBadge variant={alert.confidence === 'High' ? 'destructive' : 'warning'}>
                        {alert.confidence}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.reason}</p>
                  </div>
                ))}
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
                <Link to="/admin/reports">
                  <BarChart3 className="h-5 w-5" />
                  <span>View Reports</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
