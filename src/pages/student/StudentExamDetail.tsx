import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlarmClock,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";
import api from "@/lib/api";

type ExamDetail = {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
  status?: string;
  passingScore?: number;
  totalPoints?: number;
  maxAttempts?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  settings?: {
    maxAttempts?: number | null;
    allowedIpCidrs?: string[];
  };
  course?: {
    id?: string;
    code?: string;
    name?: string;
  };
  _count?: {
    submissions?: number;
  };
};

type MySubmission = {
  id?: string;
  status?: string;
  attemptNo?: number | null;
  score?: number | null;
  submittedAt?: string | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return format(date, "MMM d, yyyy HH:mm");
};

export default function StudentExamDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [mySubmission, setMySubmission] = useState<MySubmission | null>(null);
  const [completedSubmission, setCompletedSubmission] = useState<MySubmission | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!id) {
        setError("Missing exam id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [examRes, mySubmissionsRes] = await Promise.all([
          api.getExam(id),
          api.getMySubmissions().catch(() => []),
        ]);

        if (!mounted) return;
        setExam(examRes || null);
        const submissionList = Array.isArray(mySubmissionsRes) ? mySubmissionsRes : [];
        const examSubmissions = submissionList.filter((item: any) => String(item?.examId ?? item?.exam?.id ?? "") === id);
        const byLatest = [...examSubmissions].sort((a: any, b: any) => {
          const aTime = new Date(a?.submittedAt || a?.startedAt || a?.createdAt || 0).getTime();
          const bTime = new Date(b?.submittedAt || b?.startedAt || b?.createdAt || 0).getTime();
          return bTime - aTime;
        });
        const latestAny = byLatest[0] || null;
        const latestCompleted = byLatest.find((item: any) =>
          ["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(String(item?.status || "").toUpperCase()),
        ) || null;
        setMySubmission(latestAny || null);
        setCompletedSubmission(latestCompleted || null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Unable to load exam detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [id]);

  const accessState = useMemo(() => {
    if (!exam) return "unknown";
    const now = Date.now();
    const startTs = exam.startTime ? new Date(exam.startTime).getTime() : NaN;
    const endTs = exam.endTime ? new Date(exam.endTime).getTime() : NaN;

    if (!Number.isNaN(endTs) && now > endTs) return "ended";
    if (!Number.isNaN(startTs) && now < startTs) return "upcoming";
    return "open";
  }, [exam]);

  const submissionStatus = String(mySubmission?.status || "").toUpperCase();
  const configuredMaxAttempts =
    typeof exam?.maxAttempts === "number"
      ? exam.maxAttempts
      : typeof exam?.settings?.maxAttempts === "number"
        ? exam.settings.maxAttempts
      : null;
  const latestAttemptNo = Number(mySubmission?.attemptNo ?? 0);
  const attemptLimitReached =
    configuredMaxAttempts !== null &&
    Number.isFinite(configuredMaxAttempts) &&
    latestAttemptNo >= configuredMaxAttempts;
  const canStartNewAttempt =
    !attemptLimitReached || submissionStatus === "IN_PROGRESS";
  const hasCompletedSubmission = Boolean(completedSubmission?.id);
  const shouldViewResult = hasCompletedSubmission;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <BackToDashboardButton to="/student/exams" label="Back to My Exams" className="-ml-2" />

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium text-foreground">Could not load exam detail.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{exam?.title || "Exam Detail"}</CardTitle>
                  <Badge variant="outline">
                    {getStatusBadgeLabel(String(exam?.status || "PUBLISHED"))}
                  </Badge>
                  {exam?.course?.code ? (
                    <Badge variant="secondary">{exam.course.code}</Badge>
                  ) : null}
                </div>
                <CardDescription>
                  {exam?.course?.name || "Course unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {exam?.description || "No additional description available for this exam."}
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Start Time</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <CalendarClock className="h-4 w-4" />
                      {formatDateTime(exam?.startTime)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">End Time</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <AlarmClock className="h-4 w-4" />
                      {formatDateTime(exam?.endTime)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <Clock3 className="h-4 w-4" />
                      {exam?.duration ?? "N/A"} min
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Passing Score</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {exam?.passingScore ?? "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      {exam?.course?.code || "-"} - {exam?.course?.name || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Total Points</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      {exam?.totalPoints ?? "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Max Attempts</p>
                    <p className="mt-1 text-sm font-medium">
                      {configuredMaxAttempts === null ? "Unlimited" : configuredMaxAttempts}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Access And Attempt</CardTitle>
                <CardDescription>
                  Check whether this exam is upcoming, open, or ended and what you can do next.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Window: {accessState}</Badge>
                  <Badge variant="outline">
                    Attempt: {mySubmission ? getStatusBadgeLabel(submissionStatus || "IN_PROGRESS") : "Not started"}
                  </Badge>
                  {mySubmission?.attemptNo ? (
                    <Badge variant="secondary">
                      Attempt {mySubmission.attemptNo}
                    </Badge>
                  ) : null}
                  {typeof mySubmission?.score === "number" ? (
                    <Badge variant="secondary">Score: {mySubmission.score}</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {shouldViewResult ? (
                    <Button asChild>
                      <Link to={`/student/grading?examId=${exam?.id}${completedSubmission?.id ? `&submissionId=${completedSubmission.id}` : ""}`}>View Result Detail</Link>
                    </Button>
                  ) : accessState === "open" && canStartNewAttempt ? (
                    <Button asChild>
                      <Link to={`/student/exam-ready?examId=${exam?.id}`}>Start Exam</Link>
                    </Button>
                  ) : accessState === "open" ? (
                    <Button asChild>
                      <Link to={`/student/exam-ready?examId=${exam?.id}`}>Start Exam</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      {accessState === "upcoming" ? "Exam Not Open Yet" : "Exam Closed"}
                    </Button>
                  )}

                  {exam?.course?.id ? (
                    <Button asChild variant="outline">
                      <Link to={`/student/courses/${exam.course.id}`}>Go To Course</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
