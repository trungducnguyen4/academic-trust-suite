"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, getStatusBadgeLabel } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Loader2,
  TrendingUp,
  Target,
  Award,
  UserRound,
} from "lucide-react";
import { format, formatDistanceToNow, addHours } from "date-fns";
import Link from "next/link";
import api from "@/lib/api";
import { formatCourseTerm, type CourseTerm } from "@/lib/course-term";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UpcomingExam {
  id: string;
  title: string;
  course: { code: string; name: string };
  duration: number;
  startTime: string;
  endTime: string;
  status: string;
  mySubmissionStatus?: string | null;
  mySubmissionAttemptNo?: number | null;
  maxAttempts?: number | null;
  settings?: {
    maxAttempts?: number | null;
  };
}

interface ExamHistoryItem {
  id: string;
  examId: string;
  exam: {
    title: string;
    course: { code: string };
    totalPoints: number;
    passingScore: number;
  };
  score: number | null;
  status: string;
  submittedAt: string | null;
  attemptNo?: number | null;
}

type StudentCourse = {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  academicYear?: string;
  term?: CourseTerm;
  credits?: number;
  progress?: number;
  lastAccessed?: string;
  lecturer?: {
    id?: string;
    fullName?: string;
    email?: string;
  };
};

const safeLabel = (value?: string | null) => (value ? value : "N/A");

export default function StudentDashboard() {
  const { user } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentCourses, setRecentCourses] = useState<StudentCourse[]>([]);
  const [latestCompletedSubmissionByExamId, setLatestCompletedSubmissionByExamId] =
    useState<Map<string, any>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [exams, submissions, myRecentCourses] = await Promise.all([
          api.getAvailableExams(),
          api.getMySubmissions(),
          api.getMyRecentCourses(),
        ]);

        const recentList = Array.isArray(myRecentCourses)
          ? (myRecentCourses as StudentCourse[])
          : [];

        setRecentCourses(recentList);

        const now = new Date();
        const submissionList = Array.isArray(submissions) ? submissions : [];
        const examList = Array.isArray(exams) ? exams : [];

        const latestSubmissionByExamId = new Map<string, any>();
        const latestCompletedSubmissionByExamId = new Map<string, any>();
        submissionList.forEach((s: any) => {
          const key = s?.examId;
          if (!key) return;

          const prev = latestSubmissionByExamId.get(key);
          const currentTime = new Date(
            s?.submittedAt || s?.startedAt || s?.createdAt || 0,
          ).getTime();
          const prevTime = prev
            ? new Date(
                prev?.submittedAt || prev?.startedAt || prev?.createdAt || 0,
              ).getTime()
            : -1;

          if (!prev || currentTime >= prevTime) {
            latestSubmissionByExamId.set(key, s);
          }

          const status = String(s?.status || "").toUpperCase();
          if (["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(status)) {
            const prevCompleted = latestCompletedSubmissionByExamId.get(key);
            const prevCompletedTime = prevCompleted
              ? new Date(
                  prevCompleted?.submittedAt || prevCompleted?.startedAt || prevCompleted?.createdAt || 0,
                ).getTime()
              : -1;
            if (!prevCompleted || currentTime >= prevCompletedTime) {
              latestCompletedSubmissionByExamId.set(key, s);
            }
          }
        });
        setLatestCompletedSubmissionByExamId(latestCompletedSubmissionByExamId);

        const upcoming = examList
          .filter((exam: any) => {
            const endTime = exam?.endTime ? new Date(exam.endTime) : null;
            return (
              exam?.status === "PUBLISHED" &&
              endTime !== null &&
              !isNaN(endTime.getTime()) &&
              endTime > now
            );
          })
          .map((exam: any) => ({
            ...exam,
            mySubmissionStatus:
              latestSubmissionByExamId.get(exam.id)?.status ?? null,
            mySubmissionAttemptNo:
              latestSubmissionByExamId.get(exam.id)?.attemptNo ?? null,
            maxAttempts:
              typeof exam?.maxAttempts === "number"
                ? exam.maxAttempts
                : typeof exam?.settings?.maxAttempts === "number"
                  ? exam.settings.maxAttempts
                  : null,
          }));

        setUpcomingExams(upcoming);
        setExamHistory(
          submissionList.filter(
            (s: any) => s.status === "GRADED" || s.status === "SUBMITTED",
          ),
        );
      } catch (err) {
        console.error("Error fetching data: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const notifications = [
    {
      id: "1",
      type: "info" as const,
      message:
        examHistory.length > 0
          ? `Results for "${examHistory[0]?.exam?.title}" are available`
          : "No new notifications",
      time: addHours(new Date(), -2),
    },
    {
      id: "2",
      type: "warning" as const,
      message:
        upcomingExams.length > 0
          ? `Reminder: "${upcomingExams[0]?.title}" is coming up`
          : "No upcoming exams",
      time: addHours(new Date(), -5),
    },
  ];

  const avgScore =
    examHistory.length > 0
      ? Math.round(
          examHistory.reduce((acc, e) => acc + (e.score || 0), 0) /
            examHistory.length,
        )
      : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in opacity-0">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {upcomingExams.length > 0
              ? `You have ${upcomingExams.length} upcoming exam${upcomingExams.length > 1 ? "s" : ""}`
              : "You're all caught up. No upcoming exams."}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              label: "Upcoming Exams",
              value: upcomingExams.length,
              icon: FileText,
              color: "text-blue-600",
              bg: "bg-blue-500/10",
              gradient: "card-gradient-blue",
              sub: "Scheduled",
            },
            {
              label: "Average Score",
              value: `${avgScore}%`,
              icon: Target,
              color: "text-violet-600",
              bg: "bg-violet-500/10",
              gradient: "card-gradient-violet",
              sub: "Overall performance",
            },
          ].map((stat, i) => (
            <Card
              key={stat.label}
              className={`card-elevated ${stat.gradient} animate-fade-in-up opacity-0 stagger-${i + 1}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.sub}
                    </p>
                  </div>
                  <div
                    className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Courses */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Recent Courses</CardTitle>
                <CardDescription>
                  Courses you accessed recently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCourses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center">
                      <BookOpen className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">
                        No recent courses yet.
                      </p>
                    </div>
                  ) : (
                    recentCourses.map((course) => {
                      const termText = formatCourseTerm(
                        course.academicYear,
                        course.term,
                      );
                      const progressValue =
                        typeof course.progress === "number"
                          ? Math.max(0, Math.min(100, course.progress))
                          : 0;

                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-border/60 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground">
                                  {safeLabel(course.name)}
                                </h3>
                                <Badge variant="secondary">
                                  {safeLabel(course.code)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {course.description ||
                                  "No description provided for this course."}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {termText}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3.5 w-3.5" />
                                  Lecturer: {safeLabel(course.lecturer?.fullName)}
                                </span>
                                <span>Credits: {course.credits ?? "N/A"}</span>
                              </div>
                            </div>

                            <div className="min-w-[220px] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Progress
                                </span>
                                <span className="font-medium text-foreground">
                                  {progressValue}%
                                </span>
                              </div>
                              <Progress value={progressValue} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                Last activity: {safeLabel(course.lastAccessed)}
                              </p>
                              <Button asChild className="w-full" size="sm">
                                <Link href={`/student/courses/${course.id}`}>
                                  View Course Detail
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Exams */}
          <div className="lg:col-span-3">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Upcoming Exams
                  </CardTitle>
                  <CardDescription>Your scheduled examinations</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary gap-1 rounded-xl"
                  asChild
                >
                  <Link href="/student/exams">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingExams.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        No upcoming exams
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You're all caught up!
                      </p>
                    </div>
                  ) : (
                    upcomingExams.map((exam, i) => {
                      const scheduledAt = new Date(exam.startTime);
                      const isToday =
                        scheduledAt.toDateString() ===
                        new Date().toDateString();
                      const latestAttemptNo = Number(exam.mySubmissionAttemptNo ?? 0);
                      const latestSubmissionId = latestCompletedSubmissionByExamId.get(exam.id)?.id;
                      const configuredMaxAttempts =
                        typeof exam.maxAttempts === "number"
                          ? exam.maxAttempts
                          : typeof exam.settings?.maxAttempts === "number"
                            ? exam.settings.maxAttempts
                            : null;
                      const status = String(
                        exam.mySubmissionStatus || "",
                      ).toUpperCase();
                      const isCompletedAttempt = Boolean(latestSubmissionId);
                      const attemptLimitReached =
                        configuredMaxAttempts !== null &&
                        Number.isFinite(configuredMaxAttempts) &&
                        latestAttemptNo >= configuredMaxAttempts;
                      const canStartNewAttempt =
                        !attemptLimitReached || status === "IN_PROGRESS";
                      const startUrl = `/student/exam-ready?examId=${exam.id}&title=${encodeURIComponent(exam.title)}&course=${encodeURIComponent(exam.course.code)}&duration=${exam.duration}`;

                      const todayCTA = (
                        <div className="flex items-center gap-2">
                          {isCompletedAttempt ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/student/grading?examId=${exam.id}${latestSubmissionId ? `&submissionId=${latestSubmissionId}` : ""}`}>
                                View Result
                              </Link>
                            </Button>
                          ) : null}
                          {canStartNewAttempt ? (
                            <Button
                              size="sm"
                              className="rounded-xl shadow-sm"
                              asChild
                            >
                              <Link href={startUrl}>Start Now</Link>
                            </Button>
                          ) : !isCompletedAttempt ? (
                            <Button size="sm" variant="outline" disabled>
                              Attempt Limit Reached
                            </Button>
                          ) : null}
                        </div>
                      );

                      return (
                        <div
                          key={exam.id}
                          className={`flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-secondary/50 hover:border-primary/10 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <h4 className="font-semibold text-foreground">
                              {exam.title}
                              </h4>
                              {isToday && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-700 rounded-md font-semibold">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium">
                                <BookOpen className="h-3 w-3" />
                                {exam.course.code}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(scheduledAt, "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exam.duration} min
                              </span>
                            </div>
                          </div>
                          {isToday ? (
                            todayCTA
                          ) : (
                            <StatusBadge variant="info">
                              {formatDistanceToNow(scheduledAt, {
                                addSuffix: true,
                              })}
                            </StatusBadge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications moved to header bell dropdown for compact responsive UI */}
        </div>

        {/* Recent Results */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">
                Recent Results
              </CardTitle>
              <CardDescription>Your exam history and scores</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary gap-1 rounded-xl"
              asChild
            >
              <Link href="/student/results">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Award className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No exam results yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete exams to see your results here
                  </p>
                </div>
              ) : (
                examHistory.map((submission, i) => {
                  const score = submission.score || 0;
                  const maxScore = submission.exam?.totalPoints || 100;
                  const passingScore = submission.exam?.passingScore || 50;
                  const passed = score >= passingScore;
                  const completedAt = submission.submittedAt
                    ? new Date(submission.submittedAt)
                    : new Date();
                  const pct = Math.round((score / maxScore) * 100);
                  const submissionAttempt = submission.attemptNo ?? "N/A";

                  return (
                    <Link
                      key={submission.id}
                      href={`/student/grading?examId=${submission.examId}&submissionId=${submission.id}`}
                      className={`flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-secondary/50 hover:border-primary/10 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                            passed ? "bg-emerald-500/10" : "bg-red-500/10"
                          }`}
                        >
                          {passed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {submission.exam?.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {submission.exam?.course?.code} ·{" "}
                            {format(completedAt, "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Attempt {submissionAttempt}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {score}/{maxScore}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pct}%
                          </p>
                        </div>
                        <StatusBadge
                          variant={passed ? "success" : "destructive"}
                        >
                          {passed ? "Passed" : "Failed"}
                        </StatusBadge>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



