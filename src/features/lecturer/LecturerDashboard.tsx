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
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Plus,
  FileText,
  Clock,
  ArrowRight,
  BookOpen,
  Loader2,
  Sparkles,
  Zap,
  Database,
  Layers3,
  BarChart3,
} from "lucide-react";
import { format, addHours } from "date-fns";
import Link from "next/link";
import api, { unwrapPaginatedData } from "@/lib/api";
import { AttentionSection } from "./attention/AttentionSection";

export interface Exam {
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

interface QuestionItem {
  id: string;
  type?: string | null;
  difficulty?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  courseId?: string | null;
  course?: {
    id?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
}

interface QuestionBankSummary {
  courseId: string;
  courseCode: string;
  courseName: string;
  questionCount: number;
  avgDifficulty: number;
  questionTypes: string[];
  lastUpdatedAt: string | null;
}

const questionTypeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  TRUE_FALSE: "Đúng/sai",
  SHORT_ANSWER: "Tự luận ngắn",
  ESSAY: "Tự luận",
  FILL_BLANK: "Điền khuyết",
  MATCHING: "Ghép đôi",
};

const formatDifficulty = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "Chưa có";
  if (value < 1.8) return "Dễ";
  if (value < 2.6) return "Trung bình";
  return "Khó";
};

const formatRecentDate = (value: string | null) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const buildQuestionBankSummaries = (
  questions: QuestionItem[],
  courses: CourseSummary[],
): QuestionBankSummary[] => {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const courseByCode = new Map(courses.map((course) => [course.code, course]));
  const grouped = new Map<
    string,
    {
      courseId: string;
      courseCode: string;
      courseName: string;
      difficulties: number[];
      questionTypes: Set<string>;
      questionCount: number;
      lastUpdatedAt: string | null;
    }
  >();

  questions.forEach((question) => {
    const course =
      (question.courseId && courseById.get(question.courseId)) ||
      (question.course?.id && courseById.get(question.course.id)) ||
      (question.course?.code && courseByCode.get(question.course.code)) ||
      null;
    const courseId = course?.id || question.courseId || question.course?.id || "";
    const courseCode = course?.code || question.course?.code || "Chung";
    const courseName = course?.name || question.course?.name || "Chưa gán khóa học";
    const key = courseId || courseCode;
    const current =
      grouped.get(key) ||
      {
        courseId,
        courseCode,
        courseName,
        difficulties: [],
        questionTypes: new Set<string>(),
        questionCount: 0,
        lastUpdatedAt: null,
      };

    current.questionCount += 1;
    if (typeof question.difficulty === "number") {
      current.difficulties.push(question.difficulty);
    }
    if (question.type) {
      current.questionTypes.add(question.type);
    }

    const updatedAt = question.updatedAt || question.createdAt || null;
    if (
      updatedAt &&
      (!current.lastUpdatedAt ||
        new Date(updatedAt).getTime() > new Date(current.lastUpdatedAt).getTime())
    ) {
      current.lastUpdatedAt = updatedAt;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((item) => ({
      courseId: item.courseId,
      courseCode: item.courseCode,
      courseName: item.courseName,
      questionCount: item.questionCount,
      avgDifficulty:
        item.difficulties.length > 0
          ? item.difficulties.reduce((sum, value) => sum + value, 0) /
            item.difficulties.length
          : 0,
      questionTypes: Array.from(item.questionTypes),
      lastUpdatedAt: item.lastUpdatedAt,
    }))
    .sort((a, b) => {
      const aTime = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
      const bTime = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
      return bTime - aTime;
    });
};

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBankSummary[]>([]);
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
        const questions = unwrapPaginatedData<QuestionItem>(questionsData);
        const normalizedCourses = Array.isArray(coursesData)
          ? coursesData
          : unwrapPaginatedData<CourseSummary>(coursesData);

        setExams(unwrapPaginatedData(examsData));
        setQuestionCount(questions.length);
        setCourses(normalizedCourses);
        setQuestionBanks(buildQuestionBankSummaries(questions, normalizedCourses));
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
      title: "Trang tổng quan đã sẵn sàng",
      message: `Bạn có ${courses.length} khóa học, ${exams.length} bài thi và ${questionCount} câu hỏi trong ngân hàng`,
      time: addHours(new Date(), -2),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout notifications={alerts}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Đang tải trang tổng quan...
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
              Chào mừng trở lại, {user?.fullName.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Tổng quan khóa học, bài thi và ngân hàng câu hỏi của bạn.
            </p>
          </div>
          <Button
            asChild
            className="rounded-xl shadow-sm gap-2 shine animate-fade-in opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            <Link href="/lecturer/exams/create">
              <Plus className="h-4 w-4" />
              Tạo bài thi
            </Link>
          </Button>
        </div>

        {/* Needs your attention */}
        <AttentionSection
          exams={exams}
          examsLoading={loading}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          {/* Recent Exams */}
          <div>
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Bài thi gần đây
                  </CardTitle>
                  <CardDescription>Các bài thi được cập nhật gần nhất</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary gap-1 rounded-xl"
                  asChild
                >
                  <Link href="/lecturer/exams">
                    Xem tất cả
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
                        Chưa có bài thi
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tạo bài thi đầu tiên để bắt đầu
                      </p>
                      <Button asChild className="mt-4 rounded-xl" size="sm">
                        <Link href="/lecturer/exams/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Tạo bài thi
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
                          ? "Xem kết quả"
                          : "Xem trước và chỉnh sửa";
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
                                {questionCount} câu hỏi
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exam.duration} phút
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
                              <Link href={actionHref}>{actionLabel}</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel */}
          <div className="space-y-6">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  Ngân hàng câu hỏi gần đây
                </CardTitle>
                <CardDescription>
                  Các khóa học có câu hỏi được cập nhật gần nhất
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {questionBanks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Chưa có câu hỏi trong ngân hàng
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Thêm câu hỏi hoặc dùng AI để chuẩn bị đề cho khóa học.
                    </p>
                    <Button asChild size="sm" className="mt-4 rounded-xl">
                      <Link href="/lecturer/question-editor">
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm câu hỏi
                      </Link>
                    </Button>
                  </div>
                ) : (
                  questionBanks.slice(0, 4).map((bank) => (
                    <div
                      key={bank.courseId || bank.courseCode}
                      className="rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/20 hover:bg-secondary/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {bank.courseCode}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {bank.courseName}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
                          {bank.questionCount}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {formatDifficulty(bank.avgDifficulty)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRecentDate(bank.lastUpdatedAt)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {bank.questionTypes.slice(0, 2).map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                          >
                            <Layers3 className="h-3 w-3" />
                            {questionTypeLabels[type] || type}
                          </span>
                        ))}
                        {bank.questionTypes.length > 2 ? (
                          <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                            +{bank.questionTypes.length - 2} loại
                          </span>
                        ) : null}
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
                  <Link href="/lecturer/question-bank">
                    Quản lý ngân hàng câu hỏi
                  </Link>
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
                      Tạo câu hỏi với AI
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Dùng AI để đề xuất câu hỏi từ tài liệu khóa học, sau đó giảng viên xem xét trước khi sử dụng.
                  content.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  size="sm"
                >
                  <Link href="/lecturer/question-bank">
                    <Zap className="h-4 w-4" />
                    Mở ngân hàng câu hỏi
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



