import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search,
  Plus,
  FileSpreadsheet,
  UserPlus,
  Trash2,
  Mail,
  Download,
  Upload,
  FileText,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import api, { unwrapPaginatedData } from '@/lib/api';

interface Student {
  enrollmentId: string;
  userId: string;
  studentCode: string;
  name: string;
  email: string;
  status: string;
  joinedAt: string;
}

interface Enrollment {
  id: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    studentId?: string | null;
  };
  joinedAt: string;
}

interface Course {
  id: string;
  code?: string;
  name?: string;
  semester?: string;
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/lecturer';
  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const [enrollmentsRaw, setEnrollmentsRaw] = useState<any[] | null>(null);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Manual Add Form
  const [newStudent, setNewStudent] = useState({ name: '', id: '', email: '' });

  const parseEmailsFromCSV = (text: string): string[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const emails: string[] = [];
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map((part) => part.trim().replace(/^["']|["']$/g, ''));
      for (const part of parts) {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
          emails.push(part.toLowerCase());
        }
      }
    }
    return [...new Set(emails)];
  };

  const reloadEnrollments = async (courseId: string) => {
    const enrollments: Enrollment[] = await api.getCourseEnrollments(courseId);
    const mapped: Student[] = enrollments.map((e: Enrollment) => ({
      enrollmentId: e.id,
      userId: e.student.id,
      studentCode: e.student.studentId || e.student.id.slice(0, 8),
      name: e.student.fullName,
      email: e.student.email,
      status: 'active',
      joinedAt: new Date(e.joinedAt).toISOString().split('T')[0],
    }));
    setStudents(mapped);
    setEnrollmentsRaw(enrollments || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Try fetching by id first (DB id). If not found, fallback to searching by course code.
        let courseRes: any | null = null;
        let enrollments: Enrollment[] = [];

        try {
          courseRes = await api.getCourse(id);
        } catch (err) {
          courseRes = null;
        }

        if (!courseRes || !courseRes.id) {
          // fallback: fetch all courses and match by code or id
          try {
            const courses = unwrapPaginatedData(await api.getCourses());
            const found = courses.find((c: any) => (c.code && c.code.toLowerCase() === String(id).toLowerCase()) || c.id === id);
            if (found) {
              courseRes = found;
            }
          } catch (err) {
            console.warn('Failed to fetch courses for fallback lookup', err);
          }
        }

        if (courseRes && courseRes.id) {
          // fetch enrollments by the resolved course id
          enrollments = await api.getCourseEnrollments(courseRes.id);
          setCourse({ id: courseRes.id, code: courseRes.code, name: courseRes.name, semester: courseRes.semester });
          setResolvedCourseId(courseRes.id);
        } else {
          // no course found — keep course as null and try to fetch enrollments by id param anyway
          try {
            enrollments = await api.getCourseEnrollments(id);
            setResolvedCourseId(id);
          } catch (err) {
            enrollments = [];
            setResolvedCourseId(null);
          }
        }

        const mapped: Student[] = enrollments.map((e: Enrollment) => ({
          enrollmentId: e.id,
          userId: e.student.id,
          studentCode: e.student.studentId || e.student.id.slice(0, 8),
          name: e.student.fullName,
          email: e.student.email,
          status: 'active',
          joinedAt: new Date(e.joinedAt).toISOString().split('T')[0],
        }));
        setStudents(mapped);
        setEnrollmentsRaw(enrollments || []);
      } catch (err) {
        console.error('Failed to fetch course or enrollments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddManual = async () => {
    if (!resolvedCourseId) return;
    const keyword = newStudent.id.trim().toLowerCase();
    if (!keyword) return;

    try {
      setIsAdding(true);
      const studentsDb = await api.getStudents();
      const target = studentsDb.find((s: any) =>
        String(s.email || '').toLowerCase() === keyword ||
        String(s.studentId || '').toLowerCase() === keyword,
      );

      if (!target) {
        toast.error('No student found with the provided email or student ID');
        return;
      }

      await api.enrollStudent(resolvedCourseId, target.id);
      await reloadEnrollments(resolvedCourseId);
      setNewStudent({ name: '', id: '', email: '' });
      toast.success('Student added successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add student');
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || !resolvedCourseId) return;

    try {
      setIsImporting(true);
      const text = await importFile.text();
      const emails = parseEmailsFromCSV(text);

      if (emails.length === 0) {
        toast.error('No valid emails found in file');
        return;
      }

      const result = await api.bulkEnrollByEmails(resolvedCourseId, emails);
      await reloadEnrollments(resolvedCourseId);
      setImportFile(null);
      toast.success(`Imported ${result.success.length} student(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (enrollmentId: string) => {
    try {
      await api.removeEnrollment(enrollmentId);
      setStudents((prev) => prev.filter((s) => s.enrollmentId !== enrollmentId));
      toast.success('Student removed from course');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove student');
    }
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button 
              variant="ghost" 
              className="pl-0 gap-2 mb-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(basePath === '/admin' ? '/admin/courses' : '/lecturer/create-course')}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {course?.name || 'Course Details'}{course?.code ? ` (${course.code})` : ''}
            </h1>
            <p className="text-muted-foreground">{course?.semester || 'Semester unknown'} • {students.length} Students Enrolled</p>
            {typeof window !== 'undefined' && window.location.hostname.includes('localhost') && (
              <div className="mt-3 p-3 rounded-md bg-muted/30 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Dev debug</div>
                <div>Resolved course id: <span className="font-mono">{resolvedCourseId || 'none'}</span></div>
                <div>Enrollments fetched: {Array.isArray(enrollmentsRaw) ? enrollmentsRaw.length : 'null'}</div>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">Show raw enrollments (first 5)</summary>
                  <pre className="max-h-56 overflow-auto p-2 bg-white text-xs text-muted-foreground rounded mt-2">{enrollmentsRaw ? JSON.stringify(enrollmentsRaw.slice(0,5), null, 2) : 'no data'}</pre>
                </details>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export List
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add Students
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Students to Course</DialogTitle>
                  <DialogDescription>
                    Add students manually or import from a CSV file.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="import">Import CSV</TabsTrigger>
                  </TabsList>
                  
                  {/* Manual Entry Tab */}
                  <TabsContent value="manual" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="sid">Student Email / Student ID <span className="text-destructive">*</span></Label>
                      <Input 
                        id="sid" 
                        placeholder="e.g. student@university.edu or 20120001" 
                        value={newStudent.id}
                        onChange={(e) => setNewStudent({...newStudent, id: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleAddManual} className="w-full mt-2" disabled={!newStudent.id || isAdding}>
                      {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Student
                    </Button>
                  </TabsContent>

                  {/* Import CSV Tab */}
                  <TabsContent value="import" className="space-y-4 py-4">
                     <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer bg-muted/20">
                        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">Drag & drop CSV file here</p>
                        <p className="text-xs text-muted-foreground my-2">or</p>
                        <Button variant="secondary" size="sm" className="relative">
                          Browse File
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          />
                        </Button>
                        {importFile && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            <CheckCircle2 className="h-4 w-4" />
                            {importFile.name}
                          </div>
                        )}
                     </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Required CSV Format:</p>
                      <p className="font-mono bg-muted p-1 rounded">Email</p>
                     </div>
                     <Button onClick={handleImportCSV} className="w-full" disabled={!importFile || isImporting}>
                        {isImporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" /> Import Students
                          </>
                        )}
                     </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, ID or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1" /> {/* Spacer */}
        </div>

        {/* Student List */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.enrollmentId}>
                      <TableCell className="font-mono font-medium">{student.studentCode}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" /> {student.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.joinedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(student.enrollmentId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No students found matching your search.
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
