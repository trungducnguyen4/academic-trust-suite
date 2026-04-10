import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  FileText,
  Users,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Search,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api, { unwrapPaginatedData } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';

interface Exam {
  id: string;
  title: string;
  description?: string;
  course: { id: string; code: string; name: string };
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  totalPoints?: number;
  passingScore?: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  _count?: {
    examQuestions: number;
    submissions: number;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'destructive' }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  PUBLISHED: { label: 'Published', variant: 'info' },
  ONGOING: { label: 'Ongoing', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'destructive' },
};

export default function ExamManagement() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', passingScore: '' });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await api.getExams();
      const exams = unwrapPaginatedData(data);
      setExams(exams || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    try {
      setIsDeleting(true);
      await api.deleteExam(selectedExam.id);
      setExams(exams.filter(e => e.id !== selectedExam.id));
      toast.success('Exam deleted successfully');
      setShowDeleteDialog(false);
      setSelectedExam(null);
    } catch (error) {
      console.error('Failed to delete exam:', error);
      toast.error('Failed to delete exam');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setEditForm({
      title: exam.title,
      description: exam.description || '',
      passingScore: exam.passingScore?.toString() || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedExam) return;
    try {
      setIsUpdating(true);
      const updateData: any = {
        title: editForm.title,
        description: editForm.description,
      };
      if (editForm.passingScore) {
        updateData.passingScore = parseInt(editForm.passingScore, 10);
      }
      await api.updateExam(selectedExam.id, updateData);
      
      // Update local state
      setExams(exams.map(e => 
        e.id === selectedExam.id 
          ? { ...e, ...updateData }
          : e
      ));
      
      toast.success('Exam updated successfully');
      setShowEditDialog(false);
      setSelectedExam(null);
    } catch (error) {
      console.error('Failed to update exam:', error);
      toast.error('Failed to update exam');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.title.toLowerCase().includes(search.toLowerCase()) ||
      exam.course.code.toLowerCase().includes(search.toLowerCase()) ||
      exam.course.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: exams.length,
    published: exams.filter(e => e.status === 'PUBLISHED').length,
    ongoing: exams.filter(e => e.status === 'ONGOING').length,
    draft: exams.filter(e => e.status === 'DRAFT').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading exams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Exam Management</h1>
            <p className="text-muted-foreground">Create, manage, and monitor your exams</p>
          </div>
          <Button onClick={() => navigate('/lecturer/exams/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.published}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.ongoing}</p>
                  <p className="text-xs text-muted-foreground">Ongoing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Draft</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Exams</CardTitle>
                <CardDescription>Manage, edit, and monitor your exams</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exams or courses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">
                  {exams.length === 0 ? 'No exams created yet' : 'No exams match your filters'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {exams.length === 0 ? 'Create your first exam to get started' : 'Try adjusting your search'}
                </p>
                {exams.length === 0 && (
                  <Button onClick={() => navigate('/lecturer/exams/create')} className="mt-4" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-center">Duration</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead className="text-center">Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam) => {
                      const createdAgo = formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true });
                      return (
                        <TableRow key={exam.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-mono"> {exam.course.code}</div>
                              <div className="text-xs text-muted-foreground">{exam.course.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{exam.duration} min</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{exam._count?.examQuestions || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">{exam._count?.submissions || 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={statusConfig[exam.status]?.variant || 'default'}
                              className="text-xs"
                            >
                              {statusConfig[exam.status]?.label || exam.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{createdAgo}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => navigate(`/lecturer/exam/${exam.id}/preview`)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                {(exam.status === 'ONGOING' || exam.status === 'PUBLISHED') && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/lecturer/exam/${exam.id}/monitor`)}
                                    className="gap-2"
                                  >
                                    <Clock className="h-4 w-4" />
                                    Monitor
                                  </DropdownMenuItem>
                                )}
                                {(exam.status === 'COMPLETED' || (exam._count?.submissions ?? 0) > 0) && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/lecturer/exam/${exam.id}/results`)}
                                    className="gap-2"
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                    Results
                                  </DropdownMenuItem>
                                )}
                                {exam.status === 'DRAFT' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEditExam(exam)}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedExam(exam);
                                        setShowDeleteDialog(true);
                                      }}
                                      className="gap-2 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
            <DialogDescription>Update exam details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Exam title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Exam description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={editForm.passingScore}
                onChange={(e) => setEditForm(prev => ({ ...prev, passingScore: e.target.value }))}
                placeholder="Passing score (0-100)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmActionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete exam"
        description={`Are you sure you want to delete "${selectedExam?.title}"? This action cannot be undone.`}
        actionLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteExam}
        isDangerous
      />
    </DashboardLayout>
  );
}
