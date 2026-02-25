import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Copy,
  ArrowLeft,
  BarChart3,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ArrowUpDown,
  Database,
} from 'lucide-react';

interface Question {
  id: string;
  content: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'find_error' | 'ordering' | 'essay';
  course: string;
  topic: string;
  difficulty: number; // 0-1
  discrimination: number; // 0-1
  reliability: number; // 0-1
  tags: string[];
  status: 'active' | 'draft' | 'retired';
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

const mockQuestions: Question[] = [
  {
    id: 'Q001', content: 'Define the time complexity of Dijkstra\'s algorithm using a min-heap.',
    type: 'multiple_choice', course: 'CS301', topic: 'Graph Algorithms',
    difficulty: 0.72, discrimination: 0.45, reliability: 0.88,
    tags: ['graph', 'shortest-path', 'complexity'], status: 'active',
    usageCount: 5, lastUsed: '2026-01-10', createdAt: '2025-06-15',
  },
  {
    id: 'Q002', content: 'Explain the difference between B-Tree and B+ Tree indexing.',
    type: 'essay', course: 'CS202', topic: 'Database Indexing',
    difficulty: 0.58, discrimination: 0.62, reliability: 0.91,
    tags: ['index', 'B-tree', 'database'], status: 'active',
    usageCount: 3, lastUsed: '2026-01-05', createdAt: '2025-08-20',
  },
  {
    id: 'Q003', content: 'A binary search tree always guarantees O(log n) lookup time. True or False?',
    type: 'true_false', course: 'CS301', topic: 'Data Structures',
    difficulty: 0.35, discrimination: 0.28, reliability: 0.75,
    tags: ['BST', 'data-structures'], status: 'active',
    usageCount: 8, lastUsed: '2025-12-20', createdAt: '2025-03-10',
  },
  {
    id: 'Q004', content: 'Implement a thread-safe Singleton pattern in Java.',
    type: 'essay', course: 'CS401', topic: 'Design Patterns',
    difficulty: 0.81, discrimination: 0.55, reliability: 0.82,
    tags: ['patterns', 'concurrency', 'java'], status: 'active',
    usageCount: 2, lastUsed: '2025-11-15', createdAt: '2025-09-01',
  },
  {
    id: 'Q005', content: 'Which sorting algorithm has the best average-case time complexity?',
    type: 'multiple_choice', course: 'CS301', topic: 'Sorting',
    difficulty: 0.42, discrimination: 0.18, reliability: 0.65,
    tags: ['sorting', 'algorithm'], status: 'draft',
    usageCount: 1, lastUsed: '2025-10-01', createdAt: '2025-10-01',
  },
  {
    id: 'Q006', content: 'Describe the CAP theorem and its implications for distributed databases.',
    type: 'essay', course: 'CS202', topic: 'Distributed Systems',
    difficulty: 0.69, discrimination: 0.51, reliability: 0.87,
    tags: ['CAP', 'distributed', 'database'], status: 'active',
    usageCount: 4, lastUsed: '2026-01-08', createdAt: '2025-05-22',
  },
  {
    id: 'Q007', content: 'A deadlock requires all four Coffman conditions to be present simultaneously. True or False?',
    type: 'true_false', course: 'CS401', topic: 'Operating Systems',
    difficulty: 0.48, discrimination: 0.40, reliability: 0.79,
    tags: ['deadlock', 'OS', 'concurrency'], status: 'retired',
    usageCount: 10, lastUsed: '2025-06-15', createdAt: '2024-09-01',
  },  {
    id: 'Q008', content: 'Match the OSI layer to its primary function.',
    type: 'matching', course: 'CS401', topic: 'Networking',
    difficulty: 0.55, discrimination: 0.48, reliability: 0.85,
    tags: ['networking', 'OSI'], status: 'active',
    usageCount: 2, lastUsed: '2026-02-01', createdAt: '2025-11-20',
  },
  {
    id: 'Q009', content: 'Arrange the following sorting algorithms from slowest to fastest average case.',
    type: 'ordering', course: 'CS301', topic: 'Sorting',
    difficulty: 0.65, discrimination: 0.52, reliability: 0.89,
    tags: ['sorting', 'algorithms'], status: 'active',
    usageCount: 4, lastUsed: '2026-02-15', createdAt: '2025-12-05',
  },
  {
    id: 'Q010', content: 'The primary key of a table must be [[unique]] and [[not null]].',
    type: 'fill_blank', course: 'CS202', topic: 'Database Design',
    difficulty: 0.32, discrimination: 0.35, reliability: 0.78,
    tags: ['database', 'SQL'], status: 'active',
    usageCount: 6, lastUsed: '2026-01-20', createdAt: '2025-08-10',
  },];

const difficultyLabel = (d: number) => {
  if (d < 0.4) return { text: 'Easy', color: 'text-green-600' };
  if (d < 0.7) return { text: 'Medium', color: 'text-yellow-600' };
  return { text: 'Hard', color: 'text-red-600' };
};

const qualityIndicator = (disc: number, rel: number) => {
  const avg = (disc + rel) / 2;
  if (avg >= 0.7) return { text: 'High', variant: 'success' as const };
  if (avg >= 0.4) return { text: 'Medium', variant: 'warning' as const };
  return { text: 'Low', variant: 'destructive' as const };
};

export default function QuestionBankManagement() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'difficulty' | 'discrimination' | 'reliability' | 'usageCount'>('difficulty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const courses = [...new Set(mockQuestions.map((q) => q.course))];
  const allTags = [...new Set(mockQuestions.flatMap((q) => q.tags))];

  const filtered = questions
    .filter((q) => {
      const matchSearch =
        q.content.toLowerCase().includes(search.toLowerCase()) ||
        q.id.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchCourse = filterCourse === 'all' || q.course === filterCourse;
      const matchType = filterType === 'all' || q.type === filterType;
      const matchStatus = filterStatus === 'all' || q.status === filterStatus;
      return matchSearch && matchCourse && matchType && matchStatus;
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * mul;
    });

  const handleDelete = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDuplicate = (q: Question) => {
    const dup: Question = {
      ...q,
      id: `Q${String(questions.length + 1).padStart(3, '0')}`,
      content: `[Copy] ${q.content}`,
      status: 'draft',
      usageCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setQuestions((prev) => [dup, ...prev]);
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  // Stats
  const activeCount = questions.filter((q) => q.status === 'active').length;
  const avgDifficulty = (questions.reduce((s, q) => s + q.difficulty, 0) / questions.length).toFixed(2);
  const lowQualityCount = questions.filter((q) => (q.discrimination + q.reliability) / 2 < 0.4).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/lecturer')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Question Bank</h1>
            <p className="text-muted-foreground">
              Manage questions, quality metrics, and psychometric analysis
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/lecturer/question-history')}>
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
            <Button className="gap-2" onClick={() => navigate('/lecturer/question-editor')}>
              <Plus className="h-4 w-4" /> New Question
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Total Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgDifficulty}</p>
                  <p className="text-xs text-muted-foreground">Avg Difficulty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{lowQualityCount}</p>
                  <p className="text-xs text-muted-foreground">Low Quality</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions, IDs, tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="single_choice">Single Choice</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="find_error">Find the Error</SelectItem>
                  <SelectItem value="ordering">Ordering / Sequencing</SelectItem>
                  <SelectItem value="essay">Short Answer / Essay</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Question Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-20">Course</TableHead>
                  <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort('difficulty')}>
                    <div className="flex items-center gap-1">
                      Difficulty <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-32 cursor-pointer" onClick={() => toggleSort('discrimination')}>
                    <div className="flex items-center gap-1">
                      Discrim. <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort('reliability')}>
                    <div className="flex items-center gap-1">
                      Reliability <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Quality</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => {
                  const diff = difficultyLabel(q.difficulty);
                  const qual = qualityIndicator(q.discrimination, q.reliability);
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs">{q.id}</TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2">{q.content}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {q.tags.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                              <Tag className="h-2.5 w-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize">{q.type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{q.course}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${diff.color}`}>{diff.text}</span>
                            <span className="text-xs text-muted-foreground">{q.difficulty.toFixed(2)}</span>
                          </div>
                          <Progress value={q.difficulty * 100} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">{q.discrimination.toFixed(2)}</span>
                          <Progress value={q.discrimination * 100} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">{q.reliability.toFixed(2)}</span>
                          <Progress value={q.reliability * 100} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={qual.variant}>{qual.text}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={q.status === 'active' ? 'success' : q.status === 'draft' ? 'warning' : 'default'}
                        >
                          {q.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="sm" title="Preview" onClick={() => setPreviewQuestion(q)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => navigate(`/lecturer/question-editor?id=${q.id}`)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Duplicate" onClick={() => handleDuplicate(q)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" title="Delete" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No questions match the current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{previewQuestion?.id}</span>
                Question Preview
              </DialogTitle>
              <DialogDescription>Full question details and psychometric data</DialogDescription>
            </DialogHeader>
            {previewQuestion && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Content</p>
                  <p className="text-sm text-muted-foreground">{previewQuestion.content}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                    <p className="text-lg font-semibold">{previewQuestion.difficulty.toFixed(2)}</p>
                    <Progress value={previewQuestion.difficulty * 100} className="h-1.5 mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Discrimination</p>
                    <p className="text-lg font-semibold">{previewQuestion.discrimination.toFixed(2)}</p>
                    <Progress value={previewQuestion.discrimination * 100} className="h-1.5 mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reliability</p>
                    <p className="text-lg font-semibold">{previewQuestion.reliability.toFixed(2)}</p>
                    <Progress value={previewQuestion.reliability * 100} className="h-1.5 mt-1" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Course:</span> {previewQuestion.course}</div>
                  <div><span className="text-muted-foreground">Topic:</span> {previewQuestion.topic}</div>
                  <div><span className="text-muted-foreground">Type:</span> {previewQuestion.type.replace('_', ' ')}</div>
                  <div><span className="text-muted-foreground">Used:</span> {previewQuestion.usageCount} times</div>
                  <div><span className="text-muted-foreground">Last used:</span> {previewQuestion.lastUsed}</div>
                  <div><span className="text-muted-foreground">Created:</span> {previewQuestion.createdAt}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {previewQuestion.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">
                      <Tag className="h-3 w-3" />{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
