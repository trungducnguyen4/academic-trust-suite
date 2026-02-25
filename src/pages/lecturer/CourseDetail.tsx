import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// Mock data
const mockStudents = [
  { id: '20120001', name: 'Nguyen Van A', email: 'a.nguyen@university.edu', status: 'active', joinedAt: '2025-02-15' },
  { id: '20120002', name: 'Le Thi B', email: 'b.le@university.edu', status: 'active', joinedAt: '2025-02-16' },
  { id: '20120003', name: 'Tran Van C', email: 'c.tran@university.edu', status: 'inactive', joinedAt: '2025-02-20' },
];

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState(mockStudents);
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Manual Add Form
  const [newStudent, setNewStudent] = useState({ name: '', id: '', email: '' });

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddManual = () => {
    if (!newStudent.name || !newStudent.id) return;
    const student = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      status: 'active',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setStudents([student, ...students]);
    setNewStudent({ name: '', id: '', email: '' });
    toast.success("Student added successfully");
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setIsImporting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock imported data
    const imported = [
      { id: '20120045', name: 'Pham Van D', email: 'd.pham@university.edu', status: 'active', joinedAt: '2026-02-25' },
      { id: '20120046', name: 'Hoang Thi E', email: 'e.hoang@university.edu', status: 'active', joinedAt: '2026-02-25' },
    ];
    setStudents([...imported, ...students]);
    setIsImporting(false);
    setImportFile(null);
    toast.success(`Successfully imported ${imported.length} students from CSV`);
  };

  const handleDelete = (studentId: string) => {
    setStudents(students.filter(s => s.id !== studentId));
    toast.success("Student removed from course");
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button 
              variant="ghost" 
              className="pl-0 gap-2 mb-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/lecturer/create-course')}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Algorithms (CS301)</h1>
            <p className="text-muted-foreground">Semester 2 / 2025-2026 • {students.length} Students Enrolled</p>
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
                      <Label htmlFor="sid">Student ID <span className="text-destructive">*</span></Label>
                      <Input 
                        id="sid" 
                        placeholder="e.g. 20120001" 
                        value={newStudent.id}
                        onChange={(e) => setNewStudent({...newStudent, id: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sname">Full Name <span className="text-destructive">*</span></Label>
                      <Input 
                        id="sname" 
                        placeholder="e.g. Nguyen Van A"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semail">Email Address</Label>
                      <Input 
                        id="semail" 
                        type="email"
                        placeholder="e.g. name@university.edu"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleAddManual} className="w-full mt-2" disabled={!newStudent.id || !newStudent.name}>
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
                        <p className="font-mono bg-muted p-1 rounded">Student ID, Full Name, Email</p>
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
                    <TableRow key={student.id}>
                      <TableCell className="font-mono font-medium">{student.id}</TableCell>
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
                          onClick={() => handleDelete(student.id)}
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
