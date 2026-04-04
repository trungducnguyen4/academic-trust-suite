import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  AlertTriangle,
  Shield,
  Eye,
  Globe,
  Search,
  RefreshCw,
  Monitor,
  Wifi,
  Ban,
  Flag,
  CheckCircle2,
  XCircle,
  Activity,
  MousePointerClick,
} from 'lucide-react';
import api, { unwrapPaginatedData } from '@/lib/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StudentSession {
  id: string; // submission id when available, otherwise enrollment id
  submissionId: string | null;
  userId: string;
  name: string;
  studentId: string;
  ip: string;
  status: 'in_progress' | 'submitted' | 'not_joined' | 'flagged' | 'disconnected';
  progress: number;
  score: number | null;
  tabSwitches: number;
  mouseAnomalies: number;
  startedAt: string | null;
  submittedAt: string | null;
  flagReason: string | null;
}

interface IntegrityAlert {
  id: string;
  submissionId: string | null;
  studentName: string;
  type: 'tab_switch' | 'similarity' | 'timing' | 'ip_anomaly' | 'mouse_pattern';
  message: string;
  severity: 'warning' | 'critical';
  time: string;
}

type ExamOverview = {
  exam?: { totalPoints?: number };
  anomalies?: Array<{
    id: string;
    eventType: string;
    details?: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    student?: { fullName?: string } | null;
    submissionId?: string | null;
  }>;
};

const mapSubmissionStatus = (status?: string): StudentSession['status'] => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'IN_PROGRESS') return 'in_progress';
  if (normalized === 'SUBMITTED' || normalized === 'GRADED') return 'submitted';
  if (normalized === 'FLAGGED') return 'flagged';
  return 'not_joined';
};

const mapEventTypeToAlertType = (eventType?: string): IntegrityAlert['type'] => {
  const event = String(eventType || '').toLowerCase();
  if (event.includes('tab')) return 'tab_switch';
  if (event.includes('mouse')) return 'mouse_pattern';
  if (event.includes('ip')) return 'ip_anomaly';
  if (event.includes('timing')) return 'timing';
  return 'similarity';
};

export default function ExamMonitor() {
  const { id } = useParams();
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [examTitle, setExamTitle] = useState('Live Exam Monitor');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedAlertIds, setResolvedAlertIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());

  const loadMonitorData = async (silent = false) => {
    if (!id) return;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const [examRes, submissionsRes, overviewRes] = await Promise.all([
        api.getExam(id),
        api.getExamSubmissions(id, 1, 200),
        api.getExamOverview(id),
      ]);

      setExamTitle(examRes?.title || 'Live Exam Monitor');

      const overview = (overviewRes || {}) as ExamOverview;
      const submissions = unwrapPaginatedData<any>(submissionsRes);

      const courseId = examRes?.courseId;
      let enrollments: any[] = [];
      if (courseId) {
        enrollments = await api.getCourseEnrollments(courseId);
      }

      const submissionByStudentId = new Map<string, any>();
      for (const submission of submissions) {
        if (submission?.student?.id) {
          submissionByStudentId.set(submission.student.id, submission);
        }
      }

      const anomalyBySubmissionId = new Map<string, { tab: number; mouse: number }>();
      for (const anomaly of overview.anomalies || []) {
        if (!anomaly?.submissionId) continue;
        const current = anomalyBySubmissionId.get(anomaly.submissionId) || { tab: 0, mouse: 0 };
        const event = String(anomaly.eventType || '').toLowerCase();
        if (event.includes('tab')) current.tab += 1;
        if (event.includes('mouse')) current.mouse += 1;
        anomalyBySubmissionId.set(anomaly.submissionId, current);
      }

      const joinedRows: StudentSession[] = enrollments.map((enrollment) => {
        const student = enrollment.student;
        const submission = student?.id ? submissionByStudentId.get(student.id) : null;
        const anomalyCount = submission?.id ? anomalyBySubmissionId.get(submission.id) : undefined;
        const status = submission ? mapSubmissionStatus(submission.status) : 'not_joined';

        return {
          id: submission?.id || enrollment.id,
          submissionId: submission?.id || null,
          userId: student?.id || '',
          name: student?.fullName || 'Unknown student',
          studentId: student?.studentId || '-',
          ip: '-',
          status,
          progress: status === 'submitted' ? 100 : status === 'in_progress' ? 50 : 0,
          score: submission?.score ?? null,
          tabSwitches: anomalyCount?.tab || 0,
          mouseAnomalies: anomalyCount?.mouse || 0,
          startedAt: submission?.startedAt ? new Date(submission.startedAt).toLocaleTimeString() : null,
          submittedAt: submission?.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString() : null,
          flagReason: status === 'flagged' ? 'Submission flagged' : null,
        };
      });

      setStudents(joinedRows);

      const mappedAlerts: IntegrityAlert[] = (overview.anomalies || []).map((anomaly) => ({
        id: anomaly.id,
        submissionId: anomaly.submissionId || null,
        studentName: anomaly.student?.fullName || 'Unknown student',
        type: mapEventTypeToAlertType(anomaly.eventType),
        message: anomaly.details || anomaly.eventType || 'Suspicious activity detected',
        severity: anomaly.severity === 'high' ? 'critical' : 'warning',
        time: new Date(anomaly.timestamp).toLocaleTimeString(),
      }));
      setAlerts(mappedAlerts);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load monitor data');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMonitorData(false);
  }, [id]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMonitorData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, id]);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: students.length,
    inProgress: students.filter((s) => s.status === 'in_progress').length,
    submitted: students.filter((s) => s.status === 'submitted').length,
    flagged: students.filter((s) => s.status === 'flagged').length,
    notJoined: students.filter((s) => s.status === 'not_joined').length,
    disconnected: students.filter((s) => s.status === 'disconnected').length,
  };

  const unresolvedAlerts = useMemo(
    () => alerts.filter((a) => !resolvedAlertIds.has(a.id)),
    [alerts, resolvedAlertIds],
  );

  const resolveAlert = (alertId: string) => {
    setResolvedAlertIds((prev) => new Set(prev).add(alertId));
  };

  const flagStudent = async (submissionId: string, reason: string) => {
    if (!submissionId) return;
    try {
      await api.updateSubmissionStatus(submissionId, 'FLAGGED');
      await loadMonitorData(true);
      setStudents((prev) => prev.map((s) => (
        s.submissionId === submissionId ? { ...s, status: 'flagged', flagReason: reason } : s
      )));
    } catch (err) {
      console.error('Failed to flag submission', err);
    }
  };

  // Score distribution chart
  const submittedScores = students.filter((s) => s.score !== null).map((s) => s.score!);
  const chartData = {
    labels: ['0-50', '51-60', '61-70', '71-80', '81-90', '91-100'],
    datasets: [{
      label: 'Students',
      data: [
        submittedScores.filter((s) => s <= 50).length,
        submittedScores.filter((s) => s > 50 && s <= 60).length,
        submittedScores.filter((s) => s > 60 && s <= 70).length,
        submittedScores.filter((s) => s > 70 && s <= 80).length,
        submittedScores.filter((s) => s > 80 && s <= 90).length,
        submittedScores.filter((s) => s > 90).length,
      ],
      backgroundColor: 'rgba(37, 99, 235, 0.7)',
      borderRadius: 4,
    }],
  };

  const statusIcon = (status: StudentSession['status']) => {
    switch (status) {
      case 'in_progress': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'submitted': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'not_joined': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'flagged': return <Flag className="h-4 w-4 text-red-600" />;
      case 'disconnected': return <XCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const statusVariant = (status: StudentSession['status']) => {
    switch (status) {
      case 'in_progress': return 'info' as const;
      case 'submitted': return 'success' as const;
      case 'not_joined': return 'default' as const;
      case 'flagged': return 'destructive' as const;
      case 'disconnected': return 'warning' as const;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          asChild
        >
          <Link to="/lecturer">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {examTitle}
              <span className="ml-3 text-sm font-normal text-muted-foreground">(Exam #{id})</span>
            </h1>
            <p className="text-muted-foreground">
              Real-time monitoring of student sessions, integrity alerts, and score distribution
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
            <span>Last refresh: {lastRefresh}</span>
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button
              variant="outline" size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadMonitorData(true)}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-red-200">
            <CardContent className="pt-4 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mb-4">
            <CardContent className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading monitor data...
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <Card><CardContent className="pt-3 pb-3 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-semibold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <Activity className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-semibold text-blue-600">{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">In Progress</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-semibold text-green-600">{stats.submitted}</p>
            <p className="text-[10px] text-muted-foreground">Submitted</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <Flag className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-semibold text-red-600">{stats.flagged}</p>
            <p className="text-[10px] text-muted-foreground">Flagged</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-semibold">{stats.notJoined}</p>
            <p className="text-[10px] text-muted-foreground">Not Joined</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <XCircle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-xl font-semibold text-yellow-600">{stats.disconnected}</p>
            <p className="text-[10px] text-muted-foreground">Disconnected</p>
          </CardContent></Card>
        </div>

        {/* Integrity Alerts */}
        {unresolvedAlerts.length > 0 && (
          <Card className="mb-6 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Integrity Alerts ({unresolvedAlerts.length} unresolved)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unresolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {alert.type === 'tab_switch' && <Eye className="h-4 w-4" />}
                    {alert.type === 'similarity' && <Shield className="h-4 w-4" />}
                    {alert.type === 'timing' && <Clock className="h-4 w-4" />}
                    {alert.type === 'ip_anomaly' && <Globe className="h-4 w-4" />}
                    {alert.type === 'mouse_pattern' && <MousePointerClick className="h-4 w-4" />}
                    <div>
                      <p className="text-sm font-medium">{alert.studentName}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                    <StatusBadge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                      {alert.severity}
                    </StatusBadge>
                    <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Student Table - 2 cols */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Student Sessions</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="flagged">Flagged</SelectItem>
                        <SelectItem value="not_joined">Not Joined</SelectItem>
                        <SelectItem value="disconnected">Disconnected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-center">Tab Sw.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id} className={s.status === 'flagged' ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.studentId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-xs">{s.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span>{s.progress}%</span>
                              {s.score !== null && <span className="font-medium">{s.score}pts</span>}
                            </div>
                            <Progress value={s.progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${s.tabSwitches > 2 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {s.tabSwitches}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {statusIcon(s.status)}
                            <StatusBadge variant={statusVariant(s.status)}>
                              {s.status.replace('_', ' ')}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.status === 'in_progress' && s.submissionId && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-red-600 text-xs"
                              onClick={() => flagStudent(s.submissionId!, 'Manually flagged by instructor')}
                            >
                              <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                            </Button>
                          )}
                          {s.status === 'flagged' && (
                            <Button variant="ghost" size="sm" className="text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" /> Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Score Distribution Chart - 1 col */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score Distribution</CardTitle>
              <CardDescription>{stats.submitted} submitted so far</CardDescription>
            </CardHeader>
            <CardContent>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                }}
              />
              {stats.submitted > 0 && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average:</span>
                    <span className="font-medium">
                      {Math.round(submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Highest:</span>
                    <span className="font-medium text-green-600">{Math.max(...submittedScores)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lowest:</span>
                    <span className="font-medium text-red-600">{Math.min(...submittedScores)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
