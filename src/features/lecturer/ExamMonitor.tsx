"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { SortButton, type SortOrder } from "@/components/common/list/SortButton";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import { sortItems } from "@/components/common/list/sort-utils";
import {
  FilterDefinition,
  FilterValues,
} from "@/components/common/list/filter-types";
import {
  getActiveFilterCount,
  getFilterChips,
} from "@/components/common/list/filter-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Users,
  Clock,
  AlertTriangle,
  Shield,
  Eye,
  Globe,
  RefreshCw,
  QrCode,
  Monitor,
  Flag,
  BarChart3,
  CheckCircle2,
  XCircle,
  Activity,
  MousePointerClick,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import api, { API_BASE_URL, unwrapPaginatedData } from "@/lib/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface StudentSession {
  id: string; // submission id when available, otherwise enrollment id
  submissionId: string | null;
  userId: string;
  name: string;
  studentId: string;
  ip: string;
  status:
    | "in_progress"
    | "submitted"
    | "not_joined"
    | "flagged"
    | "disconnected";
  progress: number;
  score: number | null;
  tabSwitches: number;
  mouseAnomalies: number;
  integrityEvents: number;
  startedAt: string | null;
  submittedAt: string | null;
  flagReason: string | null;
}

interface IntegrityAlert {
  id: string;
  submissionId: string | null;
  studentName: string;
  type:
    | "tab_switch"
    | "similarity"
    | "timing"
    | "ip_anomaly"
    | "mouse_pattern"
    | "fullscreen_exit";
  message: string;
  severity: "low" | "warning" | "critical";
  time: string;
}

type ExamOverview = {
  exam?: { totalPoints?: number };
  anomalies?: Array<{
    id: string;
    eventType: string;
    details?: string;
    timestamp: string;
    severity: "low" | "medium" | "high";
    student?: { fullName?: string } | null;
    submissionId?: string | null;
  }>;
};

const mapSubmissionStatus = (status?: string): StudentSession["status"] => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "IN_PROGRESS") return "in_progress";
  if (normalized === "SUBMITTED" || normalized === "GRADED") return "submitted";
  if (normalized === "FLAGGED") return "flagged";
  return "not_joined";
};

const mapEventTypeToAlertType = (
  eventType?: string,
): IntegrityAlert["type"] => {
  const event = String(eventType || "").toLowerCase();
  if (event.includes("fullscreen")) return "fullscreen_exit";
  if (event.includes("tab")) return "tab_switch";
  if (event.includes("mouse")) return "mouse_pattern";
  if (event.includes("ip")) return "ip_anomaly";
  if (event.includes("timing")) return "timing";
  return "similarity";
};

const EMPTY_STUDENT_FILTERS: FilterValues = {
  status: "all",
  riskLevel: "all",
};

const getRiskLevel = (session: StudentSession): "clean" | "watch" | "high" => {
  if (session.status === "flagged" || session.integrityEvents >= 5) {
    return "high";
  }
  if (session.integrityEvents >= 2) {
    return "watch";
  }
  return "clean";
};

const STUDENTS_PER_PAGE = 10;

export default function ExamMonitor() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug : [];
  const id = slug[1];
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [examTitle, setExamTitle] = useState("Live Exam Monitor");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedAlertIds, setResolvedAlertIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(
    EMPTY_STUDENT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(
    EMPTY_STUDENT_FILTERS,
  );
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(
    new Date().toLocaleTimeString(),
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadMonitorData = async (silent = false) => {
    if (!id) return;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const [examRes, submissionsRes, overviewRes] = await Promise.all([
        api.getExam(id),
        api.getExamSubmissions(id, 1, 200),
        api.getExamOverview(id),
      ]);

      setExamTitle(examRes?.title || "Live Exam Monitor");

      const overview = (overviewRes || {}) as ExamOverview;
      const submissions = unwrapPaginatedData<any>(submissionsRes);

      const courseId = examRes?.courseId;
      let enrollments: any[] = [];
      if (courseId) {
        enrollments = await api.getCourseEnrollments(courseId);
      }

      const submissionByStudentId = new Map<string, any>();
      for (const submission of submissions) {
        if (submission?.student?.id) {
          submissionByStudentId.set(submission.student.id, submission);
        }
      }

      const anomalyBySubmissionId = new Map<
        string,
        { tab: number; mouse: number }
      >();
      for (const anomaly of overview.anomalies || []) {
        if (!anomaly?.submissionId) continue;
        const current = anomalyBySubmissionId.get(anomaly.submissionId) || {
          tab: 0,
          mouse: 0,
        };
        const event = String(anomaly.eventType || "").toLowerCase();
        if (event.includes("tab")) current.tab += 1;
        if (event.includes("mouse")) current.mouse += 1;
        anomalyBySubmissionId.set(anomaly.submissionId, current);
      }

      const joinedRows: StudentSession[] = enrollments.map((enrollment) => {
        const student = enrollment.student;
        const submission = student?.id
          ? submissionByStudentId.get(student.id)
          : null;
        const anomalyCount = submission?.id
          ? anomalyBySubmissionId.get(submission.id)
          : undefined;
        const status = submission
          ? mapSubmissionStatus(submission.status)
          : "not_joined";

        return {
          id: submission?.id || enrollment.id,
          submissionId: submission?.id || null,
          userId: student?.id || "",
          name: student?.fullName || "Unknown student",
          studentId: student?.studentId || "-",
          ip: "-",
          status,
          progress:
            status === "submitted" ? 100 : status === "in_progress" ? 50 : 0,
          score: submission?.score ?? null,
          tabSwitches: anomalyCount?.tab || 0,
          mouseAnomalies: anomalyCount?.mouse || 0,
          integrityEvents: (anomalyCount?.tab || 0) + (anomalyCount?.mouse || 0),
          startedAt: submission?.startedAt
            ? new Date(submission.startedAt).toLocaleTimeString()
            : null,
          submittedAt: submission?.submittedAt
            ? new Date(submission.submittedAt).toLocaleTimeString()
            : null,
          flagReason: status === "flagged" ? "Submission flagged" : null,
        };
      });

      setStudents(joinedRows);

      const mappedAlerts: IntegrityAlert[] = (overview.anomalies || []).map(
        (anomaly) => ({
          id: anomaly.id,
          submissionId: anomaly.submissionId || null,
          studentName: anomaly.student?.fullName || "Unknown student",
          type: mapEventTypeToAlertType(anomaly.eventType),
          message:
            anomaly.details ||
            anomaly.eventType ||
            "Suspicious activity detected",
          severity:
            anomaly.severity === "high"
              ? "critical"
              : anomaly.severity === "low"
                ? "low"
                : "warning",
          time: new Date(anomaly.timestamp).toLocaleTimeString(),
        }),
      );
      setAlerts(mappedAlerts);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || "Failed to load monitor data");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMonitorData(false);
  }, [id]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMonitorData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, id]);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const streamUrl = `${API_BASE_URL}/submissions/exam/${encodeURIComponent(id)}/events?token=${encodeURIComponent(token)}`;
    const source = new EventSource(streamUrl);
    eventSourceRef.current = source;

    const onIntegrity = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data || "{}");
        const eventType = String(data?.eventType || "unknown");
        const alertType = mapEventTypeToAlertType(eventType);
        const mapped: IntegrityAlert = {
          id: String(data?.id || `${Date.now()}-${Math.random()}`),
          submissionId: data?.submissionId || null,
          studentName: data?.student?.fullName || "Unknown student",
          type: alertType,
          message: data?.details || eventType,
          severity:
            data?.severity === "high"
              ? "critical"
              : data?.severity === "low"
                ? "low"
                : "warning",
          time: data?.timestamp
            ? new Date(data.timestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString(),
        };

        setAlerts((prev) => [mapped, ...prev].slice(0, 100));

        if (mapped.submissionId) {
          setStudents((prev) =>
            prev.map((s) => {
              if (s.submissionId !== mapped.submissionId) return s;
              const next = { ...s };
              if (alertType === "tab_switch") {
                next.tabSwitches += 1;
                next.integrityEvents += 1;
              }
              if (alertType === "mouse_pattern") {
                next.mouseAnomalies += 1;
                next.integrityEvents += 1;
              }
              return next;
            }),
          );
        }
      } catch (e) {
        console.error("Failed to parse realtime integrity event", e);
      }
    };

    source.addEventListener("integrity", onIntegrity as EventListener);
    source.onerror = () => {
      // keep existing polling as fallback; EventSource auto-reconnects
      console.warn(
        "Realtime stream disconnected, fallback polling is still active.",
      );
    };

    return () => {
      source.removeEventListener("integrity", onIntegrity as EventListener);
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [id]);

  const studentFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        allLabel: "All status",
        options: [
          { label: "In Progress", value: "in_progress" },
          { label: "Submitted", value: "submitted" },
          { label: "Flagged", value: "flagged" },
          { label: "Not Joined", value: "not_joined" },
          { label: "Disconnected", value: "disconnected" },
        ],
      },
      {
        key: "riskLevel",
        label: "Integrity risk",
        type: "select",
        allLabel: "All risk levels",
        options: [
          { label: "Clean", value: "clean" },
          { label: "Watch", value: "watch" },
          { label: "High", value: "high" },
        ],
      },
    ],
    [],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const sortedStudents = useMemo(() => {
    const statusValue = appliedFilters.status as string | undefined;
    const riskValue = appliedFilters.riskLevel as string | undefined;

    const filtered = students.filter((student) => {
      const matchSearch = !normalizedSearch
        ? true
        : [student.name, student.studentId]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      const matchStatus =
        !statusValue || statusValue === "all" || student.status === statusValue;
      const matchRisk =
        !riskValue || riskValue === "all"
          ? true
          : getRiskLevel(student) === riskValue;

      return matchSearch && matchStatus && matchRisk;
    });

    return sortItems(filtered, sortField, sortOrder);
  }, [appliedFilters, normalizedSearch, sortField, sortOrder, students]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE),
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * STUDENTS_PER_PAGE;
    return sortedStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [page, sortedStudents]);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_STUDENT_FILTERS);
    setAppliedFilters(EMPTY_STUDENT_FILTERS);
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  const removeFilter = (key: string) => {
    const nextFilters = { ...appliedFilters, [key]: EMPTY_STUDENT_FILTERS[key] };
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
    setPage(1);
  };

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    studentFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(
    appliedFilters,
    studentFilterDefinitions,
  );

  const studentSortOptions = [
    { field: "name", label: "Name" },
    { field: "studentId", label: "Student ID" },
    { field: "status", label: "Status" },
    { field: "progress", label: "Progress" },
    { field: "tabSwitches", label: "Tab Switches" },
    { field: "mouseAnomalies", label: "Mouse Anomalies" },
    { field: "integrityEvents", label: "Integrity Events" },
  ];

  const stats = {
    total: students.length,
    inProgress: students.filter((s) => s.status === "in_progress").length,
    submitted: students.filter((s) => s.status === "submitted").length,
    flagged: students.filter((s) => s.status === "flagged").length,
    notJoined: students.filter((s) => s.status === "not_joined").length,
    disconnected: students.filter((s) => s.status === "disconnected").length,
  };

  const unresolvedAlerts = useMemo(
    () => alerts.filter((a) => !resolvedAlertIds.has(a.id)),
    [alerts, resolvedAlertIds],
  );

  const resolveAlert = (alertId: string) => {
    setResolvedAlertIds((prev) => new Set(prev).add(alertId));
  };

  const flagStudent = async (submissionId: string, reason: string) => {
    if (!submissionId) return;
    try {
      await api.updateSubmissionStatus(submissionId, "FLAGGED");
      await loadMonitorData(true);
      setStudents((prev) =>
        prev.map((s) =>
          s.submissionId === submissionId
            ? { ...s, status: "flagged", flagReason: reason }
            : s,
        ),
      );
    } catch (err) {
      console.error("Failed to flag submission", err);
    }
  };

  // Score distribution chart
  const submittedScores = students
    .filter((s) => s.score !== null)
    .map((s) => s.score!);
  const chartData = {
    labels: ["0-50", "51-60", "61-70", "71-80", "81-90", "91-100"],
    datasets: [
      {
        label: "Students",
        data: [
          submittedScores.filter((s) => s <= 50).length,
          submittedScores.filter((s) => s > 50 && s <= 60).length,
          submittedScores.filter((s) => s > 60 && s <= 70).length,
          submittedScores.filter((s) => s > 70 && s <= 80).length,
          submittedScores.filter((s) => s > 80 && s <= 90).length,
          submittedScores.filter((s) => s > 90).length,
        ],
        backgroundColor: "rgba(37, 99, 235, 0.7)",
        borderRadius: 4,
      },
    ],
  };

  const statusIcon = (status: StudentSession["status"]) => {
    switch (status) {
      case "in_progress":
        return <Activity className="h-4 w-4 text-blue-600" />;
      case "submitted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "not_joined":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "flagged":
        return <Flag className="h-4 w-4 text-red-600" />;
      case "disconnected":
        return <XCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <BackToDashboardButton to={basePath} className="mb-4 -ml-2" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {examTitle}
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                (Exam #{id})
              </span>
            </h1>
            <p className="text-muted-foreground">
              Real-time monitoring of student sessions, integrity alerts, and
              score distribution
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div
              className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-muted"}`}
            />
            <span>Last refresh: {lastRefresh}</span>
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-1"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadMonitorData(true)}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/exam/${id}/qr`} className="gap-1">
                <QrCode className="h-3.5 w-3.5" /> Show QR
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScoreDialog(true)}
              className="gap-1"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Score Distribution
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-red-200">
            <CardContent className="pt-4 text-sm text-red-600">
              {error}
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mb-4">
            <CardContent className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading monitor
              data...
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-semibold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Activity className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-semibold text-blue-600">
                {stats.inProgress}
              </p>
              <p className="text-[10px] text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-semibold text-green-600">
                {stats.submitted}
              </p>
              <p className="text-[10px] text-muted-foreground">Submitted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Flag className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <p className="text-xl font-semibold text-red-600">
                {stats.flagged}
              </p>
              <p className="text-[10px] text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-semibold">{stats.notJoined}</p>
              <p className="text-[10px] text-muted-foreground">Not Joined</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <XCircle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-xl font-semibold text-yellow-600">
                {stats.disconnected}
              </p>
              <p className="text-[10px] text-muted-foreground">Disconnected</p>
            </CardContent>
          </Card>
        </div>

        {/* Integrity Alerts */}
        {unresolvedAlerts.length > 0 && (
          <Card className="mb-6 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Integrity Alerts ({unresolvedAlerts.length} unresolved)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unresolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.severity === "critical"
                      ? "border-red-300 bg-red-50"
                      : alert.severity === "warning"
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-blue-300 bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {alert.type === "tab_switch" && <Eye className="h-4 w-4" />}
                    {alert.type === "similarity" && (
                      <Shield className="h-4 w-4" />
                    )}
                    {alert.type === "timing" && <Clock className="h-4 w-4" />}
                    {alert.type === "ip_anomaly" && (
                      <Globe className="h-4 w-4" />
                    )}
                    {alert.type === "mouse_pattern" && (
                      <MousePointerClick className="h-4 w-4" />
                    )}
                    {alert.type === "fullscreen_exit" && (
                      <Monitor className="h-4 w-4" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{alert.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {alert.time}
                    </span>
                    <StatusBadge
                      status={alert.severity}
                      domain="severity"
                    >
                      {alert.severity}
                    </StatusBadge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Student Sessions</CardTitle>
                </div>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <SearchBar
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={runSearch}
                    placeholder="Search student name or student ID"
                    className="flex-1"
                  />
                  <SortButton
                    options={studentSortOptions}
                    value={sortField}
                    order={sortOrder}
                    onSortChange={(field, order) => {
                      setSortField(field);
                      setSortOrder(order);
                      setPage(1);
                    }}
                  />
                  <FilterPanel
                    title="Student filters"
                    description="Filter sessions by status and integrity risk level."
                    filters={studentFilterDefinitions}
                    value={draftFilters}
                    onValueChange={(key, nextValue) =>
                      setDraftFilters((prev) => ({ ...prev, [key]: nextValue }))
                    }
                    onApply={applyFilters}
                    onClear={clearFilters}
                    activeCount={activeFilterCount}
                  />
                </div>
                <ActiveFilterChips
                  chips={activeFilterChips}
                  onRemove={removeFilter}
                  onClearAll={clearFilters}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Student</TableHead>
                    <TableHead className="w-[18%]">IP Address</TableHead>
                    <TableHead className="w-[20%]">Progress</TableHead>
                    <TableHead className="w-[12%] text-center">Tab Sw.</TableHead>
                    <TableHead className="w-[14%]">Status</TableHead>
                    <TableHead className="w-[8%] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No student sessions match your current search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((s) => (
                      <TableRow
                        key={s.id}
                        className={s.status === "flagged" ? "bg-red-50/50" : ""}
                      >
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.studentId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-xs">{s.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-28">
                            <div className="mb-0.5 flex justify-between text-xs">
                              <span>{s.progress}%</span>
                              {s.score !== null && (
                                <span className="font-medium">{s.score}pts</span>
                              )}
                            </div>
                            <Progress value={s.progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-sm font-medium ${s.tabSwitches > 2 ? "text-red-600" : "text-muted-foreground"}`}
                          >
                            {s.tabSwitches}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {statusIcon(s.status)}
                            <StatusBadge status={s.status} domain="session">
                              {s.status.replace("_", " ")}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.status === "in_progress" && s.submissionId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 text-xs"
                              onClick={() =>
                                flagStudent(
                                  s.submissionId,
                                  "Manually flagged by instructor",
                                )
                              }
                            >
                              <Flag className="mr-1 h-3.5 w-3.5" /> Flag
                            </Button>
                          )}
                          {s.status === "flagged" && (
                            <Button variant="ghost" size="sm" className="text-xs">
                              <Eye className="mr-1 h-3.5 w-3.5" /> Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={sortedStudents.length}
              onPageChange={setPage}
              itemLabel="students"
            />
          </Card>
        </div>

        <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Score Distribution
              </DialogTitle>
              <DialogDescription>
                Distribution for submitted students in exam {id}. Submitted count: {stats.submitted}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="h-[360px] w-full">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 },
                          title: { display: true, text: "Students" },
                        },
                        x: {
                          title: { display: true, text: "Score Range" },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {stats.submitted > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Average
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {Math.round(
                        submittedScores.reduce((a, b) => a + b, 0) /
                          submittedScores.length,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Highest
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-green-600">
                      {Math.max(...submittedScores)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Lowest
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-red-600">
                      {Math.min(...submittedScores)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Score distribution will appear once students submit their exams.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


