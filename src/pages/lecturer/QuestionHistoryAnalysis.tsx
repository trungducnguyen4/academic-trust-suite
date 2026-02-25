import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  History,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface QuestionMetricHistory {
  id: string;
  content: string;
  course: string;
  metrics: {
    exam: string;
    date: string;
    difficulty: number;
    discrimination: number;
    reliability: number;
    correctRate: number;
  }[];
  trend: 'stable' | 'improving' | 'degrading';
  recommendation: string | null;
}

const mockHistory: QuestionMetricHistory[] = [
  {
    id: 'Q001',
    content: 'Define the time complexity of Dijkstra\'s algorithm using a min-heap.',
    course: 'CS301',
    metrics: [
      { exam: 'Midterm 2024', date: '2024-06', difficulty: 0.55, discrimination: 0.52, reliability: 0.84, correctRate: 0.45 },
      { exam: 'Final 2024', date: '2024-12', difficulty: 0.62, discrimination: 0.48, reliability: 0.86, correctRate: 0.38 },
      { exam: 'Midterm 2025', date: '2025-06', difficulty: 0.68, discrimination: 0.45, reliability: 0.87, correctRate: 0.32 },
      { exam: 'Final 2025', date: '2025-12', difficulty: 0.72, discrimination: 0.42, reliability: 0.88, correctRate: 0.28 },
    ],
    trend: 'degrading',
    recommendation: 'Difficulty has increased by 31% over 4 exams. Consider revising or replacing this question.',
  },
  {
    id: 'Q002',
    content: 'Explain the difference between B-Tree and B+ Tree indexing.',
    course: 'CS202',
    metrics: [
      { exam: 'Midterm 2024', date: '2024-06', difficulty: 0.52, discrimination: 0.55, reliability: 0.88, correctRate: 0.48 },
      { exam: 'Final 2024', date: '2024-12', difficulty: 0.55, discrimination: 0.58, reliability: 0.89, correctRate: 0.45 },
      { exam: 'Midterm 2025', date: '2025-06', difficulty: 0.56, discrimination: 0.60, reliability: 0.90, correctRate: 0.44 },
      { exam: 'Final 2025', date: '2025-12', difficulty: 0.58, discrimination: 0.62, reliability: 0.91, correctRate: 0.42 },
    ],
    trend: 'stable',
    recommendation: null,
  },
  {
    id: 'Q003',
    content: 'A binary search tree always guarantees O(log n) lookup time. True or False?',
    course: 'CS301',
    metrics: [
      { exam: 'Midterm 2024', date: '2024-06', difficulty: 0.30, discrimination: 0.35, reliability: 0.72, correctRate: 0.70 },
      { exam: 'Final 2024', date: '2024-12', difficulty: 0.28, discrimination: 0.30, reliability: 0.70, correctRate: 0.72 },
      { exam: 'Midterm 2025', date: '2025-06', difficulty: 0.25, discrimination: 0.25, reliability: 0.68, correctRate: 0.75 },
      { exam: 'Final 2025', date: '2025-12', difficulty: 0.22, discrimination: 0.20, reliability: 0.65, correctRate: 0.78 },
    ],
    trend: 'degrading',
    recommendation: 'Discrimination has dropped below 0.25. Question may be too easy or poorly worded. Consider retirement.',
  },
  {
    id: 'Q004',
    content: 'Implement a thread-safe Singleton pattern in Java.',
    course: 'CS401',
    metrics: [
      { exam: 'Midterm 2025', date: '2025-06', difficulty: 0.78, discrimination: 0.48, reliability: 0.80, correctRate: 0.22 },
      { exam: 'Final 2025', date: '2025-12', difficulty: 0.81, discrimination: 0.55, reliability: 0.82, correctRate: 0.19 },
    ],
    trend: 'improving',
    recommendation: null,
  },
];

const revisionHistory = [
  { date: '2025-12-15', question: 'Q001', action: 'Metadata updated', user: 'Dr. Nguyen', detail: 'Tags updated: added "min-heap"' },
  { date: '2025-11-20', question: 'Q003', action: 'Content revised', user: 'Dr. Nguyen', detail: 'Added clarification about balanced vs unbalanced BST' },
  { date: '2025-10-05', question: 'Q002', action: 'Difficulty adjusted', user: 'System', detail: 'Auto-adjusted from estimated 0.50 to measured 0.55' },
  { date: '2025-09-18', question: 'Q004', action: 'Created', user: 'Dr. Le', detail: 'New question added to bank' },
  { date: '2025-08-01', question: 'Q001', action: 'Flagged for review', user: 'System', detail: 'Difficulty drift exceeded threshold (+17%)' },
];

export default function QuestionHistoryAnalysis() {
  const navigate = useNavigate();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionMetricHistory>(mockHistory[0]);
  const [courseFilter, setCourseFilter] = useState('all');

  const filtered = courseFilter === 'all' ? mockHistory : mockHistory.filter((q) => q.course === courseFilter);

  // Chart data for selected question
  const lineData = {
    labels: selectedQuestion.metrics.map((m) => m.exam),
    datasets: [
      {
        label: 'Difficulty',
        data: selectedQuestion.metrics.map((m) => m.difficulty),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Discrimination',
        data: selectedQuestion.metrics.map((m) => m.discrimination),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Reliability',
        data: selectedQuestion.metrics.map((m) => m.reliability),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const barData = {
    labels: selectedQuestion.metrics.map((m) => m.exam),
    datasets: [
      {
        label: 'Correct Rate',
        data: selectedQuestion.metrics.map((m) => Math.round(m.correctRate * 100)),
        backgroundColor: selectedQuestion.metrics.map((m) =>
          m.correctRate > 0.5 ? 'rgba(34, 197, 94, 0.7)' : m.correctRate > 0.3 ? 'rgba(234, 179, 8, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderRadius: 4,
      },
    ],
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/lecturer/question-bank')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Question Bank
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Question History & Performance Analysis</h1>
          <p className="text-muted-foreground">
            Track difficulty drift, psychometric trends, and revision history across exam cycles
          </p>
        </div>

        <Tabs defaultValue="trends">
          <TabsList className="mb-4">
            <TabsTrigger value="trends">Metric Trends</TabsTrigger>
            <TabsTrigger value="drift">Difficulty Drift</TabsTrigger>
            <TabsTrigger value="history">Revision History</TabsTrigger>
          </TabsList>

          {/* === TRENDS TAB === */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Question Selector */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Questions</CardTitle>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                      <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="CS301">CS301</SelectItem>
                        <SelectItem value="CS202">CS202</SelectItem>
                        <SelectItem value="CS401">CS401</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filtered.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuestion(q)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedQuestion.id === q.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{q.id}</span>
                        <div className="flex items-center gap-1">
                          {trendIcon(q.trend)}
                          <StatusBadge variant={q.trend === 'improving' ? 'success' : q.trend === 'degrading' ? 'destructive' : 'default'}>
                            {q.trend}
                          </StatusBadge>
                        </div>
                      </div>
                      <p className="text-xs line-clamp-2">{q.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{q.course} · {q.metrics.length} exams</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Psychometric Trends – {selectedQuestion.id}</CardTitle>
                    <CardDescription className="line-clamp-1">{selectedQuestion.content}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Line
                      data={lineData}
                      options={{
                        responsive: true,
                        scales: { y: { min: 0, max: 1 } },
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Correct Answer Rate (%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Bar
                      data={barData}
                      options={{
                        responsive: true,
                        scales: { y: { min: 0, max: 100 } },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Recommendation */}
                {selectedQuestion.recommendation && (
                  <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Recommendation</p>
                          <p className="text-sm text-yellow-700">{selectedQuestion.recommendation}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="gap-1 text-xs">
                              <RefreshCw className="h-3 w-3" /> Replace Question
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => navigate(`/lecturer/question-editor?id=${selectedQuestion.id}`)}>
                              Edit Question <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* === DRIFT TAB === */}
          <TabsContent value="drift">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Difficulty Drift Overview</CardTitle>
                <CardDescription>
                  Questions whose difficulty has changed significantly across exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-20">Course</TableHead>
                      <TableHead className="w-28">Initial Diff.</TableHead>
                      <TableHead className="w-28">Current Diff.</TableHead>
                      <TableHead className="w-20">Change</TableHead>
                      <TableHead className="w-20">Trend</TableHead>
                      <TableHead className="w-28">Discrim.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockHistory.map((q) => {
                      const initial = q.metrics[0];
                      const current = q.metrics[q.metrics.length - 1];
                      const diffChange = ((current.difficulty - initial.difficulty) / initial.difficulty * 100).toFixed(0);
                      const discChange = ((current.discrimination - initial.discrimination) / initial.discrimination * 100).toFixed(0);
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono text-xs">{q.id}</TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-1">{q.content}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{q.course}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="text-sm">{initial.difficulty.toFixed(2)}</span>
                              <Progress value={initial.difficulty * 100} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="text-sm">{current.difficulty.toFixed(2)}</span>
                              <Progress value={current.difficulty * 100} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${
                              Number(diffChange) > 10 ? 'text-red-600' : Number(diffChange) < -10 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              {Number(diffChange) > 0 ? '+' : ''}{diffChange}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {trendIcon(q.trend)}
                              <StatusBadge variant={q.trend === 'improving' ? 'success' : q.trend === 'degrading' ? 'destructive' : 'default'}>
                                {q.trend}
                              </StatusBadge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${Number(discChange) < -10 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {current.discrimination.toFixed(2)} ({Number(discChange) > 0 ? '+' : ''}{discChange}%)
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === HISTORY TAB === */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revision History</CardTitle>
                <CardDescription>All changes and updates to questions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revisionHistory.map((entry, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${
                          entry.action.includes('Flagged') ? 'bg-yellow-500' :
                          entry.action.includes('Created') ? 'bg-green-500' :
                          entry.action.includes('revised') ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`} />
                        {i < revisionHistory.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{entry.question}</span>
                            <span className="text-sm font-medium">{entry.action}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{entry.detail}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">by {entry.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
