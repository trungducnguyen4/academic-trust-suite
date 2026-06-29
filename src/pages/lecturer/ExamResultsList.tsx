import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Activity, AlertTriangle, ClipboardCheck, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import api, { API_BASE_URL, unwrapPaginatedData } from "@/lib/api";

type ExamOverview = {
  exam: {
    id: string;
    title: string;
    totalPoints?: number;
  };
  analyticsScope?: "OFFICIAL" | "PRACTICE";
  isUnlimited?: boolean;
  summary: {
    totalSubmissions: number;
    analyzedSubmissions?: number;
    inProgress: number;
    completed: number;
    avgScorePct: number;
    highestScorePct: number;
    lowestScorePct: number;
  };
  scoreDistribution: Array<{ key: string; count: number }>;
  anomalies: Array<{
    id: string;
    eventType: string;
    details?: string;
    timestamp: string;
    severity: "low" | "medium" | "high";
    student?: { fullName?: string; studentId?: string } | null;
  }>;
  updatedAt: string;
};

function formatTimeSpent(start?: string | null, end?: string | null) {
  if (!start || !end) return "-";
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ExamResultsList() {
  const { id: examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/lecturer";

  const [examTitle, setExamTitle] = useState("Exam Results");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [manualStatus, setManualStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let mounted = true;

    const fetchData = async (silent = false) => {
      if (!examId) return;

      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [examRes, subsRes, overviewRes, manualStatusRes] = await Promise.all([
          api.getExam(examId),
          api.getExamSubmissions(examId, page, ITEMS_PER_PAGE),
          api.getExamOverview(examId),
          api.getExamManualGradingStatus(examId).catch(() => null),
        ]);

        if (!mounted) return;

        setExamTitle(examRes?.title || "Exam Results");
        setSubmissions(unwrapPaginatedData(subsRes));
        setTotalPages(subsRes?.totalPages ?? 1);
        setOverview(overviewRes || null);
        setManualStatus(manualStatusRes || null);
      } catch (err) {
        console.error("Failed to load exam results", err);
      } finally {
        if (!mounted) return;
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalId = window.setInterval(() => fetchData(true), 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [examId, page]);

  const filtered = submissions.filter((s) => {
    if (!search) return true;
    const name = s.student?.fullName || "";
    const sid = s.student?.studentId || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      sid.toLowerCase().includes(search.toLowerCase())
    );
  });
  const manualBySubmission = new Map(
    (manualStatus?.submissions || []).map((row: any) => [row.submissionId, row]),
  );

  const handleExport = async (format = "csv") => {
    if (!examId) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${API_BASE_URL}/submissions/exam/${examId}/export`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${examTitle.replace(/\s+/g, "_") || "exam"}-results.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const handlePublishResults = async () => {
    if (!examId) return;
    try {
      setIsPublishing(true);
      const nextStatus = await api.publishExamResults(examId);
      setManualStatus(nextStatus);
      const subsRes = await api.getExamSubmissions(examId, page, ITEMS_PER_PAGE);
      setSubmissions(unwrapPaginatedData(subsRes));
      toast.success("Results published to students.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to publish results.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5 rounded-3xl bg-gradient-to-b from-slate-50/90 via-background to-background px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
              Exam analytics
            </div>
            {overview?.analyticsScope ? (
              <StatusBadge
                status={overview.analyticsScope === "OFFICIAL" ? "published" : "available"}
                domain="exam"
              >
                {overview.analyticsScope === "OFFICIAL" ? "Official analytics" : "Practice analytics"}
              </StatusBadge>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Student Exam Results List - {examTitle}
            </h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              {isRefreshing
                ? "Updating live data..."
                : `Last update: ${overview?.updatedAt ? new Date(overview.updatedAt).toLocaleTimeString() : "N/A"}`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={() => handleExport("csv")} className="shadow-sm">
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              className="border-slate-300 bg-background/80 shadow-sm"
            >
              Export PDF
            </Button>
          </div>
        </div>

        {manualStatus?.hasManualGrading ? (
          <Card className="border-amber-200 bg-amber-50/70 shadow-[0_16px_40px_-30px_rgba(180,83,9,0.45)]">
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-amber-950">
                    Manual grading required
                  </h2>
                  <p className="mt-1 text-sm text-amber-800">
                    {manualStatus.manualGraded}/{manualStatus.manualTotal} subjective answers graded.
                    {manualStatus.published
                      ? " Results have been published to students."
                      : manualStatus.manualPending > 0
                      ? ` ${manualStatus.manualPending} answers still need points and feedback review.`
                      : " All subjective answers are ready to publish."}
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePublishResults}
                disabled={!manualStatus.canPublish || isPublishing}
                className="gap-2 shadow-sm"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publish Results
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold tracking-tight">Score Distribution (Live)</h2>
                  <p className="text-xs text-muted-foreground">
                    A compact read on how the cohort is spreading out.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-muted-foreground">
                  Avg:{" "}
                  <span className="font-semibold text-foreground">
                    {overview?.summary?.avgScorePct ?? 0}%
                  </span>{" "}
                  | High:{" "}
                  <span className="font-semibold text-foreground">
                    {overview?.summary?.highestScorePct ?? 0}%
                  </span>
                </div>
              </div>

              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.scoreDistribution || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.65}
                    />
                    <XAxis
                      dataKey="key"
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                        boxShadow: "0 16px 30px -20px rgba(15, 23, 42, 0.45)",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-muted-foreground">Completed</p>
                  <p className="mt-1 font-semibold text-emerald-700">
                    {overview?.summary?.completed ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-muted-foreground">In Progress</p>
                  <p className="mt-1 font-semibold text-amber-700">
                    {overview?.summary?.inProgress ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-muted-foreground">Total</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {overview?.summary?.totalSubmissions ?? 0}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-full bg-amber-100 p-1.5 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold tracking-tight">Suspicious Activities</h2>
                  <p className="text-xs text-muted-foreground">
                    Signals only, no automatic cheating verdict.
                  </p>
                </div>
              </div>

              <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                {(overview?.anomalies?.length || 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suspicious actions detected yet.
                  </p>
                ) : (
                  overview?.anomalies?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-background to-slate-50/70 p-3 shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {item.student?.fullName || "Unknown student"}
                        </p>
                        <StatusBadge domain="severity" status={item.severity} />
                      </div>
                      <p className="text-xs font-medium text-slate-700">{item.eventType}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.details || "-"}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <CardContent className="p-0">
            <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-4">
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by Name or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 bg-background/90 pl-9 shadow-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table className="border-separate border-spacing-0">
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="bg-slate-50/80 font-semibold text-slate-600">
                      Student Name
                    </TableHead>
                    <TableHead className="bg-slate-50/80 font-semibold text-slate-600">
                      ID
                    </TableHead>
                    <TableHead className="bg-slate-50/80 font-semibold text-slate-600">
                      Score (Points)
                    </TableHead>
                    <TableHead className="bg-slate-50/80 font-semibold text-slate-600">
                      Time Spent
                    </TableHead>
                    <TableHead className="bg-slate-50/80 font-semibold text-slate-600">
                      Status
                    </TableHead>
                    <TableHead className="bg-slate-50/80 text-right font-semibold text-slate-600">
                      Manual Grading
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No submissions found for this exam yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => {
                      const manualRow = manualBySubmission.get(s.id) as any;
                      return (
                      <TableRow key={s.id} className="transition-colors hover:bg-slate-50/80">
                        <TableCell className="py-4">
                          <a
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            onClick={() => navigate(`${basePath}/exam/${examId}/monitor`)}
                          >
                            {s.student?.fullName || "—"}
                          </a>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">
                          {s.student?.studentId || s.student?.id}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-foreground">
                          {s.score != null
                            ? `${s.score}/${overview?.exam?.totalPoints ?? "-"}`
                            : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">
                          {formatTimeSpent(s.startedAt, s.submittedAt)}
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge domain="submission" status={s.status} />
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          {manualRow?.manualTotal > 0 ? (
                            <Button
                              size="sm"
                              variant={manualRow.completed ? "outline" : "default"}
                              onClick={() =>
                                navigate(`${basePath}/exam/${examId}/submissions/${s.id}/manual-grading`)
                              }
                            >
                              {manualRow.completed
                                ? "Review Grading"
                                : `Grade ${manualRow.manualPending}/${manualRow.manualTotal}`}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Auto only</span>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={submissions.length}
          onPageChange={setPage}
          itemLabel="submissions"
          className="border-t-0 px-0"
        />
      </div>
    </DashboardLayout>
  );
}
