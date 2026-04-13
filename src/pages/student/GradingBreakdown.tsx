import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Cpu,
  User,
  Calculator,
  History,
  MessageSquare,
} from 'lucide-react';

function toDisplayText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    // Common backend shape for wrapped answer payloads
    if ('answer' in value) {
      return toDisplayText((value as any).answer);
    }
    if ('text' in value) {
      return toDisplayText((value as any).text);
    }
    if ('content' in value) {
      return toDisplayText((value as any).content);
    }
    return JSON.stringify(value);
  }

  return String(value);
}

type SeverityLevel = 'none' | 'low' | 'medium' | 'high';

const severityOrder: Record<SeverityLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const severityLabels: Record<SeverityLevel, string> = {
  none: 'No issues',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const severityVariant: Record<SeverityLevel, 'success' | 'info' | 'warning' | 'destructive'> = {
  none: 'success',
  low: 'info',
  medium: 'warning',
  high: 'destructive',
};

const severityCardClass: Record<SeverityLevel, string> = {
  none: 'border-success/30 bg-success/5',
  low: 'border-info/30 bg-info/5',
  medium: 'border-warning/30 bg-warning/5',
  high: 'border-destructive/30 bg-destructive/5',
};

const severityTextClass: Record<SeverityLevel, string> = {
  none: 'text-success',
  low: 'text-info',
  medium: 'text-warning',
  high: 'text-destructive',
};

const getSeverity = (count: number, thresholds: { medium: number; high: number }): SeverityLevel => {
  if (count <= 0) return 'none';
  if (count >= thresholds.high) return 'high';
  if (count >= thresholds.medium) return 'medium';
  return 'low';
};

// Mock grading data
interface GradedQuestion {
  id: number;
  question: string;
  type: 'auto' | 'manual';
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  feedback?: string;
}

const gradedQuestions: GradedQuestion[] = [
  { id: 1, question: 'Time complexity of merge sort', type: 'auto', yourAnswer: 'O(n log n)', correctAnswer: 'O(n log n)', isCorrect: true, points: 2, maxPoints: 2 },
  { id: 2, question: 'Best data structure for priority queue', type: 'auto', yourAnswer: 'Binary Heap', correctAnswer: 'Binary Heap', isCorrect: true, points: 2, maxPoints: 2 },
  { id: 3, question: 'Dijkstra fails with...', type: 'auto', yourAnswer: 'Negative weight edges', correctAnswer: 'Negative weight edges', isCorrect: true, points: 2, maxPoints: 2 },
  { id: 4, question: 'Solow-Swan model: effect of increasing n', type: 'auto', yourAnswer: 'Ratio increases', correctAnswer: 'Ratio decreases', isCorrect: false, points: 0, maxPoints: 2 },
  { id: 5, question: 'LCS time complexity', type: 'auto', yourAnswer: 'O(mn)', correctAnswer: 'O(mn)', isCorrect: true, points: 2, maxPoints: 2 },
  { id: 6, question: 'Explain the trade-offs of B-trees vs Hash Tables', type: 'manual', yourAnswer: 'B-trees support range queries and maintain order...', correctAnswer: '', isCorrect: true, points: 8, maxPoints: 10, feedback: 'Good explanation of range queries. Missing discussion on disk I/O optimization.' },
  { id: 7, question: 'Design an algorithm for minimum spanning tree', type: 'manual', yourAnswer: 'Using Kruskal\'s algorithm with union-find...', correctAnswer: '', isCorrect: true, points: 14, maxPoints: 15, feedback: 'Excellent use of union-find with path compression. Minor: could mention Prim\'s as alternative.' },
  { id: 8, question: 'Analyze amortized complexity of dynamic arrays', type: 'manual', yourAnswer: 'Using aggregate analysis, total cost is O(n)...', correctAnswer: '', isCorrect: false, points: 5, maxPoints: 10, feedback: 'Partial credit. Aggregate analysis was correct but accounting method explanation was incomplete.' },
];

const gradingHistory = [
  { date: '2026-02-24 11:00', action: 'Auto-grading completed', by: 'System', detail: '5 objective questions graded' },
  { date: '2026-02-24 14:30', action: 'Manual grading: Q6 reviewed', by: 'Dr. Nguyen Van A', detail: 'Score: 8/10' },
  { date: '2026-02-24 14:45', action: 'Manual grading: Q7 reviewed', by: 'Dr. Nguyen Van A', detail: 'Score: 14/15' },
  { date: '2026-02-24 15:00', action: 'Manual grading: Q8 reviewed', by: 'Dr. Nguyen Van A', detail: 'Score: 5/10' },
  { date: '2026-02-24 15:05', action: 'Final score released', by: 'System', detail: 'Total: 35/43' },
  { date: '2026-02-25 09:00', action: 'Score adjustment: Q8', by: 'Dr. Nguyen Van A', detail: 'Revised to 6/10 after review appeal' },
];

export default function GradingBreakdown() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId') || undefined;

  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<any | null>(null);

  useEffect(() => {
    if (!examId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getMyExamSubmission(examId);
        if (!mounted) return;
        setSubmission(res);
      } catch (err) {
        console.error('Failed to load submission:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [examId]);

  // Map submission (if available) to gradedQuestions and history
  const mappedQuestions = (submission?.answers || []).map((a: any, idx: number) => {
    const q = a.question || {};
    const autoTypes = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE'];
    const type = autoTypes.includes(q.type) ? 'auto' : 'manual';
    return {
      id: idx + 1,
      question: toDisplayText(q.content || q.text || 'Question text'),
      type,
      yourAnswer: toDisplayText(a.answer),
      correctAnswer: toDisplayText(q.correctAnswer),
      isCorrect: !!a.isCorrect,
      points: a.pointsAwarded ?? 0,
      maxPoints: q.points ?? 1,
      feedback: a.feedback || undefined,
    };
  });

  const autoQuestions = mappedQuestions.filter((q: any) => q.type === 'auto');
  const manualQuestions = mappedQuestions.filter((q: any) => q.type === 'manual');
  const autoScore = autoQuestions.reduce((s: number, q: any) => s + q.points, 0);
  const autoMax = autoQuestions.reduce((s: number, q: any) => s + q.maxPoints, 0) || 1;
  const manualScore = manualQuestions.reduce((s: number, q: any) => s + q.points, 0);
  const manualMax = manualQuestions.reduce((s: number, q: any) => s + q.maxPoints, 0) || 1;
  const totalScore = autoScore + manualScore;
  const totalMax = autoMax + manualMax;

  const gradingHistory = (() => {
    if (!submission) return [];
    const history: any[] = [];
    if (submission.submittedAt) {
      history.push({ date: new Date(submission.submittedAt).toLocaleString(), action: 'Auto-grading completed', by: 'System', detail: `${autoQuestions.length} objective questions graded` });
    }
    // Add manual grading entries for answers with feedback or pointsAwarded
    (submission.answers || []).forEach((a: any, i: number) => {
      if ((a.pointsAwarded != null && a.pointsAwarded !== 0) || a.feedback) {
        history.push({ date: a.updatedAt ? new Date(a.updatedAt).toLocaleString() : submission.gradedAt ? new Date(submission.gradedAt).toLocaleString() : '', action: `Manual grading: Q${i+1}`, by: a.gradedByName || 'Instructor', detail: `Score: ${a.pointsAwarded ?? 0}/${a.question?.points ?? 1}` });
      }
    });
    if (submission.gradedAt) {
      history.push({ date: new Date(submission.gradedAt).toLocaleString(), action: 'Final score released', by: 'System', detail: `Total: ${submission.score}/${submission.exam?.totalPoints ?? totalMax}` });
    }
    return history;
  })();

  const proctoring = submission?.proctoring;
  const tabSwitchCount = Number(proctoring?.tabSwitchCount ?? 0);
  const mouseAnomalies = Number(proctoring?.mouseAnomalies ?? 0);
  const logsCount = Number(proctoring?.logsCount ?? proctoring?.logs?.length ?? 0);

  const tabSeverity = getSeverity(tabSwitchCount, { medium: 3, high: 5 });
  const mouseSeverity = getSeverity(mouseAnomalies, { medium: 4, high: 8 });
  const logSeverity = getSeverity(logsCount, { medium: 5, high: 10 });
  const overallSeverity = [tabSeverity, mouseSeverity, logSeverity].reduce(
    (acc, level) => (severityOrder[level] > severityOrder[acc] ? level : acc),
    'none' as SeverityLevel,
  );

  if (!examId) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto text-center py-20">
          <h2 className="text-lg font-medium">No exam selected</h2>
          <p className="text-sm text-muted-foreground mt-2">Open an evaluated exam from your dashboard to view grading details.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/student')}>Back to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-2xl font-semibold text-foreground mb-1">Grading Breakdown</h1>
        <p className="text-muted-foreground mb-6">
          Transparent view of how your exam was scored — auto-graded and manually reviewed questions
        </p>

        {/* Score Calculation Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Score Calculation
            </CardTitle>
            <CardDescription>Total Score = Auto-Graded + Manual Grading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                <Cpu className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{autoScore}/{autoMax}</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-Graded ({autoQuestions.length} questions)</p>
                <Progress value={(autoMax > 0 ? (autoScore / autoMax) * 100 : 0)} className="mt-2 h-1.5" />
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900">
                <User className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{manualScore}/{manualMax}</p>
                <p className="text-xs text-muted-foreground mt-1">Manual Grading ({manualQuestions.length} questions)</p>
                <Progress value={(manualMax > 0 ? (manualScore / manualMax) * 100 : 0)} className="mt-2 h-1.5" />
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Calculator className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold text-primary">{totalScore}/{totalMax}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Score ({Math.round((totalMax > 0 ? (totalScore / totalMax) * 100 : 0))}%)</p>
                <Progress value={(totalMax > 0 ? (totalScore / totalMax) * 100 : 0)} className="mt-2 h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proctoring Summary */}
        {submission?.proctoring && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Proctoring Summary
              </CardTitle>
              <CardDescription>Summary of integrity events recorded during the exam</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <StatusBadge variant={severityVariant[overallSeverity]}>
                  Severity: {severityLabels[overallSeverity]}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  Based on tab switches, mouse anomalies, and recorded events.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border text-center ${severityCardClass[tabSeverity]}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <p className="text-xs text-muted-foreground">Tab Switches</p>
                    <StatusBadge variant={severityVariant[tabSeverity]}>{severityLabels[tabSeverity]}</StatusBadge>
                  </div>
                  <p className={`text-lg font-semibold ${severityTextClass[tabSeverity]}`}>
                    {tabSwitchCount}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border text-center ${severityCardClass[mouseSeverity]}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <p className="text-xs text-muted-foreground">Mouse Anomalies</p>
                    <StatusBadge variant={severityVariant[mouseSeverity]}>{severityLabels[mouseSeverity]}</StatusBadge>
                  </div>
                  <p className={`text-lg font-semibold ${severityTextClass[mouseSeverity]}`}>
                    {mouseAnomalies}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border text-center ${severityCardClass[logSeverity]}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <p className="text-xs text-muted-foreground">Recorded Events</p>
                    <StatusBadge variant={severityVariant[logSeverity]}>{severityLabels[logSeverity]}</StatusBadge>
                  </div>
                  <p className={`text-lg font-semibold ${severityTextClass[logSeverity]}`}>
                    {logsCount}
                  </p>
                </div>
              </div>
              {logsCount > 0 && (
                <p className="text-sm text-muted-foreground mt-3">Some events were recorded during your exam and are available to your instructor for review.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auto-Graded Questions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              Auto-Graded Questions
            </CardTitle>
            <CardDescription>Objective questions graded automatically by the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Your Answer</TableHead>
                  <TableHead>Correct Answer</TableHead>
                  <TableHead className="w-20 text-center">Points</TableHead>
                  <TableHead className="w-20 text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoQuestions.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono">{q.id}</TableCell>
                    <TableCell className="font-medium">{q.question}</TableCell>
                    <TableCell className={q.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {q.yourAnswer}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.correctAnswer}</TableCell>
                    <TableCell className="text-center font-medium">{q.points}/{q.maxPoints}</TableCell>
                    <TableCell className="text-center">
                      {q.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Manual Grading */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Manually Graded Questions
            </CardTitle>
            <CardDescription>Subjective questions reviewed by your instructor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {manualQuestions.map((q: any) => (
                <div key={q.id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-mono text-muted-foreground">Q{q.id}.</span>
                      <span className="text-sm font-medium ml-2">{q.question}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={q.points / q.maxPoints >= 0.7 ? 'success' : q.points / q.maxPoints >= 0.5 ? 'warning' : 'destructive'}>
                        {q.points}/{q.maxPoints}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded p-3 text-sm text-muted-foreground mb-2">
                    <strong>Your Answer:</strong> {q.yourAnswer}
                  </div>
                  {q.feedback && (
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-foreground">Instructor Feedback: </span>
                        <span className="text-muted-foreground">{q.feedback}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grading History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Grading History
            </CardTitle>
            <CardDescription>Timeline of grading actions, edits, and score adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gradingHistory.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg border border-border">
                  <div className="text-xs font-mono text-muted-foreground whitespace-nowrap mt-0.5">
                    {entry.date}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      By: {entry.by} · {entry.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
