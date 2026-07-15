"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  analyticsScope?: "OFFICIAL" | "PRACTICE";
  isUnlimited?: boolean;
  kpis: {
    totalSubmissions: number;
    analyzedSubmissions?: number;
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
  const router = useRouter();
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
    router.push(`${action.path}${toQuery(action.params)}`);
  };

  const getKpiCards = (payload: IntelligencePayload) => [
    {
      icon: TrendingUp,
      value: `${payload.kpis.avgScorePct.toFixed(1)}%`,
      label: "Average Score",
      iconWrapClassName: "bg-sky-500/10",
      iconClassName: "text-sky-600",
      className: "border-sky-200/60 bg-gradient-to-br from-sky-50/70 to-background",
    },
    {
      icon: TrendingUp,
      value: `${payload.kpis.passRate.toFixed(1)}%`,
      label: "Pass Rate",
      iconWrapClassName: "bg-emerald-500/10",
      iconClassName: "text-emerald-600",
      className: "border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 to-background",
    },
    {
      icon: TrendingUp,
      value: `${payload.kpis.completionRate.toFixed(1)}%`,
      label: "Completion",
      iconWrapClassName: "bg-amber-500/10",
      iconClassName: "text-amber-600",
      className: "border-amber-200/60 bg-gradient-to-br from-amber-50/70 to-background",
    },
    {
      icon: AlertTriangle,
      value: String(payload.creatorQualityAlerts.length),
      label: "Quality Alerts",
      iconWrapClassName: "bg-rose-500/10",
      iconClassName: "text-rose-600",
      className: "border-rose-200/60 bg-gradient-to-br from-rose-50/70 to-background",
    },
  ];

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
            {data?.analyticsScope ? (
              <Badge variant={data.analyticsScope === "OFFICIAL" ? "default" : "secondary"} className="mb-2">
                {data.analyticsScope === "OFFICIAL" ? "Official analytics" : "Practice analytics"}
              </Badge>
            ) : null}
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
          <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-background">
            <CardContent className="py-8 text-center text-muted-foreground">
              No intelligence data available for this exam yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {getKpiCards(data).map((card) => (
                <AdminStatCard
                  key={card.label}
                  icon={card.icon}
                  value={card.value}
                  label={card.label}
                  iconWrapClassName={card.iconWrapClassName}
                  iconClassName={card.iconClassName}
                  className={card.className}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden border-sky-200/70 bg-gradient-to-br from-sky-50/50 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">
                    Correct vs Incorrect vs Skipped
                  </CardTitle>
                  <CardDescription>Quick scan of answer outcomes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Correct
                    </Badge>
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      Incorrect
                    </Badge>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      Skipped
                    </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Correct</span><span>{distribution.correctPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.correctPct} className="h-2 [&>div]:bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Incorrect</span><span>{distribution.incorrectPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.incorrectPct} className="h-2 [&>div]:bg-rose-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Skipped</span><span>{distribution.skippedPct.toFixed(1)}%</span></div>
                    <Progress value={distribution.skippedPct} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-violet-200/70 bg-gradient-to-br from-violet-50/50 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">Progress Over Time</CardTitle>
                  <CardDescription>Average score by submission date.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.visualizations.trendSeries || []).map((row) => (
                    <div key={row.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{row.date}</span>
                      <div className="flex-1">
                        <Progress value={row.avgScorePct} className="h-2 [&>div]:bg-violet-500" />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{row.avgScorePct}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-sky-200/70 bg-gradient-to-br from-sky-50/40 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                    <Sparkles className="h-4 w-4 text-sky-600" />
                  </span>
                  AI Summary
                </CardTitle>
                <CardDescription>Short insight narrative generated from exam performance patterns.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{data.aiSummary}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50/40 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">Weakest Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.weakestTopics.map((item) => (
                    <div
                      key={`${item.topicId}-${item.topicName}`}
                      className="rounded-lg border border-amber-200/70 bg-white/70 p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.topicName}</p>
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          {item.incorrectRate.toFixed(0)}% incorrect
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Skip rate: {item.skipRate.toFixed(0)}%</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1 border-amber-200/70 hover:bg-amber-50"
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

              <Card className="overflow-hidden border-rose-200/70 bg-gradient-to-br from-rose-50/40 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">Most Incorrect Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.mostIncorrectQuestions.map((item) => (
                    <div
                      key={item.questionId}
                      className="rounded-lg border border-rose-200/70 bg-white/70 p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Q{item.orderIndex + 1}</p>
                        <Badge
                          variant="outline"
                          className="border-rose-200 bg-rose-50 text-rose-700"
                        >
                          {item.incorrectRate.toFixed(0)}% incorrect
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.questionText}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1 border-rose-200/70 hover:bg-rose-50"
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
              <Card className="overflow-hidden border-sky-200/70 bg-gradient-to-br from-sky-50/40 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.aiRecommendations.map((item, idx) => (
                    <div
                      key={`${item.title}-${idx}`}
                      className="rounded-lg border border-sky-200/70 bg-white/70 p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1 border-sky-200/70 hover:bg-sky-50"
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

              <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 to-background">
                <CardHeader>
                  <CardTitle className="text-slate-900">Question Quality Alerts</CardTitle>
                  <CardDescription>Support for content creators/admins.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.creatorQualityAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No high-risk question quality alerts detected.</p>
                  ) : (
                    data.creatorQualityAlerts.map((item) => (
                      <div
                        key={item.questionId}
                        className="rounded-lg border border-emerald-200/70 bg-white/70 p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium">{item.questionLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.signal}</p>
                        <p className="text-xs mt-1">{item.suggestion}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1 border-emerald-200/70 hover:bg-emerald-50"
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

          </div>
        )}
      </AdminPageShell>
    </DashboardLayout>
  );
}



