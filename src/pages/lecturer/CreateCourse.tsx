import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Plus,
  BookOpen,
  Users,
  Edit2,
  Trash2,
  Search,
  GraduationCap,
  Loader2,
  Upload,
  FileSpreadsheet,
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
} from 'lucide-react';
import api, { unwrapPaginatedData } from '@/lib/api';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  description?: string;
  credits?: number;
  students: number;
  exams: number;
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
}

interface APICourse {
  id: string;
  code: string;
  name: string;
  description?: string;
  semester?: string;
  credits?: number;
  status?: string;
  createdAt: string;
  _count?: {
    enrollments?: number;
    exams?: number;
  };
}

interface StudentSearchResult {
  id: string;
  email: string;
  fullName: string;
  studentId: string | null;
  department: string | null;
}

interface EnrollResult {
  email: string;
  fullName?: string;
  studentId?: string | null;
  status: 'success' | 'failed' | 'provisioned';
  reason?: string;
}

const toAsciiUpper = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toUpperCase();

const buildToken = (value: string, maxLength: number, fallback: string) => {
  const compact = toAsciiUpper(value)
    .split(/\s+/)
    .filter(Boolean)
    .join('');
  return (compact.slice(0, maxLength) || fallback).toUpperCase();
};

export default function CreateCourse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Multi-step wizard
  const [step, setStep] = useState<1 | 2>(1);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [createdCourseCode, setCreatedCourseCode] = useState('');

  // Form state
  const [newCourse, setNewCourse] = useState({
    name: '',
    semester: '2025-2026/2',
    description: '',
    credits: '',
  });

  const [editCourse, setEditCourse] = useState({
    code: '',
    name: '',
    semester: '',
    description: '',
    credits: '',
  });

  const previewCourseCode = `${buildToken(newCourse.name, 6, 'COURSE')}-${buildToken(user?.fullName || user?.email || '', 4, 'USER')}-XX`;

  // Student enrollment state
  const [enrollTab, setEnrollTab] = useState<'manual' | 'import'>('manual');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollResults, setEnrollResults] = useState<EnrollResult[]>([]);
  const [provisionedCount, setProvisionedCount] = useState(0);
  const [csvText, setCsvText] = useState('');
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = unwrapPaginatedData(await api.getCourses());
        const safeIso = (raw?: any) => {
          if (!raw) return '—';
          const d = new Date(raw);
          if (isNaN(d.getTime())) return typeof raw === 'string' ? raw : '—';
          return d.toISOString().split('T')[0];
        };
        const mapped: Course[] = data.map((c: APICourse) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          semester: c.semester || 'N/A',
          description: c.description,
          credits: c.credits,
          // Accept multiple possible shapes returned by the backend:
          // - admin list: _count.enrollments / _count.exams
          // - lecturer-specific endpoints: enrolledStudents / exams
          // - generic: students / exams
          students: (c as any).students ?? (c as any).enrolledStudents ?? c._count?.enrollments ?? 0,
          exams: (c as any).exams ?? c._count?.exams ?? 0,
          status: (c.status?.toLowerCase() as Course['status']) || 'draft',
          createdAt: safeIso(c.createdAt),
        }));
        setCourses(mapped);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  // Search students by name or email
  const handleStudentSearch = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      setIsSearching(true);
      const students = await api.getStudents();
      const q = query.toLowerCase();
      const filtered = students.filter((s: StudentSearchResult) =>
        s.email.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        (s.studentId && s.studentId.toLowerCase().includes(q))
      ).filter((s: StudentSearchResult) => !selectedStudents.some(sel => sel.id === s.id));
      setSearchResults(filtered.slice(0, 10));
    } catch (err) {
      console.error('Failed to search students:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedStudents]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      handleStudentSearch(studentSearch);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [studentSearch, handleStudentSearch]);

  const addStudent = (student: StudentSearchResult) => {
    setSelectedStudents(prev => [...prev, student]);
    setSearchResults(prev => prev.filter(s => s.id !== student.id));
    setStudentSearch('');
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // CSV / Excel file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = parseEmailsFromCSV(text);
      setCsvEmails(emails);
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const parseEmailsFromCSV = (text: string): string[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const emails: string[] = [];
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      for (const part of parts) {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
          emails.push(part.toLowerCase());
        }
      }
    }
    return [...new Set(emails)];
  };

  const handlePasteEmails = (text: string) => {
    setCsvText(text);
    const emails = parseEmailsFromCSV(text);
    setCsvEmails(emails);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const created = await api.createCourse({
        name: newCourse.name,
        description: newCourse.description || undefined,
        credits: newCourse.credits ? parseInt(newCourse.credits) : undefined,
        semester: newCourse.semester,
      });
      const mapped: Course = {
        id: created.id,
        code: created.code,
        name: created.name,
        semester: newCourse.semester,
        students: 0,
        exams: 0,
        status: 'active',
        createdAt: (() => {
          const d = new Date(created.createdAt);
          return isNaN(d.getTime()) ? (typeof created.createdAt === 'string' ? created.createdAt : '—') : d.toISOString().split('T')[0];
        })(),
      };
      setCourses(prev => [mapped, ...prev]);
      setCreatedCourseId(created.id);
      setCreatedCourseCode(created.code);
      setStep(2);
      toast.success('Course created successfully');
    } catch (err) {
      console.error('Failed to create course:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourse({
      code: course.code,
      name: course.name,
      semester: course.semester || '',
      description: course.description || '',
      credits: course.credits ? String(course.credits) : '',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingCourseId) return;

    setIsUpdating(true);
    try {
      const updated = await api.updateCourse(editingCourseId, {
        name: editCourse.name,
        semester: editCourse.semester || undefined,
        description: editCourse.description || undefined,
        credits: editCourse.credits ? Number(editCourse.credits) : undefined,
      });

      setCourses((prev) =>
        prev.map((course) =>
          course.id === editingCourseId
            ? {
                ...course,
                code: updated.code,
                name: updated.name,
                semester: updated.semester || course.semester,
                description: updated.description,
                credits: updated.credits,
              }
            : course,
        ),
      );

      setShowEditDialog(false);
      toast.success('Course updated successfully');
    } catch (err) {
      console.error('Failed to update course:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEnrollStudents = async () => {
    if (!createdCourseId) return;
    setIsEnrolling(true);
    setEnrollResults([]);

    try {
      if (enrollTab === 'manual' && selectedStudents.length > 0) {
        const result = await api.bulkEnroll(createdCourseId, selectedStudents.map(s => s.id));
        const results: EnrollResult[] = [
          ...result.success.map((id: string) => {
            const student = selectedStudents.find(s => s.id === id);
            return { email: student?.email || id, fullName: student?.fullName, studentId: student?.studentId, status: 'success' as const };
          }),
          ...result.failed.map((f: { studentId: string; reason: string }) => {
            const student = selectedStudents.find(s => s.id === f.studentId);
            return { email: student?.email || f.studentId, status: 'failed' as const, reason: f.reason };
          }),
        ];
        setEnrollResults(results);
        const successCount = result.success.length;
        setCourses(prev => prev.map(c => c.id === createdCourseId ? { ...c, students: c.students + successCount } : c));
      } else if (enrollTab === 'import' && csvEmails.length > 0) {
        const result = await api.bulkEnrollByEmails(createdCourseId, csvEmails);
        const results: EnrollResult[] = [
          ...result.success.map((s: any) => ({
            email: s.email,
            fullName: s.fullName,
            studentId: s.studentId,
            // Backend provisioned flag isn't per-item, so just mark as success
            status: 'success' as const,
          })),
          ...result.failed.map((f: any) => ({ email: f.email, status: 'failed' as const, reason: f.reason })),
        ];
        setEnrollResults(results);
        setProvisionedCount(result.provisioned ?? 0);
        const successCount = result.success.length;
        setCourses(prev => prev.map(c => c.id === createdCourseId ? { ...c, students: c.students + successCount } : c));
      }
    } catch (err) {
      console.error('Failed to enroll students:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setTimeout(() => {
      setStep(1);
      setCreatedCourseId(null);
    setCreatedCourseCode('');
    setNewCourse({ name: '', semester: '2025-2026/2', description: '', credits: '' });
      setSelectedStudents([]);
      setSearchResults([]);
      setStudentSearch('');
      setCsvText('');
      setCsvEmails([]);
      setCsvFileName('');
      setEnrollResults([]);
      setProvisionedCount(0);
      setEnrollTab('manual');
    }, 200);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
      toast.success('Course deleted successfully');
    } catch (err) {
      console.error('Failed to delete course:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const statusVariant = (status: Course['status']) => {
    switch (status) {
      case 'active': return 'success' as const;
      case 'archived': return 'default' as const;
      case 'draft': return 'warning' as const;
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'email\nstudent@examtrust.edu\nstudent2@examtrust.edu\nstudent3@examtrust.edu';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="max-w-5xl mx-auto">
        {/* <BackToDashboardButton to="/lecturer" className="mb-4 -ml-2" /> */}

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Course Management</h1>
            <p className="text-muted-foreground">Create and manage your courses</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setShowCreateDialog(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
                  Course Info
                </div>
                <div className="h-px w-8 bg-border" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
                  Add Students
                </div>
              </div>

              {/* === STEP 1: Course Information === */}
              {step === 1 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">Create New Course</DialogTitle>
                    <DialogDescription>Fill in the course details. You can add students in the next step.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="courseCode">Course Code (auto-generated)</Label>
                        <Input
                          id="courseCode"
                          value={previewCourseCode}
                          className="font-mono"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="semester">Semester</Label>
                        <Select
                          value={newCourse.semester}
                          onValueChange={(v) => setNewCourse({ ...newCourse, semester: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025-2026/2">2025-2026 / Semester 2</SelectItem>
                            <SelectItem value="2025-2026/1">2025-2026 / Semester 1</SelectItem>
                            <SelectItem value="2026-2027/1">2026-2027 / Semester 1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="courseName">Course Name *</Label>
                        <Input
                          id="courseName"
                          placeholder="e.g., Advanced Algorithms"
                          value={newCourse.name}
                          onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credits">Credits</Label>
                        <Input
                          id="credits"
                          type="number"
                          placeholder="e.g., 3"
                          value={newCourse.credits}
                          onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief course description..."
                        value={newCourse.description}
                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={isCreating || !newCourse.name} className="gap-2">
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Create & Add Students
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* === STEP 2: Add Students === */}
              {step === 2 && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Course Created — Add Students
                    </DialogTitle>
                    <DialogDescription>
                      <span className="font-semibold text-foreground">{createdCourseCode || previewCourseCode}</span> — {newCourse.name} has been created. Now add students to this course.
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs value={enrollTab} onValueChange={(v) => setEnrollTab(v as 'manual' | 'import')} className="mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual" className="gap-2">
                        <UserPlus className="h-4 w-4" /> Manual Search
                      </TabsTrigger>
                      <TabsTrigger value="import" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Import CSV / Excel
                      </TabsTrigger>
                    </TabsList>

                    {/* Manual Student Search */}
                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students by name, email, or student ID..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="pl-9"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                          {searchResults.map(student => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                              onClick={() => addStudent(student)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                  {student.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{student.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{student.email} {student.studentId && `• ${student.studentId}`}</p>
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected Students */}
                      {selectedStudents.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Selected Students ({selectedStudents.length})</Label>
                          <div className="border rounded-lg max-h-48 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Student</TableHead>
                                  <TableHead className="text-xs">Email</TableHead>
                                  <TableHead className="text-xs">Student ID</TableHead>
                                  <TableHead className="text-xs w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedStudents.map(student => (
                                  <TableRow key={student.id}>
                                    <TableCell className="text-sm py-2">{student.fullName}</TableCell>
                                    <TableCell className="text-sm py-2 text-muted-foreground">{student.email}</TableCell>
                                    <TableCell className="text-sm py-2 font-mono">{student.studentId || '-'}</TableCell>
                                    <TableCell className="py-2">
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeStudent(student.id)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {selectedStudents.length === 0 && !studentSearch && (
                        <div className="text-center py-8 text-muted-foreground">
                          <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Search and add students to this course</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* CSV / Excel Import */}
                    <TabsContent value="import" className="space-y-4 mt-4">
                      {/* Convention info */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-medium mb-1">CSV / Excel Convention</p>
                          <p className="text-xs leading-relaxed">
                            Upload a <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.csv</code> or <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.txt</code> file with student emails. 
                            Each row should contain an email address. Columns can be separated by commas, semicolons, or tabs.
                            The system will automatically detect email addresses from the file.
                          </p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 gap-1 mt-1" onClick={downloadTemplate}>
                            <Download className="h-3 w-3" /> Download template
                          </Button>
                        </div>
                      </div>

                      {/* File upload */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.txt,.xlsx,.xls"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <div
                          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                const emails = parseEmailsFromCSV(text);
                                setCsvEmails(emails);
                                setCsvText(text);
                                setCsvFileName(file.name);
                              };
                              reader.readAsText(file);
                            }
                          }}
                        >
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {csvFileName ? csvFileName : 'Click to upload or drag & drop'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">CSV, TXT, XLS, XLSX</p>
                        </div>
                      </div>

                      {/* Or paste emails */}
                      <div className="space-y-2">
                        <Label className="text-sm">Or paste emails directly</Label>
                        <Textarea
                          placeholder={"student1@examtrust.edu\nstudent2@examtrust.edu\nstudent3@examtrust.edu"}
                          value={csvText}
                          onChange={(e) => handlePasteEmails(e.target.value)}
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </div>

                      {/* Parsed emails preview */}
                      {csvEmails.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {csvEmails.length} email(s) detected
                          </Label>
                          <div className="border rounded-lg max-h-32 overflow-y-auto p-2">
                            <div className="flex flex-wrap gap-1.5">
                              {csvEmails.map(email => (
                                <span key={email} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted font-mono">
                                  {email}
                                  <button
                                    className="ml-0.5 hover:text-destructive"
                                    onClick={() => setCsvEmails(prev => prev.filter(e => e !== email))}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Enrollment Results */}
                  {enrollResults.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <Label className="text-sm font-medium">Enrollment Results</Label>
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {enrollResults.map((result, idx) => (
                          <div key={idx} className={`flex items-center gap-3 p-2.5 border-b last:border-b-0 ${result.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                            {result.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.fullName || result.email}</p>
                              <p className="text-xs text-muted-foreground">{result.email}</p>
                            </div>
                            {result.status === 'failed' && (
                              <span className="text-xs text-red-600 shrink-0">{result.reason}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {enrollResults.filter(r => r.status === 'success').length} enrolled successfully
                        {provisionedCount > 0 && <span className="text-amber-600 font-medium"> ({provisionedCount} new accounts auto-created with password <code>Examtrust@123</code>)</span>}
                        {enrollResults.filter(r => r.status === 'failed').length > 0 && `, ${enrollResults.filter(r => r.status === 'failed').length} failed`}
                      </p>
                    </div>
                  )}

                  <DialogFooter className="gap-2 mt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      {enrollResults.length > 0 ? 'Done' : 'Skip — Add Later'}
                    </Button>
                    {enrollResults.length === 0 && (
                      <Button
                        onClick={handleEnrollStudents}
                        disabled={isEnrolling || (enrollTab === 'manual' ? selectedStudents.length === 0 : csvEmails.length === 0)}
                        className="gap-2"
                      >
                        {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        Enroll {enrollTab === 'manual' ? selectedStudents.length : csvEmails.length} Student(s)
                      </Button>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit Course</DialogTitle>
                <DialogDescription>Update course information.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Course Code (readonly)</Label>
                    <Input
                      id="edit-code"
                      value={editCourse.code}
                      className="font-mono"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-semester">Semester</Label>
                    <Input
                      id="edit-semester"
                      value={editCourse.semester}
                      onChange={(e) => setEditCourse((prev) => ({ ...prev, semester: e.target.value }))}
                      placeholder="e.g. 2025-2026/2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Course Name *</Label>
                    <Input
                      id="edit-name"
                      value={editCourse.name}
                      onChange={(e) => setEditCourse((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-credits">Credits</Label>
                    <Input
                      id="edit-credits"
                      type="number"
                      min={1}
                      max={10}
                      value={editCourse.credits}
                      onChange={(e) => setEditCourse((prev) => ({ ...prev, credits: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editCourse.description}
                    onChange={(e) => setEditCourse((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={isUpdating || !editCourse.name}>
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{courses.length}</p>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{courses.reduce((s, c) => s + c.students, 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{courses.filter(c => c.status === 'active').length}</p>
                  <p className="text-xs text-muted-foreground">Active Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Courses</CardTitle>
                <CardDescription>Manage courses and associated exams</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Exams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-mono font-medium">{course.code}</TableCell>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell className="text-muted-foreground">{course.semester}</TableCell>
                    <TableCell className="text-center">{course.students}</TableCell>
                    <TableCell className="text-center">{course.exams}</TableCell>
                    <TableCell>
                      <StatusBadge variant={statusVariant(course.status)}>
                        {course.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/lecturer/course/${course.id}`)}
                          title="Manage Course & Students"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(course)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <ConfirmActionDialog
                          title="Delete course"
                          description="This action cannot be undone. The course will be deleted if no dependent data blocks deletion."
                          confirmText="Delete"
                          destructive
                          onConfirm={() => handleDelete(course.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmActionDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCourses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No courses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
