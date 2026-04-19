import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Activity } from "lucide-react";
import api from "@/lib/api";
import { unwrapPaginatedData } from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ExamOverview = {
  exam: {
    id: string;
    title: string;
    totalPoints?: number;
  };
  summary: {
    totalSubmissions: number;
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
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const [examTitle, setExamTitle] = useState("Exam Results");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        const [examRes, subsRes, overviewRes] = await Promise.all([
          api.getExam(examId),
          api.getExamSubmissions(examId, page, ITEMS_PER_PAGE),
          api.getExamOverview(examId),
        ]);

        if (!mounted) return;

        setExamTitle(examRes?.title || "Exam Results");
        const data = unwrapPaginatedData(subsRes);
        setSubmissions(data);
        setTotalPages(subsRes?.totalPages ?? 1);
        setOverview(overviewRes || null);
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

  const handleExport = async (format = "csv") => {
    if (!examId) return;
    try {
      // Use fetch directly to receive CSV with correct headers
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE || "http://localhost:3001/api"}/submissions/exam/${examId}/export`,
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

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* <BackToDashboardButton to="/lecturer" className="-ml-2" /> */}

        <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              Student Exam Results List - {examTitle}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              {isRefreshing
                ? "Updating live data..."
                : `Last update: ${overview?.updatedAt ? new Date(overview.updatedAt).toLocaleTimeString() : "N/A"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by Name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white"
            />
            <Button onClick={() => handleExport("csv")}>Export to CSV</Button>
            <Button variant="outline" onClick={() => handleExport("pdf")}>
              Export to CSV/PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Score Distribution (Live)</h2>
                <div className="text-xs text-muted-foreground">
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="key" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--chart-1))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-semibold">
                    {overview?.summary?.completed ?? 0}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">In Progress</p>
                  <p className="font-semibold">
                    {overview?.summary?.inProgress ?? 0}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">
                    {overview?.summary?.totalSubmissions ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold">Suspicious Activities</h2>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {(overview?.anomalies?.length || 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suspicious actions detected yet.
                  </p>
                ) : (
                  overview?.anomalies?.map((item) => (
                    <div key={item.id} className="rounded-md border p-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {item.student?.fullName || "Unknown student"}
                        </p>
                        <Badge
                          variant={
                            item.severity === "high"
                              ? "destructive"
                              : item.severity === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.eventType}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.details || "-"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Score (Points)</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No submissions found for this exam yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <a
                            className="text-blue-600 hover:underline"
                            onClick={() => navigate(`${basePath}/exam/${examId}/monitor`)}
                          >
                            {s.student?.fullName || "—"}
                          </a>
                        </TableCell>
                        <TableCell>
                          {s.student?.studentId || s.student?.id}
                        </TableCell>
                        <TableCell>
                          {s.score != null
                            ? `${s.score}/${overview?.exam?.totalPoints ?? "-"}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {formatTimeSpent(s.startedAt, s.submittedAt)}
                        </TableCell>
                        <TableCell>{getStatusBadgeLabel(s.status)}</TableCell>
                      </TableRow>
                    ))
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
