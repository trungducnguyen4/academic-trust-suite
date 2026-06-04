import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Plus,
  FileText,
  Users,
  BarChart3,
  Clock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { format, addHours } from "date-fns";
import { Link } from "react-router-dom";
import api, { unwrapPaginatedData } from "@/lib/api";

interface Exam {
  id: string;
  title: string;
  course: { code: string; name: string };
  duration: number;
  totalPoints: number;
  status: string;
  startTime: string | null;
  createdAt: string;
  _count?: { examQuestions: number; submissions: number };
}

interface CourseSummary {
  id: string;
  code: string;
  name: string;
  enrolledStudents?: number;
  _count?: { enrollments?: number; exams?: number };
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [examsData, questionsData, coursesData] = await Promise.all([
          api.getExams(),
          api.listQuestions(),
          api.getMyCourses(),
        ]);
        setExams(unwrapPaginatedData(examsData));
        setQuestionCount(unwrapPaginatedData(questionsData).length);
        setCourses(
          Array.isArray(coursesData)
            ? coursesData
            : unwrapPaginatedData(coursesData),
        );
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const alerts: {
    id: string;
    type: "info" | "warning";
    title: string;
    message: string;
    time: Date;
  }[] = [
    {
      id: "1",
      type: "info",
      title: "Dashboard Ready",
      message: `You have ${courses.length} courses, ${exams.length} exams, and ${questionCount} questions in your bank`,
      time: addHours(new Date(), -2),
    },
  ];

  const totalStudents = courses.reduce(
    (acc, c) => acc + (c.enrolledStudents ?? c._count?.enrollments ?? 0),
    0,
  );

  const stats = {
    totalCourses: courses.length,
    totalStudents,
    activeExams: exams.filter(
      (e) => e.status === "PUBLISHED" || e.status === "ONGOING",
    ).length,
    questionsInBank: questionCount,
  };

  if (loading) {
    return (
      <DashboardLayout notifications={alerts}>
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
    <DashboardLayout notifications={alerts}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="animate-fade-in opacity-0">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.fullName.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your courses, exams, and question bank.
            </p>
          </div>
          <Button
            asChild
            className="rounded-xl shadow-sm gap-2 shine animate-fade-in opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            <Link to="/lecturer/exams/create">
              <Plus className="h-4 w-4" />
              Create Exam
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Courses",
              value: stats.totalCourses,
              icon: GraduationCap,
              color: "text-blue-600",
              bg: "bg-blue-500/10",
            },
            {
              label: "Students",
              value: stats.totalStudents,
              icon: Users,
              color: "text-violet-600",
              bg: "bg-violet-500/10",
            },
            {
              label: "Active Exams",
              value: stats.activeExams,
              icon: Clock,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Questions",
              value: stats.questionsInBank,
              icon: BookOpen,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`animate-fade-in-up opacity-0 stagger-${i + 1}`}
            >
              <AdminStatCard
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                iconWrapClassName={stat.bg}
                iconClassName={stat.color}
                className="card-elevated"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Exams */}
          <div className="lg:col-span-2">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Recent Exams
                  </CardTitle>
                  <CardDescription>Your latest examinations</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary gap-1 rounded-xl"
                  asChild
                >
                  <Link to="/lecturer/exams">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exams.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        No exams created yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first exam to get started
                      </p>
                      <Button asChild className="mt-4 rounded-xl" size="sm">
                        <Link to="/lecturer/exams/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Exam
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    exams.slice(0, 4).map((exam, i) => {
                      const questionCount = exam._count?.examQuestions || 0;
                      const now = Date.now();
                      const start = exam.startTime
                        ? new Date(exam.startTime)
                        : null;
                      const end = start
                        ? new Date(
                            start.getTime() + (exam.duration || 0) * 60000,
                          )
                        : null;
                      const isScheduled = start ? now < start.getTime() : false;
                      const isExpired = end ? end.getTime() < now : false;
                      const isLiveByTime =
                        !!start &&
                        !!end &&
                        now >= start.getTime() &&
                        now <= end.getTime();
                      const shouldMonitor =
                        exam.status === "ONGOING" || isLiveByTime;
                      const shouldShowResults =
                        exam.status === "COMPLETED" || isExpired;
                      const actionLabel = shouldMonitor
                        ? "Monitor"
                        : shouldShowResults
                          ? "View Results"
                          : "Preview & Edit";
                      const actionHref = shouldMonitor
                        ? `/lecturer/exam/${exam.id}/monitor`
                        : shouldShowResults
                          ? `/lecturer/exam/${exam.id}/results`
                          : `/lecturer/exam/${exam.id}/preview`;
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
                              {isExpired ? (
                                <StatusBadge tone="danger">
                                  Expired
                                </StatusBadge>
                              ) : (
                                <StatusBadge status={exam.status} domain="exam" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-medium">
                                {exam.course?.code}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {questionCount} questions
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exam.duration} min
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {exam.status === "COMPLETED" && (
                              <div className="text-right">
                                <p className="text-lg font-bold text-foreground">
                                  {exam._count?.submissions || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Submissions
                                </p>
                              </div>
                            )}
                            {isScheduled &&
                              exam.status === "PUBLISHED" &&
                              exam.startTime && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-foreground">
                                    {format(new Date(exam.startTime), "MMM d")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Scheduled
                                  </p>
                                </div>
                              )}
                            <Button size="sm" className="rounded-xl" asChild>
                              <Link to={actionHref}>{actionLabel}</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    {
                      icon: Plus,
                      label: "Create Exam",
                      href: "/lecturer/exams/create",
                      color: "text-blue-600",
                      bg: "bg-blue-500/10",
                    },
                    {
                      icon: GraduationCap,
                      label: "Manage Courses",
                      href: "/lecturer/courses",
                      color: "text-fuchsia-600",
                      bg: "bg-fuchsia-500/10",
                    },
                    {
                      icon: BookOpen,
                      label: "Question Bank",
                      href: "/lecturer/question-bank",
                      color: "text-violet-600",
                      bg: "bg-violet-500/10",
                    },
                    {
                      icon: FileText,
                      label: "Manage Exams",
                      href: "/lecturer/exams",
                      color: "text-amber-600",
                      bg: "bg-amber-500/10",
                    },
                    {
                      icon: BarChart3,
                      label: "View Analytics",
                      href: "/lecturer/analytics",
                      color: "text-emerald-600",
                      bg: "bg-emerald-500/10",
                    },
                  ].map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="h-auto py-5 flex-col gap-3 rounded-xl border-border/50 hover:border-primary/20 hover:bg-secondary/50 transition-all"
                      asChild
                    >
                      <Link to={action.href}>
                        <div
                          className={`h-10 w-10 rounded-xl ${action.bg} flex items-center justify-center`}
                        >
                          <action.icon className={`h-5 w-5 ${action.color}`} />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel */}
          <div className="space-y-6">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  Course Snapshot
                </CardTitle>
                <CardDescription>Your recently managed courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No courses yet.
                  </div>
                ) : (
                  courses.slice(0, 4).map((course) => (
                    <div
                      key={course.id}
                      className="rounded-lg border border-border/60 p-3"
                    >
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {course.code}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {course.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {course.enrolledStudents ??
                            course._count?.enrollments ??
                            0}{" "}
                          students
                        </span>
                        <span>{course._count?.exams ?? 0} exams</span>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                >
                  <Link to="/lecturer/courses">Manage Courses</Link>
                </Button>
              </CardContent>
            </Card>

            {/* AI Quick Action */}
            <Card className="card-elevated overflow-hidden relative">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">
                      Generate questions with AI
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Use AI to auto-generate exam questions from your course
                  content.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  size="sm"
                >
                  <Link to="/lecturer/question-bank">
                    <Zap className="h-4 w-4" />
                    Open Question Bank
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
