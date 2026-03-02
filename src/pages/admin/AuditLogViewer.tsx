import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Download,
  RefreshCw,
  Eye,
  Shield,
  User,
  Settings,
  FileText,
  LogIn,
  LogOut,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: 'student' | 'lecturer' | 'admin';
  action: string;
  resource: string;
  ip: string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
}

const mockLogs: AuditLog[] = [
  { id: 'LOG-001', timestamp: '2024-01-15 14:32:05', user: 'admin@university.edu', role: 'admin', action: 'Policy Update', resource: 'System Policy', ip: '10.0.1.15', severity: 'warning', details: 'Changed global similarity threshold from 75% to 80%' },
  { id: 'LOG-002', timestamp: '2024-01-15 14:28:11', user: 'lecturer@university.edu', role: 'lecturer', action: 'Exam Created', resource: 'Final Exam - CS101', ip: '192.168.1.42', severity: 'info', details: 'Created exam with 40 questions, 90min duration, fullscreen enforced' },
  { id: 'LOG-003', timestamp: '2024-01-15 14:15:44', user: 'student@university.edu', role: 'student', action: 'Integrity Flag', resource: 'Midterm - CS201', ip: '172.16.0.88', severity: 'critical', details: 'Tab switch count exceeded threshold (8/5). Auto-flagged for review.' },
  { id: 'LOG-004', timestamp: '2024-01-15 13:55:20', user: 'admin@university.edu', role: 'admin', action: 'Role Changed', resource: 'User: john.doe@edu', ip: '10.0.1.15', severity: 'warning', details: 'Changed role from student to lecturer' },
  { id: 'LOG-005', timestamp: '2024-01-15 13:40:00', user: 'lecturer@university.edu', role: 'lecturer', action: 'Question Deleted', resource: 'Question Bank - CS101', ip: '192.168.1.42', severity: 'info', details: 'Deleted question Q-412 (Multiple Choice)' },
  { id: 'LOG-006', timestamp: '2024-01-15 13:22:33', user: 'student2@university.edu', role: 'student', action: 'Login', resource: 'Authentication', ip: '172.16.0.91', severity: 'info', details: 'Successful login via SSO' },
  { id: 'LOG-007', timestamp: '2024-01-15 13:10:15', user: 'admin@university.edu', role: 'admin', action: 'User Suspended', resource: 'User: suspect@edu', ip: '10.0.1.15', severity: 'critical', details: 'Account suspended due to multiple integrity violations' },
  { id: 'LOG-008', timestamp: '2024-01-15 12:58:40', user: 'lecturer@university.edu', role: 'lecturer', action: 'Exam Link Generated', resource: 'Final Exam - CS101', ip: '192.168.1.42', severity: 'info', details: 'Generated exam link with code EXAM-2024-A1. Max usage: 50. Expiry: 7 days.' },
  { id: 'LOG-009', timestamp: '2024-01-15 12:45:00', user: 'student3@university.edu', role: 'student', action: 'Login Failed', resource: 'Authentication', ip: '203.0.113.55', severity: 'warning', details: 'Failed login attempt (3/5). Wrong password.' },
  { id: 'LOG-010', timestamp: '2024-01-15 12:30:22', user: 'admin@university.edu', role: 'admin', action: 'Backup Started', resource: 'System', ip: '10.0.1.15', severity: 'info', details: 'Manual database backup initiated' },
  { id: 'LOG-011', timestamp: '2024-01-15 12:15:10', user: 'student@university.edu', role: 'student', action: 'Exam Submitted', resource: 'Midterm - CS201', ip: '172.16.0.88', severity: 'info', details: 'Submitted 35/40 questions. Duration: 78min. Score: 7.5/10' },
  { id: 'LOG-012', timestamp: '2024-01-15 11:55:44', user: 'lecturer2@university.edu', role: 'lecturer', action: 'AI Generation', resource: 'Question Bank - ML301', ip: '192.168.1.60', severity: 'info', details: 'Generated 15 questions from uploaded PDF (12 approved, 3 rejected)' },
  { id: 'LOG-013', timestamp: '2024-01-15 11:30:00', user: 'student4@university.edu', role: 'student', action: 'Integrity Flag', resource: 'Quiz - MATH101', ip: '172.16.0.95', severity: 'critical', details: 'Answer similarity 92% detected with student5@university.edu' },
  { id: 'LOG-014', timestamp: '2024-01-15 11:10:20', user: 'admin@university.edu', role: 'admin', action: 'Maintenance Mode', resource: 'System', ip: '10.0.1.15', severity: 'warning', details: 'Maintenance mode enabled for scheduled update' },
  { id: 'LOG-015', timestamp: '2024-01-15 10:45:33', user: 'lecturer@university.edu', role: 'lecturer', action: 'Course Created', resource: 'Courses', ip: '192.168.1.42', severity: 'info', details: 'Created course "Advanced Algorithms" (CS501)' },
];

const SEVERITY_CONFIG = {
  info: { variant: 'secondary' as const, icon: Info, color: 'text-blue-500' },
  warning: { variant: 'outline' as const, icon: AlertTriangle, color: 'text-amber-500' },
  critical: { variant: 'destructive' as const, icon: Shield, color: 'text-red-500' },
};

const ACTION_ICONS: Record<string, typeof User> = {
  'Login': LogIn,
  'Login Failed': LogIn,
  'Logout': LogOut,
  'Role Changed': User,
  'User Suspended': User,
  'Policy Update': Settings,
  'Maintenance Mode': Settings,
  'Backup Started': Settings,
  'Integrity Flag': Shield,
  'Exam Created': FileText,
  'Exam Submitted': FileText,
  'Exam Link Generated': FileText,
  'Question Deleted': FileText,
  'AI Generation': FileText,
  'Course Created': FileText,
};

const PAGE_SIZE = 10;

export default function AuditLogViewer() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const uniqueActions = [...new Set(mockLogs.map((l) => l.action))];

  const filtered = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchSearch =
        !search ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.resource.toLowerCase().includes(search.toLowerCase()) ||
        log.ip.includes(search) ||
        log.id.toLowerCase().includes(search.toLowerCase());
      const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
      const matchRole = roleFilter === 'all' || log.role === roleFilter;
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      return matchSearch && matchSeverity && matchRole && matchAction;
    });
  }, [search, severityFilter, roleFilter, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: mockLogs.length,
    critical: mockLogs.filter((l) => l.severity === 'critical').length,
    warning: mockLogs.filter((l) => l.severity === 'warning').length,
    today: mockLogs.length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost" size="sm"
              className="mb-2 gap-2 text-muted-foreground -ml-2"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Audit Log Viewer</h1>
            <p className="text-muted-foreground">View and search all system activity logs</p>
          </div>
          <div className="flex gap-2 mt-8">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Total Entries</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Critical Events</div>
              <div className="text-2xl font-semibold text-red-600">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Warnings</div>
              <div className="text-2xl font-semibold text-amber-600">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Today's Logs</div>
              <div className="text-2xl font-semibold">{stats.today}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, action, resource, IP, or log ID..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Activity Logs ({filtered.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No logs match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((log) => {
                    const sev = SEVERITY_CONFIG[log.severity];
                    const ActionIcon = ACTION_ICONS[log.action] || FileText;
                    return (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.id}</TableCell>
                        <TableCell className="text-xs">{log.timestamp}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{log.user}</span>
                            <Badge variant="outline" className="text-[10px] px-1">{log.role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{log.resource}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip}</TableCell>
                        <TableCell>
                          <Badge variant={sev.variant}>{log.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Detail — {selectedLog?.id}</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Timestamp</span>
                    <p className="font-medium">{selectedLog.timestamp}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Severity</span>
                    <div className="mt-0.5">
                      <Badge variant={SEVERITY_CONFIG[selectedLog.severity].variant}>
                        {selectedLog.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User</span>
                    <p className="font-medium">{selectedLog.user}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role</span>
                    <p className="font-medium capitalize">{selectedLog.role}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action</span>
                    <p className="font-medium">{selectedLog.action}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP Address</span>
                    <p className="font-mono">{selectedLog.ip}</p>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource</span>
                  <p className="font-medium">{selectedLog.resource}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Details</span>
                  <p className="bg-muted rounded p-3 mt-1">{selectedLog.details}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
