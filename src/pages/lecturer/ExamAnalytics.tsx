import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { unwrapPaginatedData } from "@/lib/api";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

type ExamOption = {
  id: string;
  title: string;
  course?: { code?: string; name?: string };
};

type IntelligencePayload = {
  exam: { id: string; title: string; courseId: string };
  kpis: {
    totalSubmissions: number;
    completedSubmissions: number;
    completionRate: number;
    avgScorePct: number;
    passRate: number;
  };
  visualizations: {
    correctVsIncorrect: {
      correct: number;
      incorrect: number;
      skipped: number;
    };
    trendSeries: Array<{ date: string; avgScorePct: number }>;
  };
  mostIncorrectQuestions: Array<{
    questionId: string;
    orderIndex: number;
    questionText: string;
    incorrectRate: number;
    skipRate: number;
    flaggedCount: number;
    action?: { path: string; params?: Record<string, string> };
  }>;
  weakestTopics: Array<{
    topicId?: string | null;
    topicName: string;
    incorrectRate: number;
    skipRate: number;
    action?: { path: string; params?: Record<string, string> };
  }>;
  slowestQuestionTypes: Array<{
    type: string;
    avgTimeSeconds: number;
    incorrectRate: number;
    action?: { path: string; params?: Record<string, string> };
  }>;
  mostFlaggedQuestions: Array<{
    questionId: string;
    orderIndex: number;
    flaggedCount: number;
    questionText: string;
    action?: { path: string; params?: Record<string, string> };
  }>;
  abnormalSkips: Array<{
    questionId: string;
    orderIndex: number;
    skipRate: number;
    questionText: string;
    action?: { path: string; params?: Record<string, string> };
  }>;
  aiSummary: string;
  aiRecommendations: Array<{
    title: string;
    detail: string;
    action?: { path: string; params?: Record<string, string> };
  }>;
  creatorQualityAlerts: Array<{
    questionId: string;
    questionLabel: string;
    signal: string;
    suggestion: string;
    action?: { path: string; params?: Record<string, string> };
  }>;
  trackingPlan?: {
    experimentName: string;
    primaryMetrics: string[];
    eventKeys: string[];
  };
};

function toQuery(params?: Record<string, string>) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default function ExamAnalytics() {
  const navigate = useNavigate();
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [data, setData] = useState<IntelligencePayload | null>(null);

  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        const response = await api.getExams({ page: 1, limit: 100 });
        const items = unwrapPaginatedData<ExamOption>(response);
        setExamOptions(items);
        if (items.length > 0) {
          setSelectedExamId(items[0].id);
        }
      } catch (error) {
        console.error("Failed to load exams for analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;

    const loadIntelligence = async () => {
      try {
        setLoadingIntelligence(true);
        const payload = await api.getExamIntelligence(selectedExamId);
        setData(payload as IntelligencePayload);
      } catch (error) {
        console.error("Failed to load exam intelligence:", error);
        setData(null);
      } finally {
        setLoadingIntelligence(false);
      }
    };

    loadIntelligence();
  }, [selectedExamId]);

  const distribution = useMemo(() => {
    const total = (data?.visualizations.correctVsIncorrect.correct || 0)
      + (data?.visualizations.correctVsIncorrect.incorrect || 0)
      + (data?.visualizations.correctVsIncorrect.skipped || 0);
    return {
      total,
      correctPct: total ? ((data?.visualizations.correctVsIncorrect.correct || 0) / total) * 100 : 0,
      incorrectPct: total ? ((data?.visualizations.correctVsIncorrect.incorrect || 0) / total) * 100 : 0,
      skippedPct: total ? ((data?.visualizations.correctVsIncorrect.skipped || 0) / total) * 100 : 0,
    };
  }, [data]);

  const openAction = (action?: { path: string; params?: Record<string, string> }) => {
    if (!action?.path) return;
    navigate(`${action.path}${toQuery(action.params)}`);
  };

  const trackAction = async (name: string) => {
    try {
      await api.sendExamLogs(
        "analytics",
        [{ type: "analytics_action_click", details: JSON.stringify({ event: name, examId: selectedExamId }), ts: Date.now() }],
      );
    } catch {
      // Non-blocking tracking.
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading analytics setup...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminPageShell backTo="/lecturer">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Performance Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Analyze - Practice - Improve loop per exam.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {examOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingIntelligence ? (
          <div className="min-h-[35vh] flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading intelligence data...
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No intelligence data available for this exam yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AdminStatCard icon={TrendingUp} value={data.kpis.avgScorePct.toFixed(1) + "%"} label="Average Score" />
              <AdminStatCard icon={TrendingUp} value={data.kpis.passRate.toFixed(1) + "%"} label="Pass Rate" />
              <AdminStatCard icon={TrendingUp} value={data.kpis.completionRate.toFixed(1) + "%"} label="Completion" />
              <AdminStatCard icon={AlertTriangle} value={String(data.creatorQualityAlerts.length)} label="Quality Alerts" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Correct vs Incorrect vs Skipped</CardTitle>
                  <CardDescription>Quick scan of answer outcomes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Correct</span><span>{distribution.correctPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.correctPct} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Incorrect</span><span>{distribution.incorrectPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.incorrectPct} className="h-2 [&>div]:bg-red-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Skipped</span><span>{distribution.skippedPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.skippedPct} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Over Time</CardTitle>
                  <CardDescription>Average score by submission date.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.visualizations.trendSeries || []).map((row) => (
                    <div key={row.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{row.date}</span>
                      <div className="flex-1">
                        <Progress value={row.avgScorePct} className="h-2" />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{row.avgScorePct}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Summary</CardTitle>
                <CardDescription>Short insight narrative generated from exam performance patterns.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{data.aiSummary}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weakest Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.weakestTopics.map((item) => (
                    <div key={`${item.topicId}-${item.topicName}`} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.topicName}</p>
                        <Badge variant="outline">{item.incorrectRate.toFixed(0)}% incorrect</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Skip rate: {item.skipRate.toFixed(0)}%</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => {
                          trackAction("weakest_topic_open_practice");
                          openAction(item.action);
                        }}
                      >
                        Open Related Practice Set <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Incorrect Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.mostIncorrectQuestions.map((item) => (
                    <div key={item.questionId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Q{item.orderIndex + 1}</p>
                        <Badge variant="outline">{item.incorrectRate.toFixed(0)}% incorrect</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.questionText}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => {
                          trackAction("most_incorrect_open_bank");
                          openAction(item.action);
                        }}
                      >
                        Open in Question Bank <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.aiRecommendations.map((item, idx) => (
                    <div key={`${item.title}-${idx}`} className="border rounded-lg p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1"
                        onClick={() => {
                          trackAction("ai_recommendation_action");
                          openAction(item.action);
                        }}
                      >
                        Take Action <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Question Quality Alerts</CardTitle>
                  <CardDescription>Support for content creators/admins.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.creatorQualityAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No high-risk question quality alerts detected.</p>
                  ) : (
                    data.creatorQualityAlerts.map((item) => (
                      <div key={item.questionId} className="border rounded-lg p-3">
                        <p className="text-sm font-medium">{item.questionLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.signal}</p>
                        <p className="text-xs mt-1">{item.suggestion}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => {
                            trackAction("quality_alert_open_question_bank");
                            openAction(item.action);
                          }}
                        >
                          Review in Question Bank <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Experiment Tracking (Sprint 4)</CardTitle>
                <CardDescription>{data.trackingPlan?.experimentName || "analytics-practice-loop-v1"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Primary metrics</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {(data.trackingPlan?.primaryMetrics || []).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="font-medium pt-2">Event keys</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {(data.trackingPlan?.eventKeys || []).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </AdminPageShell>
    </DashboardLayout>
  );
}
