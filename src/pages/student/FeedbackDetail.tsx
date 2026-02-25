import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Video,
  ListChecks,
  Users,
  Download,
  BarChart3,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// Mock data
const examResult = {
  title: 'Advanced Algorithms — Midterm',
  course: 'CS301',
  submittedAt: '2026-02-24T10:55:00',
  totalScore: 84,
  maxScore: 100,
  avgScore: 79,
  percentile: 78,
  timeUsed: '1h 45m',
  passed: true,
};

const sectionScores = [
  { name: 'Theory & Concepts', score: 28, max: 30, percentage: 93 },
  { name: 'Problem Solving', score: 32, max: 40, percentage: 80 },
  { name: 'Application & Analysis', score: 24, max: 30, percentage: 80 },
];

const answerPatterns = {
  strengths: [
    { topic: 'Algorithm Complexity', accuracy: 95, questions: 8 },
    { topic: 'Data Structures', accuracy: 88, questions: 6 },
    { topic: 'Graph Theory', accuracy: 85, questions: 5 },
  ],
  weaknesses: [
    { topic: 'Dynamic Programming', accuracy: 50, questions: 6 },
    { topic: 'Asymptotic Analysis', accuracy: 60, questions: 5 },
  ],
};

const recommendations = [
  { type: 'reading', icon: BookOpen, title: 'Chapter 15: Advanced DP Techniques', description: 'Review bottom-up vs top-down approaches', action: 'Read Now' },
  { type: 'video', icon: Video, title: 'Asymptotic Analysis Masterclass', description: '45-minute video covering worst/avg/best case', action: 'Watch Video' },
  { type: 'practice', icon: ListChecks, title: 'DP Practice Problems Set', description: '20 curated problems from easy to hard', action: 'Start Practice' },
  { type: 'group', icon: Users, title: 'Study Group: Algorithms', description: 'Join 15 other students for peer learning', action: 'Join Group' },
];

const feedbackHistory = [
  { exam: 'Algorithms Quiz 1', date: '2026-01-15', score: 72, change: null },
  { exam: 'Algorithms Quiz 2', date: '2026-02-01', score: 78, change: +6 },
  { exam: 'Algorithms Midterm', date: '2026-02-24', score: 84, change: +6 },
];

export default function FeedbackDetail() {
  const navigate = useNavigate();

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

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Learning Feedback & Insights</h1>
            <p className="text-muted-foreground">
              {examResult.title} · {examResult.course}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-primary">{examResult.totalScore}</p>
              <p className="text-xs text-muted-foreground">/ {examResult.maxScore} Total Score</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+{examResult.totalScore - examResult.avgScore} vs avg</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{examResult.percentile}th</p>
              <p className="text-xs text-muted-foreground">Percentile</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{examResult.timeUsed}</p>
              <p className="text-xs text-muted-foreground">Time Used</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <StatusBadge variant={examResult.passed ? 'success' : 'destructive'} className="text-base px-4 py-1">
                {examResult.passed ? 'PASSED' : 'FAILED'}
              </StatusBadge>
              <p className="text-xs text-muted-foreground mt-2">Result</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left column — 2/3 */}
          <div className="col-span-2 space-y-6">
            {/* Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Score Breakdown
                </CardTitle>
                <CardDescription>Performance by exam section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectionScores.map((section) => (
                    <div key={section.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{section.name}</span>
                        <span className="text-muted-foreground">
                          {section.score}/{section.max} ({section.percentage}%)
                        </span>
                      </div>
                      <Progress value={section.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Answer Pattern Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Answer Pattern Analysis
                </CardTitle>
                <CardDescription>Strengths and areas for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Strengths
                  </h4>
                  <div className="space-y-2">
                    {answerPatterns.strengths.map((s) => (
                      <div key={s.topic} className="flex items-center justify-between p-2 rounded bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900">
                        <span className="text-sm font-medium">{s.topic}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{s.questions} questions</span>
                          <StatusBadge variant="success">{s.accuracy}%</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> Areas to Improve
                  </h4>
                  <div className="space-y-2">
                    {answerPatterns.weaknesses.map((w) => (
                      <div key={w.topic} className="flex items-center justify-between p-2 rounded bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                        <span className="text-sm font-medium">{w.topic}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{w.questions} questions</span>
                          <StatusBadge variant="destructive">{w.accuracy}%</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Personalized Recommendations
                </CardTitle>
                <CardDescription>Based on your performance and weak areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <rec.icon className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">{rec.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{rec.description}</p>
                      <Button size="sm" variant="outline" className="w-full">
                        {rec.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-6">
            {/* Feedback History / Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Progress History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedbackHistory.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded border border-border">
                      <div>
                        <p className="text-sm font-medium">{item.exam}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{item.score}%</p>
                        {item.change !== null && (
                          <span className={`text-xs flex items-center gap-0.5 ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {item.change > 0 ? '+' : ''}{item.change}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Related Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" size="sm" onClick={() => navigate('/student/grading')}>
                  <BarChart3 className="h-4 w-4" /> Grading Breakdown
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" size="sm" onClick={() => navigate('/student/timeline')}>
                  <Clock className="h-4 w-4" /> Event Timeline
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" size="sm" onClick={() => navigate('/student/learning-feedback')}>
                  <Brain className="h-4 w-4" /> Deep Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
