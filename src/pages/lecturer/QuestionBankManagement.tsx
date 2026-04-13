import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { unwrapPaginatedData } from '@/lib/api';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

interface Question {
  id: string;
  content: string;
  type: string;
  course?: { code: string; name: string };
  difficulty: number;
  points: number;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTI_SELECT: 'Multiple Select',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  FILL_IN_BLANK: 'Fill in Blank',
  MATCHING: 'Matching',
  ORDERING: 'Ordering',
};

const difficultyLabel = (d: number) => {
  if (d <= 2) return { text: 'Easy', color: 'text-green-600' };
  if (d <= 3) return { text: 'Medium', color: 'text-yellow-600' };
  return { text: 'Hard', color: 'text-red-600' };
};

// Safe parser for tags - handles arrays, JSON strings, comma-separated strings, or null
const safeParseTags = (tags: unknown): string[] => {
  if (!tags) return [];
  // Already an array
  if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string');
  // Not a string - can't parse
  if (typeof tags !== 'string') return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Not JSON - treat as comma-separated string
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
};

export default function QuestionBankManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/lecturer';
  const questionEditorPath = `${basePath}/question-editor`;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string; faculty?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<'difficulty' | 'points'>('difficulty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [questionsRes, coursesData] = await Promise.all([
          api.getQuestions({ page, limit: ITEMS_PER_PAGE }),
          api.getCourses(),
        ]);
        // Handle paginated response
        const qData = unwrapPaginatedData(questionsRes);
        setQuestions(qData);
        setTotalPages(questionsRes?.totalPages ?? 1);
        setTotal(questionsRes?.total ?? qData.length);
        setCourses(unwrapPaginatedData(coursesData));
      } catch (error) {
        console.error('Failed to fetch questions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  const filtered = questions
    .filter((q) => {
      const tags = safeParseTags(q.tags);
      const matchSearch =
        q.content.toLowerCase().includes(search.toLowerCase()) ||
        q.id.toLowerCase().includes(search.toLowerCase()) ||
        tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      // When a course is selected, filter by it; otherwise show all
      const matchCourse = selectedCourse
        ? q.course?.code === selectedCourse
        : (filterCourse === 'all' || q.course?.code === filterCourse);
      const matchType = filterType === 'all' || q.type === filterType;
      return matchSearch && matchCourse && matchType;
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'difficulty') return ((a.difficulty || 1) - (b.difficulty || 1)) * mul;
      return ((a.points || 1) - (b.points || 1)) * mul;
    });

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const newQuestion = await api.createQuestion({
        type: q.type,
        content: `[Copy] ${q.content}`,
        difficulty: q.difficulty,
        points: q.points,
        tags: safeParseTags(q.tags),
        courseId: q.course?.code ? courses.find(c => c.code === q.course?.code)?.id : undefined,
      });
      setQuestions((prev) => [newQuestion, ...prev]);
    } catch (error) {
      console.error('Failed to duplicate question:', error);
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  // Group questions by course
  const groupQuestionsByCourse = (questions: Question[]) => {
    return questions.reduce((acc, question) => {
      const courseCode = question.course?.code || 'Uncategorized';
      if (!acc[courseCode]) {
        acc[courseCode] = [];
      }
      acc[courseCode].push(question);
      return acc;
    }, {} as Record<string, Question[]>);
  };

  const gradientClasses = [
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-purple-400 to-indigo-600', 
    'bg-gradient-to-br from-blue-400 to-cyan-600',
    'bg-gradient-to-br from-green-400 to-emerald-600',
    'bg-gradient-to-br from-yellow-400 to-orange-600',
    'bg-gradient-to-br from-red-400 to-pink-600',
    'bg-gradient-to-br from-gray-400 to-gray-600',
  ];

  const getGradientClass = (index: number): string => {
    return gradientClasses[index % gradientClasses.length];
  };

  // Stats
  const avgDifficulty = questions.length > 0 
    ? (questions.reduce((s, q) => s + (q.difficulty || 1), 0) / questions.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <BackToDashboardButton to={basePath} className="mb-4 -ml-2" />

        {/* COURSE SELECTION VIEW */}
        {!selectedCourse ? (
          <>
            <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">Question Bank</h1>
                <p className="text-muted-foreground">
                  Select a course to manage its questions
                </p>
              </div>
              <Button className="gap-2" onClick={() => navigate(questionEditorPath)}>
                <Plus className="h-4 w-4" /> New Question
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                      <p className="text-2xl font-semibold">{courses.length}</p>
                      <p className="text-xs text-muted-foreground">Courses</p>
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
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{Object.keys(typeLabels).filter(t => questions.some(q => q.type === t)).length}</p>
                      <p className="text-xs text-muted-foreground">Question Types</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => {
                const courseQuestions = questions.filter(q => q.course?.code === course.code);
                const questionTypes = [...new Set(courseQuestions.map(q => q.type))];
                const avgDiff = courseQuestions.length > 0
                  ? (courseQuestions.reduce((s, q) => s + (q.difficulty || 1), 0) / courseQuestions.length)
                  : 0;
                const diffInfo = difficultyLabel(avgDiff);
                return (
                  <Card
                    key={course.id}
                    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setSelectedCourse(course.code)}
                  >
                    <div className={`h-32 ${getGradientClass(index)} relative`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <p className="text-2xl font-bold">{course.code}</p>
                        <p className="text-sm text-white/80 line-clamp-1">{course.name}</p>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                          {courseQuestions.length} questions
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Difficulty</span>
                          <span className={`font-medium ${diffInfo.color}`}>{diffInfo.text}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Question Types</span>
                          <span className="font-medium">{questionTypes.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {questionTypes.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {typeLabels[t] || t}
                            </span>
                          ))}
                          {questionTypes.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{questionTypes.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {courses.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No courses yet</p>
                <p className="text-sm">Create a course first to start adding questions.</p>
              </div>
            )}
          </>
        ) : (
          /* QUESTION LIST VIEW (after selecting a course) */
          <>
            <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline" size="icon"
                  className="h-9 w-9"
                  onClick={() => setSelectedCourse(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground mb-0.5">
                    {selectedCourse} — Question Bank
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {courses.find(c => c.code === selectedCourse)?.name || ''} • {filtered.length} questions
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => navigate(`${basePath}/question-history`)}>
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Button>
                <Button className="gap-2" onClick={() => navigate(`${questionEditorPath}?courseCode=${selectedCourse}`)}>
                  <Plus className="h-4 w-4" /> New Question
                </Button>
              </div>
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
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Question Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((question, qIndex) => {
                const diff = difficultyLabel(question.difficulty || 1);
                const tags = safeParseTags(question.tags);
                return (
                  <Card key={question.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`h-24 ${getGradientClass(qIndex)} relative`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-6 w-6 p-0" onClick={() => setPreviewQuestion(question)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-6 w-6 p-0" onClick={() => navigate(`${questionEditorPath}?id=${question.id}&courseCode=${selectedCourse}`)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-muted-foreground">{question.id.slice(0, 8)}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${diff.color}`}>{diff.text}</span>
                          </div>
                          <p className="text-sm line-clamp-3 mb-2">{question.content}</p>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span>{typeLabels[question.type] || question.type}</span>
                            <span>•</span>
                            <span>{question.points || 1} pts</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                                <Tag className="h-2.5 w-2.5" />{tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => handleDuplicate(question)}>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(question.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No questions found</p>
                <p className="text-sm">Create your first question for this course.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-2">
                <p className="text-sm text-muted-foreground">
                  Showing page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{previewQuestion?.id.slice(0, 8)}</span>
                Question Preview
              </DialogTitle>
              <DialogDescription>Full question details</DialogDescription>
            </DialogHeader>
            {previewQuestion && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Content</p>
                  <p className="text-sm text-muted-foreground">{previewQuestion.content}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                    <p className="text-lg font-semibold">{previewQuestion.difficulty || 1}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Points</p>
                    <p className="text-lg font-semibold">{previewQuestion.points || 1}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Course:</span> {previewQuestion.course?.code || '-'}</div>
                  <div><span className="text-muted-foreground">Type:</span> {typeLabels[previewQuestion.type] || previewQuestion.type}</div>
                  <div><span className="text-muted-foreground">Created:</span> {new Date(previewQuestion.createdAt).toLocaleDateString()}</div>
                  <div><span className="text-muted-foreground">Updated:</span> {new Date(previewQuestion.updatedAt).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {safeParseTags(previewQuestion.tags).map((t: string) => (
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
