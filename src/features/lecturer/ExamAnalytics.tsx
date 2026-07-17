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
import { Loader2, ExternalLink, Sparkles, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { unwrapPaginatedData } from "@/lib/api";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

type CourseTerm = "TERM_1" | "TERM_2" | "TERM_3" | (string & {});

type AnalyticsCourseInfo = {
  id: string;
  code: string;
  name: string;
  academicYear: string | null;
  term: CourseTerm | null;
};

type ExamOption = {
  id: string;
  title: string;
  course?: AnalyticsCourseInfo;
};

const TERM_LABELS: Record<string, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  TERM_3: "Term 3",
};

const formatTerm = (term: string | null | undefined): string => {
  if (!term) return "Unspecified term";
  return TERM_LABELS[term] || term;
};

const formatAcademicYear = (year: string | null | undefined): string => {
  if (!year) return "Unspecified academic year";
  return year;
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
  const [requestedExamId, setRequestedExamId] = useState("");
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [data, setData] = useState<IntelligencePayload | null>(null);

  useEffect(() => {
    setRequestedExamId(
      new URLSearchParams(window.location.search).get("examId") || "",
    );
  }, []);

  // Derived: unique academic years from all exams (via course)
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    examOptions.forEach((ex) => {
      const year = ex.course?.academicYear;
      if (year && year.trim()) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [examOptions]);

  // Derived: terms filtered by selected academic year
  const terms = useMemo(() => {
    const termSet = new Set<string>();
    const filtered = selectedAcademicYear && selectedAcademicYear !== "__all__"
      ? examOptions.filter((ex) => ex.course?.academicYear === selectedAcademicYear)
      : examOptions;
    filtered.forEach((ex) => {
      const t = ex.course?.term;
      if (t && t.trim()) termSet.add(t);
    });
    return Array.from(termSet);
  }, [examOptions, selectedAcademicYear]);

  // Derived: exams filtered by academic year and term
  const filteredExams = useMemo(() => {
    let result = examOptions;
    if (selectedAcademicYear && selectedAcademicYear !== "__all__") {
      result = result.filter((ex) => ex.course?.academicYear === selectedAcademicYear);
    }
    if (selectedTerm && selectedTerm !== "__all__") {
      result = result.filter((ex) => ex.course?.term === selectedTerm);
    }
    return result;
  }, [examOptions, selectedAcademicYear, selectedTerm]);

  // Sync selected exam when filters change
  useEffect(() => {
    if (!filteredExams.length) {
      setSelectedExamId("");
      return;
    }
    const stillValid = filteredExams.some((ex) => ex.id === selectedExamId);
    const requestedStillValid =
      requestedExamId && filteredExams.some((ex) => ex.id === requestedExamId);
    if (requestedStillValid && selectedExamId !== requestedExamId) {
      setSelectedExamId(requestedExamId);
      return;
    }
    if (!stillValid) {
      setSelectedExamId(filteredExams[0].id);
    }
  }, [filteredExams, requestedExamId, selectedExamId]);

  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        const response = await api.getExams({ page: 1, limit: 100 });
        const items = unwrapPaginatedData<ExamOption>(response);
        setExamOptions(items);
        if (items.length > 0) {
          const requestedExam = items.find((item) => item.id === requestedExamId);
          setSelectedExamId(requestedExam?.id || items[0].id);
        }
      } catch (error) {
        console.error("Failed to load exams for analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [requestedExamId]);

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
        {/* Page Header */}
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
        </div>

        {/* Exam Analytics Filter Panel */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Exam Analytics Filter
            </CardTitle>
            <CardDescription>Select an exam to view its performance analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_minmax(320px,1fr)]">
              {/* Academic Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
                <Select value={selectedAcademicYear} onValueChange={(val) => { setSelectedAcademicYear(val); setSelectedTerm(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All academic years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All academic years</SelectItem>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Term */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="All terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All terms</SelectItem>
                    {terms.map((term) => (
                      <SelectItem key={term} value={term}>{formatTerm(term)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exam */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Exam</label>
                <Select
                  value={selectedExamId}
                  onValueChange={setSelectedExamId}
                  disabled={loadingIntelligence || filteredExams.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filteredExams.length === 0 ? "No exams found" : "Select an exam"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredExams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.course?.code ? `${e.course.code} — ` : ""}{e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Currently analyzing badge row */}
            {selectedExamId && (() => {
              const current = examOptions.find((ex) => ex.id === selectedExamId);
              if (!current) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Currently analyzing:</span>
                  {current.course?.code && (
                    <Badge variant="outline" className="text-xs">{current.course.code}</Badge>
                  )}
                  {current.course?.academicYear && (
                    <Badge variant="outline" className="text-xs">{current.course.academicYear}</Badge>
                  )}
                  {current.course?.term && (
                    <Badge variant="outline" className="text-xs">{formatTerm(current.course.term)}</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{current.title}</Badge>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {!selectedExamId && !loadingIntelligence ? (
          <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-background">
            <CardContent className="py-12 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No exams found</p>
              <p className="text-sm mt-1">
                {selectedAcademicYear || selectedTerm
                  ? "No exams found for the selected academic year and term."
                  : "No exams are available for analytics. Create an exam first."}
              </p>
            </CardContent>
          </Card>
        ) : loadingIntelligence ? (
          <div className="min-h-[35vh] flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading intelligence data...
          </div>
        ) : !data ? (
          <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-background">
            <CardContent className="py-12 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No performance data</p>
              <p className="text-sm mt-1">
                No performance data is available for this exam yet.
              </p>
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

            <section className="rounded-xl border bg-gradient-to-br from-indigo-50/60 to-background dark:from-indigo-950/20 p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-foreground">AI Summary</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Short insight narrative generated from exam performance patterns.</p>
                  <div className="mt-4 whitespace-pre-wrap leading-7 text-sm text-foreground/90">
                    {data.aiSummary}
                  </div>
                </div>
              </div>
            </section>

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
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-slate-900">Question Quality Alerts</CardTitle>
                    <CardDescription>Support for content creators/admins.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-emerald-200/70 hover:bg-emerald-50 whitespace-nowrap"
                    disabled={!selectedExamId}
                    onClick={() => {
                      trackAction("open_ai_quality_review");
                      router.push(`/lecturer/exam/${selectedExamId}/quality-review`);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> AI Quality Review
                  </Button>
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

