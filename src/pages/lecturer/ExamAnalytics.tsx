import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FileText,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

// ─── Mock data ────────────────────────────────────────────────────
const exams = [
  {
    id: "e1",
    title: "Midterm – Database Systems",
    course: "CS301",
    date: "2026-02-10",
    students: 38,
    avgScore: 74.2,
    passRate: 82,
    avgTime: "52 min",
  },
  {
    id: "e2",
    title: "Quiz 1 – Data Structures",
    course: "CS201",
    date: "2026-01-28",
    students: 45,
    avgScore: 68.5,
    passRate: 71,
    avgTime: "23 min",
  },
  {
    id: "e3",
    title: "Final – Operating Systems",
    course: "CS401",
    date: "2026-01-15",
    students: 31,
    avgScore: 61.0,
    passRate: 65,
    avgTime: "87 min",
  },
  {
    id: "e4",
    title: "Quiz 2 – Computer Networks",
    course: "CS350",
    date: "2025-12-20",
    students: 27,
    avgScore: 79.4,
    passRate: 89,
    avgTime: "18 min",
  },
];

const questionStats = [
  {
    q: "Q1: Relational Algebra – Natural Join",
    correct: 88,
    type: "Single Choice",
  },
  { q: "Q2: SQL – GROUP BY with HAVING", correct: 61, type: "Multi Choice" },
  { q: "Q3: 3NF Normalization", correct: 44, type: "Fill Blank" },
  { q: "Q4: ACID Properties – True/False", correct: 92, type: "True / False" },
  { q: "Q5: ER Diagram – Matching", correct: 53, type: "Matching" },
  {
    q: "Q6: Transaction deadlock – Find Error",
    correct: 37,
    type: "Find Error",
  },
  { q: "Q7: Index types ordering", correct: 69, type: "Ordering" },
  { q: "Q8: Explain MVCC – Essay", correct: 55, type: "Short Answer" },
];

const scoreDistribution = [
  { range: "0–49", count: 4 },
  { range: "50–59", count: 5 },
  { range: "60–69", count: 7 },
  { range: "70–79", count: 11 },
  { range: "80–89", count: 8 },
  { range: "90–100", count: 3 },
];

const integrityEvents = [
  {
    student: "Nguyen Van A",
    event: "Tab switch detected",
    count: 3,
    risk: "high",
  },
  {
    student: "Tran Thi B",
    event: "Unusual submission speed",
    count: 1,
    risk: "medium",
  },
  {
    student: "Le Van C",
    event: "IP address mismatch",
    count: 1,
    risk: "medium",
  },
  {
    student: "Pham Thi D",
    event: "Fullscreen exit detected",
    count: 2,
    risk: "low",
  },
];

const riskColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

export default function ExamAnalytics() {
  const [selectedExam, setSelectedExam] = useState("e1");
  const exam = exams.find((e) => e.id === selectedExam) ?? exams[0];
  const totalStudents = exam.students;
  const maxCount = Math.max(...scoreDistribution.map((d) => d.count));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* <BackToDashboardButton to="/lecturer" className="-ml-2" /> */}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Exam Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Detailed performance insights for your exams
            </p>
          </div>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Students",
              value: exam.students,
              sub: "submitted",
              icon: <Users className="h-5 w-5 text-blue-600" />,
              bg: "bg-blue-50",
            },
            {
              label: "Avg. Score",
              value: `${exam.avgScore}%`,
              sub: "out of 100",
              icon: <Award className="h-5 w-5 text-violet-600" />,
              bg: "bg-violet-50",
            },
            {
              label: "Pass Rate",
              value: `${exam.passRate}%`,
              sub: "of students",
              icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
              bg: "bg-green-50",
            },
            {
              label: "Avg. Time",
              value: exam.avgTime,
              sub: "to complete",
              icon: <Clock className="h-5 w-5 text-amber-600" />,
              bg: "bg-amber-50",
            },
          ].map(({ label, value, sub, icon, bg }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div
                  className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}
                >
                  {icon}
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Score
                Distribution
              </CardTitle>
              <CardDescription>
                {exam.title} — {totalStudents} students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoreDistribution.map((d) => {
                const pct = Math.round((d.count / maxCount) * 100);
                return (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14 shrink-0 text-right">
                      {d.range}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 bg-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-sm transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium w-6 text-right">
                      {d.count}
                    </span>
                  </div>
                );
              })}
              <Separator className="mt-2" />
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  Failed:{" "}
                  {scoreDistribution
                    .filter(
                      (d) =>
                        d.range.startsWith("0") ||
                        d.range.startsWith("5–") ||
                        d.range === "50–59",
                    )
                    .reduce((a, b) => a + b.count, 0)}{" "}
                  students
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  Passed:{" "}
                  {exam.students -
                    scoreDistribution
                      .slice(0, 2)
                      .reduce((a, b) => a + b.count, 0)}{" "}
                  students
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Per-question accuracy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Question Accuracy
              </CardTitle>
              <CardDescription>
                % of students who answered correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionStats.map((qs, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground max-w-[70%]">
                      {qs.q}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {qs.type}
                      </Badge>
                      <span
                        className={`font-semibold ${qs.correct < 50 ? "text-red-600" : qs.correct >= 80 ? "text-green-600" : "text-amber-600"}`}
                      >
                        {qs.correct}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={qs.correct}
                    className={`h-1.5 ${qs.correct < 50 ? "[&>div]:bg-red-500" : qs.correct >= 80 ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Integrity flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Integrity
              Flags
            </CardTitle>
            <CardDescription>
              Suspicious events detected during the exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            {integrityEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No integrity events detected.
              </p>
            ) : (
              <div className="space-y-2">
                {integrityEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border rounded-lg px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.student}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.event}
                      </p>
                    </div>
                    <Badge variant="outline">{ev.count}×</Badge>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${riskColor[ev.risk]}`}
                    >
                      {ev.risk}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All exams overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> All Exams Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4 font-medium">Exam</th>
                    <th className="text-left py-2 pr-4 font-medium">Course</th>
                    <th className="text-right py-2 pr-4 font-medium">
                      Students
                    </th>
                    <th className="text-right py-2 pr-4 font-medium">
                      Avg Score
                    </th>
                    <th className="text-right py-2 font-medium">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map((e) => (
                    <tr
                      key={e.id}
                      className={`cursor-pointer hover:bg-muted/40 transition-colors ${selectedExam === e.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedExam(e.id)}
                    >
                      <td className="py-2.5 pr-4 font-medium">{e.title}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline">{e.course}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right">{e.students}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold">
                        {e.avgScore}%
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`font-semibold ${e.passRate >= 80 ? "text-green-600" : e.passRate >= 60 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {e.passRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-4">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
