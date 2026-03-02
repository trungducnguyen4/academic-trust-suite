import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  Shield,
  Edit2,
  Trash2,
  UserPlus,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
} from 'lucide-react';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  department: string;
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
}

interface APIUser {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
  createdAt: string;
}

const permissions = [
  { key: 'create_exam', label: 'Create Exam', student: false, lecturer: true, admin: true },
  { key: 'take_exam', label: 'Take Exam', student: true, lecturer: false, admin: false },
  { key: 'manage_questions', label: 'Manage Questions', student: false, lecturer: true, admin: true },
  { key: 'view_analytics', label: 'View Analytics', student: false, lecturer: true, admin: true },
  { key: 'monitor_exam', label: 'Monitor Exam', student: false, lecturer: true, admin: true },
  { key: 'manage_users', label: 'Manage Users', student: false, lecturer: false, admin: true },
  { key: 'configure_policies', label: 'Configure Policies', student: false, lecturer: false, admin: true },
  { key: 'view_audit_logs', label: 'View Audit Logs', student: false, lecturer: false, admin: true },
  { key: 'view_results', label: 'View Own Results', student: true, lecturer: false, admin: false },
  { key: 'view_all_results', label: 'View All Results', student: false, lecturer: true, admin: true },
];

export default function UserRoleManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // New user form
  const [newUser, setNewUser] = useState({
    name: '', email: '', role: 'student' as User['role'], department: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.getUsers(undefined, page, ITEMS_PER_PAGE);
        const rawData = res?.data ?? res;
        const data = Array.isArray(rawData) ? rawData : [];
        setTotalPages(res?.totalPages ?? 1);
        setTotalUsers(res?.total ?? data.length);
        const mapped: User[] = data.map((u: APIUser) => ({
          id: u.id.slice(0, 8),
          name: u.fullName,
          email: u.email,
          role: u.role.toLowerCase() as User['role'],
          department: 'General',
          status: 'active' as const,
          lastLogin: '-',
          createdAt: new Date(u.createdAt).toISOString().split('T')[0],
        }));
        setUsers(mapped);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page]);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleAddUser = async () => {
    setAdding(true);
    try {
      const created = await api.register({
        email: newUser.email,
        password: '123456', // default password
        fullName: newUser.name,
        role: newUser.role.toUpperCase() as 'STUDENT' | 'LECTURER' | 'ADMIN',
      });
      const mapped: User = {
        id: created.user.id.slice(0, 8),
        name: created.user.fullName,
        email: created.user.email,
        role: newUser.role,
        department: newUser.department || 'General',
        status: 'active',
        lastLogin: '-',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([mapped, ...users]);
      setNewUser({ name: '', email: '', role: 'student', department: '' });
      setShowAddDialog(false);
    } catch (err) {
      console.error('Failed to add user:', err);
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = (id: string) => {
    setUsers(users.map((u) => {
      if (u.id !== id) return u;
      return { ...u, status: u.status === 'active' ? 'suspended' as const : 'active' as const };
    }));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  const changeRole = (id: string, role: User['role']) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === 'student').length,
    lecturers: users.filter((u) => u.role === 'lecturer').length,
    admins: users.filter((u) => u.role === 'admin').length,
  };

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
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">User & Role Management</h1>
            <p className="text-muted-foreground">Manage user accounts, role assignments, and permissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPermDialog(true)} className="gap-2">
              <Shield className="h-4 w-4" /> Permissions Matrix
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="e.g., Nguyen Van A" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="e.g., user@university.edu" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as User['role'] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input placeholder="e.g., Computer Science" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={adding || !newUser.name || !newUser.email}>
                    {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-semibold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-2xl font-semibold">{stats.students}</p><p className="text-xs text-muted-foreground">Students</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><Users className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-2xl font-semibold">{stats.lecturers}</p><p className="text-xs text-muted-foreground">Lecturers</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><Shield className="h-5 w-5 text-purple-600" /></div>
              <div><p className="text-2xl font-semibold">{stats.admins}</p><p className="text-xs text-muted-foreground">Admins</p></div>
            </div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" /> Export</Button>
            </div>
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-32">Last Login</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id} className={user.status === 'suspended' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(v) => changeRole(user.id, v as User['role'])}>
                        <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">{user.department}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'destructive' : 'warning'}
                      >
                        {user.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="sm" title={user.status === 'active' ? 'Suspend' : 'Activate'} onClick={() => toggleStatus(user.id)}>
                          {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" title="Delete" onClick={() => deleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalUsers} total)
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}

          </CardContent>
        </Card>

        {/* Permissions Matrix Dialog */}
        <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Role Permissions Matrix</DialogTitle>
              <DialogDescription>Overview of permissions assigned to each role</DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead className="text-center">Student</TableHead>
                  <TableHead className="text-center">Lecturer</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="text-sm">{p.label}</TableCell>
                    <TableCell className="text-center">
                      {p.student ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.lecturer ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.admin ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
