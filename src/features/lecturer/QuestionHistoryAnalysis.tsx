"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Loader2, Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

type QuestionMetric = {
  versionId: string;
  versionNo: number;
  exam: string;
  date: string;
  attempts: number;
  correctRate: number | null;
  difficulty: number | null;
  discrimination: number | null;
  reliability: number | null;
};

type QuestionHistoryRow = {
  id: string;
  content: string;
  course: string;
  type: string;
  status: string;
  metrics: QuestionMetric[];
  versions: Array<{ id: string; versionNo: number; stem: string; aiGenerated: boolean; createdAt: string }>;
  trend: "stable" | "improving" | "degrading";
  recommendation: string | null;
};

export default function QuestionHistoryAnalysis() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin") ? "/admin" : "/lecturer";
  const questionBankPath = `${basePath}/question-bank`;
  const questionEditorPath = `${basePath}/question-editor`;
  const [rows, setRows] = useState<QuestionHistoryRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionHistoryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await api.getQuestionHistory();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        if (!active) return;
        setRows(data);
        setStats(payload?.stats || null);
        setSelectedQuestion(data[0] || null);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load question history");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const chartMetrics = useMemo(
    () => (selectedQuestion?.metrics.length ? selectedQuestion.metrics : []),
    [selectedQuestion],
  );

  const lineData = useMemo(
    () => ({
      labels: chartMetrics.map((metric) => metric.exam),
      datasets: [
        {
          label: "Difficulty Index",
          data: chartMetrics.map((metric) => metric.difficulty ?? 0),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Discrimination",
          data: chartMetrics.map((metric) => metric.discrimination ?? 0),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Reliability proxy",
          data: chartMetrics.map((metric) => metric.reliability ?? 0),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    }),
    [chartMetrics],
  );

  const barData = useMemo(
    () => ({
      labels: chartMetrics.map((metric) => metric.exam),
      datasets: [
        {
          label: "Correct Rate",
          data: chartMetrics.map((metric) => Math.round((metric.correctRate ?? 0) * 100)),
          backgroundColor: chartMetrics.map((metric) => {
            const value = metric.correctRate ?? 0;
            return value > 0.5 ? "rgba(34, 197, 94, 0.7)" : value > 0.3 ? "rgba(234, 179, 8, 0.7)" : "rgba(239, 68, 68, 0.7)";
          }),
          borderRadius: 4,
        },
      ],
    }),
    [chartMetrics],
  );

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "degrading":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const latestMetric = (row: QuestionHistoryRow) => row.metrics[row.metrics.length - 1];
  const firstMetric = (row: QuestionHistoryRow) => row.metrics.find((metric) => metric.attempts > 0) || row.metrics[0];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground" onClick={() => router.push(questionBankPath)}>
          <ArrowLeft className="h-4 w-4" /> Back to Question Bank
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Question History & Performance Analysis
          </h1>
          <p className="text-muted-foreground">
            Real analytics from question versions, submissions, and stored question statistics.
          </p>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              Loading question history...
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card className="border-red-200">
            <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && rows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              No question history found. Publish versioned questions and collect submissions first.
            </CardContent>
          </Card>
        )}

        {!loading && !error && rows.length > 0 && selectedQuestion && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold">{stats?.totalQuestions ?? rows.length}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold">{stats?.withAttempts ?? 0}</p>
                  <p className="text-xs text-muted-foreground">With Attempts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-red-600">{stats?.degrading ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Needs Review</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-blue-600">{stats?.aiGenerated ?? 0}</p>
                  <p className="text-xs text-muted-foreground">AI-assisted</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="trends">
              <TabsList className="mb-4">
                <TabsTrigger value="trends">Metric Trends</TabsTrigger>
                <TabsTrigger value="drift">Difficulty Drift</TabsTrigger>
                <TabsTrigger value="history">Version History</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[620px] overflow-y-auto">
                      {rows.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => setSelectedQuestion(row)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedQuestion.id === row.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{row.id.slice(0, 8)}</span>
                            <div className="flex items-center gap-1">
                              {trendIcon(row.trend)}
                              <StatusBadge variant={row.trend === "improving" ? "success" : row.trend === "degrading" ? "destructive" : "default"}>
                                {row.trend}
                              </StatusBadge>
                            </div>
                          </div>
                          <p className="text-xs line-clamp-2">{row.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {row.course} · {row.versions.length} version(s)
                          </p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="col-span-2 space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Metric Trends</CardTitle>
                        <CardDescription className="line-clamp-1">{selectedQuestion.content}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {chartMetrics.some((metric) => metric.attempts > 0) ? (
                          <Line data={lineData} options={{ responsive: true, scales: { y: { min: 0, max: 1 } }, plugins: { legend: { position: "bottom" } } }} />
                        ) : (
                          <div className="py-12 text-center text-muted-foreground">No completed attempts for this question yet.</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Correct Answer Rate (%)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {chartMetrics.some((metric) => metric.attempts > 0) ? (
                          <Bar data={barData} options={{ responsive: true, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }} />
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">Waiting for submission data.</div>
                        )}
                      </CardContent>
                    </Card>

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
                                  <RefreshCw className="h-3 w-3" /> Create New Version
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => router.push(`${questionEditorPath}?id=${selectedQuestion.id}`)}>
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

              <TabsContent value="drift">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Difficulty Drift Overview</CardTitle>
                    <CardDescription>Difficulty and discrimination changes from real submission statistics.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">ID</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-20">Course</TableHead>
                          <TableHead className="w-28">Initial Diff.</TableHead>
                          <TableHead className="w-28">Current Diff.</TableHead>
                          <TableHead className="w-20">Attempts</TableHead>
                          <TableHead className="w-24">Trend</TableHead>
                          <TableHead className="w-28">Discrim.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const initial = firstMetric(row);
                          const current = latestMetric(row);
                          const initialDiff = initial?.difficulty ?? 0;
                          const currentDiff = current?.difficulty ?? 0;
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                              <TableCell><p className="text-sm line-clamp-1">{row.content}</p></TableCell>
                              <TableCell className="font-mono text-xs">{row.course}</TableCell>
                              <TableCell>
                                <span className="text-sm">{initial?.attempts ? initialDiff.toFixed(2) : "No data"}</span>
                                <Progress value={initialDiff * 100} className="h-1 mt-1" />
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{current?.attempts ? currentDiff.toFixed(2) : "No data"}</span>
                                <Progress value={currentDiff * 100} className="h-1 mt-1" />
                              </TableCell>
                              <TableCell>{row.metrics.reduce((sum, metric) => sum + metric.attempts, 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {trendIcon(row.trend)}
                                  <StatusBadge variant={row.trend === "improving" ? "success" : row.trend === "degrading" ? "destructive" : "default"}>
                                    {row.trend}
                                  </StatusBadge>
                                </div>
                              </TableCell>
                              <TableCell>{current?.discrimination !== null && current?.discrimination !== undefined ? current.discrimination.toFixed(2) : "No data"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Version History</CardTitle>
                    <CardDescription>Immutable question versions used for historical exam preservation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedQuestion.versions.map((version, index) => (
                      <div key={version.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full ${version.aiGenerated ? "bg-blue-500" : index === 0 ? "bg-green-500" : "bg-muted-foreground"}`} />
                          {index < selectedQuestion.versions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">v{version.versionNo}</span>
                              <span className="text-sm font-medium">{version.aiGenerated ? "AI-assisted version" : index === 0 ? "Initial version" : "Manual version"}</span>
                              {version.aiGenerated && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{version.stem}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
