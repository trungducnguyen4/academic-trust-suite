import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Shield,
  Timer,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";
import api from "@/lib/api";

type ExamSubmissionDetail = {
  id: string;
  status?: string;
  score?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  exam?: {
    id: string;
    title?: string;
    totalPoints?: number;
    course?: {
      id?: string;
      code?: string;
      name?: string;
    };
  };
  answers?: Array<{
    id: string;
    answer?: unknown;
    pointsAwarded?: number | null;
    question?: {
      id?: string;
      type?: string;
      content?: string;
      points?: number;
      explanation?: string | null;
    };
  }>;
  proctoring?: {
    tabSwitchCount?: number;
    mouseAnomalies?: number;
    logsCount?: number;
  };
};

const safeDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return format(date, "MMM d, yyyy HH:mm");
};

const toDisplayAnswer = (value: unknown): string => {
  if (value == null) return "No answer";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayAnswer(item)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

export default function StudentResultDetail() {
  const { examId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExamSubmissionDetail | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!examId) {
        setError("Missing exam id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const submission = await api.getMyExamSubmission(examId);
        if (!mounted) return;
        setDetail(submission || null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Unable to load result detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [examId]);

  const totalPoints = detail?.exam?.totalPoints ?? 0;
  const scoreValue = typeof detail?.score === "number" ? detail.score : 0;
  const scorePercent = useMemo(() => {
    if (!totalPoints || totalPoints <= 0) return 0;
    return Math.round((scoreValue / totalPoints) * 100);
  }, [scoreValue, totalPoints]);

  const timeSpentText = useMemo(() => {
    if (!detail?.startedAt || !detail?.submittedAt) return "N/A";
    const start = new Date(detail.startedAt).getTime();
    const end = new Date(detail.submittedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "N/A";

    const totalMinutes = Math.round((end - start) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [detail?.startedAt, detail?.submittedAt]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <BackToDashboardButton to="/student/results" label="Back to Results" className="-ml-2" />

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium text-foreground">Could not load result detail.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : !detail ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No submission data found for this exam.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{detail.exam?.title || "Exam Result"}</CardTitle>
                  <Badge variant="outline">{getStatusBadgeLabel(String(detail.status || "SUBMITTED"))}</Badge>
                  {detail.exam?.course?.code ? (
                    <Badge variant="secondary">{detail.exam.course.code}</Badge>
                  ) : null}
                </div>
                <CardDescription>
                  {detail.exam?.course?.name || "Course unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {detail.score ?? "N/A"} / {detail.exam?.totalPoints ?? "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Submitted At</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                      <CalendarClock className="h-4 w-4" />
                      {safeDate(detail.submittedAt)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Time Spent</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                      <Timer className="h-4 w-4" />
                      {timeSpentText}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      {detail.exam?.course?.code || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Score Ratio</span>
                    <span>{scorePercent}%</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, scorePercent))} className="h-2" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.exam?.id ? (
                    <Button asChild variant="outline">
                      <Link to={`/student/exams/${detail.exam.id}`}>View Exam Detail</Link>
                    </Button>
                  ) : null}
                  {detail.exam?.course?.id ? (
                    <Button asChild variant="outline">
                      <Link to={`/student/courses/${detail.exam.course.id}`}>Go To Course</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integrity Summary</CardTitle>
                <CardDescription>
                  Sanitized proctoring indicators from your exam session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Tab Switches</p>
                    <p className="mt-1 text-sm font-medium">{detail.proctoring?.tabSwitchCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Mouse Anomalies</p>
                    <p className="mt-1 text-sm font-medium">{detail.proctoring?.mouseAnomalies ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">Logged Events</p>
                    <p className="mt-1 text-sm font-medium">{detail.proctoring?.logsCount ?? 0}</p>
                  </div>
                </div>

                {(detail.proctoring?.tabSwitchCount || 0) >= 5 ||
                (detail.proctoring?.mouseAnomalies || 0) >= 8 ? (
                  <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-medium text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      Session contains high-risk behavior indicators.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      This does not automatically mean misconduct. Final review is handled by instructors.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      No major integrity anomalies detected from summary metrics.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Answer Overview</CardTitle>
                <CardDescription>
                  Per-question answer snapshot with awarded points when available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!detail.answers || detail.answers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No answer details available.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.answers.map((answer, index) => (
                      <div key={answer.id} className="rounded-lg border border-border/60 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            Q{index + 1} - {answer.question?.type || "Question"}
                          </p>
                          <Badge variant="outline">
                            {answer.pointsAwarded ?? 0} / {answer.question?.points ?? "?"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {answer.question?.content || "Question content unavailable."}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Your answer:</span> {toDisplayAnswer(answer.answer)}
                        </p>
                        {answer.question?.explanation ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3.5 w-3.5" />
                              Explanation:
                            </span>{" "}
                            {answer.question.explanation}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
