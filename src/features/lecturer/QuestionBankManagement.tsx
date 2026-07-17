"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ListPageHeader } from "@/components/common/list/ListPageHeader";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import {
  FilterDefinition,
  FilterValues,
  TextFilterValue,
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Copy,
  ArrowLeft,
  BarChart3,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ArrowUpDown,
  Database,
  Loader2,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { unwrapPaginatedData } from "@/lib/api";

interface Question {
  id: string;
  content: string;
  type: string;
  course?: { id?: string; code: string; name: string } | null;
  courseId?: string | null;
  difficulty: number;
  points: number;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Utility helpers for preview modal ---

function safeParseJson(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeOptions(
  options: unknown,
): { id: string; text: string }[] {
  const raw = safeParseJson(options);
  if (!raw) return [];

  // Array of strings: ["A", "B", "C"]
  if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) {
    return raw.map((text, i) => ({
      id: String.fromCharCode(65 + i),
      text,
    }));
  }

  // Array of objects: [{ id: "A", text: "..." }]
  if (Array.isArray(raw) && raw.every((v) => typeof v === "object" && v !== null)) {
    return raw.map((item: any, i) => ({
      id: item.id ?? String.fromCharCode(65 + i),
      text: item.text ?? item.label ?? JSON.stringify(item),
    }));
  }

  // Object: { "A": "Option A", "B": "Option B" }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return Object.entries(raw).map(([id, text]) => ({
      id,
      text: String(text ?? ""),
    }));
  }

  // Plain string
  if (typeof raw === "string") {
    return [{ id: "A", text: raw }];
  }

  return [];
}

function normalizeCorrectAnswer(
  correctAnswer: unknown,
): string[] {
  const raw = safeParseJson(correctAnswer);
  if (raw == null) return [];

  // Already an array
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? ""));
  }

  // Object with optionId
    // Object with optionId
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (obj.optionId) return [String(obj.optionId)];
    // Format: { answer: "B" } or { answer: "A,B,C" }
    if ("answer" in obj && obj.answer !== undefined && obj.answer !== null) {
      const ans = String(obj.answer);
      return ans.includes(",") ? ans.split(",").map((s) => s.trim()) : [ans];
    }
    // Could be a key-value mapping like { "A": true }
    const keys = Object.entries(obj)
      .filter(([, v]) => v === true || v === "true" || v === 1 || v === "1")
      .map(([k]) => k);
    if (keys.length > 0) return keys;
  }

  // Boolean (True/False questions)
  if (typeof raw === "boolean") {
    return [raw ? "True" : "False"];
  }

  // Plain string
  return [String(raw)];
}

function formatDateSafe(value?: string | Date | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// Types that don't use options
const NO_OPTIONS_TYPES = new Set(["ESSAY", "SHORT_ANSWER"]);

// --- Preview modal sub-components ---

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

const typeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  MULTI_SELECT: "Multiple Select",
  TRUE_FALSE: "True/False",
  SHORT_ANSWER: "Short Answer",
  ESSAY: "Essay",
  FILL_IN_BLANK: "Fill in Blank",
  MATCHING: "Matching",
  ORDERING: "Ordering",
};

const difficultyLabel = (d: number) => {
  const normalized = Number.isFinite(d) ? Math.round(d) : 1;
  if (normalized <= 1) return { text: "Easy", color: "text-green-600" };
  if (normalized === 2) return { text: "Medium", color: "text-yellow-600" };
  return { text: "Hard", color: "text-red-600" };
};

const formatUpdatedAt = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const EMPTY_COURSE_FILTERS: FilterValues = {
  questionState: "all",
  difficulty: "all",
};

const EMPTY_QUESTION_FILTERS: FilterValues = {
  type: "all",
  difficulty: "all",
  points: { min: undefined, max: undefined },
};

export default function QuestionBankManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const questionEditorPath = `${basePath}/question-editor`;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<
    { id: string; code: string; name: string; faculty?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [courseSearchInput, setCourseSearchInput] = useState("");
  const [appliedCourseSearch, setAppliedCourseSearch] = useState("");
  const [questionSearchInput, setQuestionSearchInput] = useState("");
  const [appliedQuestionSearch, setAppliedQuestionSearch] = useState("");
  const [draftCourseFilters, setDraftCourseFilters] =
    useState<FilterValues>(EMPTY_COURSE_FILTERS);
  const [appliedCourseFilters, setAppliedCourseFilters] =
    useState<FilterValues>(EMPTY_COURSE_FILTERS);
  const [draftQuestionFilters, setDraftQuestionFilters] =
    useState<FilterValues>(EMPTY_QUESTION_FILTERS);
  const [appliedQuestionFilters, setAppliedQuestionFilters] =
    useState<FilterValues>(EMPTY_QUESTION_FILTERS);
  const [sortBy, setSortBy] = useState<"difficulty" | "points" | "updatedAt">("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [questionPage, setQuestionPage] = useState(1);
  const QUESTIONS_PER_PAGE = 12;
  const COURSES_PER_PAGE = 12;
  const [coursePage, setCoursePage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, firstQuestionsPage] = await Promise.all([
          api.getCourses(),
          api.listQuestions({ page: 1, limit: 100 }),
        ]);

        const firstPageQuestions = unwrapPaginatedData<Question>(firstQuestionsPage);
        const pages = Math.max(1, Number(firstQuestionsPage?.totalPages ?? 1));

        if (pages === 1) {
          setQuestions(firstPageQuestions);
        } else {
          const requests: Promise<unknown>[] = [];
          for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
            requests.push(api.listQuestions({ page: currentPage, limit: 100 }));
          }

          const remainingPages = await Promise.all(requests);
          const mergedQuestions = [
            ...firstPageQuestions,
            ...remainingPages.flatMap((response) =>
              unwrapPaginatedData<Question>(response),
            ),
          ];
          setQuestions(mergedQuestions);
        }

        setCourses(unwrapPaginatedData(coursesData));
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const courseFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "questionState",
        label: "Question state",
        type: "select",
        allLabel: "All courses",
        options: [
          { label: "Has questions", value: "hasQuestions" },
          { label: "No questions", value: "noQuestions" },
        ],
      },
      {
        key: "difficulty",
        label: "Difficulty",
        type: "select",
        allLabel: "All difficulty",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Medium", value: "medium" },
          { label: "Hard", value: "hard" },
        ],
      },
    ],
    [],
  );

  const questionFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "type",
        label: "Question type",
        type: "select",
        allLabel: "All types",
        options: Object.entries(typeLabels).map(([value, label]) => ({
          label,
          value,
        })),
      },
      {
        key: "difficulty",
        label: "Difficulty",
        type: "select",
        allLabel: "All difficulty",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Medium", value: "medium" },
          { label: "Hard", value: "hard" },
        ],
      },
      {
        key: "points",
        label: "Points",
        type: "number-range",
        min: 0,
        max: 20,
        step: 1,
      },
    ],
    [],
  );

  const filtered = questions
    .filter((q) => {
      const normalizedQuestionSearch = appliedQuestionSearch
        .trim()
        .toLowerCase();
      const matchSearch =
        q.content.toLowerCase().includes(normalizedQuestionSearch) ||
        q.id.toLowerCase().includes(normalizedQuestionSearch);

      const matchCourse = selectedCourse ? q.course?.code === selectedCourse : true;

      const typeValue = appliedQuestionFilters.type as string | undefined;
      const difficultyValue =
        appliedQuestionFilters.difficulty as string | undefined;
      const pointsFilter = appliedQuestionFilters.points as
        | { min?: number; max?: number }
        | undefined;

      const matchType = !typeValue || typeValue === "all" || q.type === typeValue;
      const diffLabel = difficultyLabel(q.difficulty || 1).text.toLowerCase();
      const matchDifficulty =
        !difficultyValue ||
        difficultyValue === "all" ||
        diffLabel === difficultyValue;
      const matchPoints = (() => {
        if (!pointsFilter) return true;
        if (
          pointsFilter.min === undefined &&
          pointsFilter.max === undefined
        )
          return true;
        const point = q.points || 0;
        if (pointsFilter.min !== undefined && point < pointsFilter.min)
          return false;
        if (pointsFilter.max !== undefined && point > pointsFilter.max)
          return false;
        return true;
      })();

      return (
        matchSearch &&
        matchCourse &&
        matchType &&
        matchDifficulty &&
        matchPoints
      );
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortBy === "difficulty")
        return ((a.difficulty || 1) - (b.difficulty || 1)) * mul;
      if (sortBy === "updatedAt") {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return (aTime - bTime) * mul;
      }
      return ((a.points || 1) - (b.points || 1)) * mul;
    });

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const newQuestion = await api.saveQuestion({
        sourceQuestionId: q.id,
        type: q.type,
        content: `[Copy] ${q.content}`,
        difficulty: q.difficulty,
        points: q.points,
        courseId: q.course?.code
          ? courses.find((c) => c.code === q.course?.code)?.id
          : undefined,
      });
      setQuestions((prev) => [newQuestion, ...prev]);
    } catch (error) {
      console.error("Failed to duplicate question:", error);
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  // Group questions by course
  const groupQuestionsByCourse = (questions: Question[]) => {
    return questions.reduce(
      (acc, question) => {
        const courseCode = question.course?.code || "Uncategorized";
        if (!acc[courseCode]) {
          acc[courseCode] = [];
        }
        acc[courseCode].push(question);
        return acc;
      },
      {} as Record<string, Question[]>,
    );
  };

  const gradientClasses = [
    "bg-gradient-to-br from-pink-400 to-pink-600",
    "bg-gradient-to-br from-purple-400 to-indigo-600",
    "bg-gradient-to-br from-blue-400 to-cyan-600",
    "bg-gradient-to-br from-green-400 to-emerald-600",
    "bg-gradient-to-br from-yellow-400 to-orange-600",
    "bg-gradient-to-br from-red-400 to-pink-600",
    "bg-gradient-to-br from-gray-400 to-gray-600",
  ];

  const getGradientClass = (index: number): string => {
    return gradientClasses[index % gradientClasses.length];
  };

  // Stats
  const avgDifficulty =
    questions.length > 0
      ? (
          questions.reduce((s, q) => s + (q.difficulty || 1), 0) /
          questions.length
        ).toFixed(1)
      : "0";

  const normalizedCourseSearch = appliedCourseSearch.trim().toLowerCase();
  const visibleCourses = courses.filter((course) => {
    const questionState = appliedCourseFilters.questionState as string | undefined;
    const difficultyValue = appliedCourseFilters.difficulty as string | undefined;

    const haystack = `${course.code} ${course.name} ${course.faculty || ""}`
      .toLowerCase()
      .trim();

    const searchMatched = !normalizedCourseSearch
      ? true
      : haystack.includes(normalizedCourseSearch);
    if (!searchMatched) return false;

    const courseQuestions = questions.filter((q) => q.course?.code === course.code);

    if (questionState === "hasQuestions" && courseQuestions.length === 0)
      return false;
    if (questionState === "noQuestions" && courseQuestions.length > 0)
      return false;

    if (!difficultyValue || difficultyValue === "all") return true;
    if (courseQuestions.length === 0) return false;

    const avgDiff =
      courseQuestions.reduce((sum, q) => sum + (q.difficulty || 1), 0) /
      courseQuestions.length;
    return difficultyLabel(avgDiff).text.toLowerCase() === difficultyValue;
  });

  const activeCourseFilterCount = getActiveFilterCount(
    appliedCourseFilters,
    courseFilterDefinitions,
  );
  const activeCourseFilterChips = getFilterChips(
    appliedCourseFilters,
    courseFilterDefinitions,
  );
  const activeQuestionFilterCount = getActiveFilterCount(
    appliedQuestionFilters,
    questionFilterDefinitions,
  );
  const activeQuestionFilterChips = getFilterChips(
    appliedQuestionFilters,
    questionFilterDefinitions,
  );

  const runCourseSearch = () => setAppliedCourseSearch(courseSearchInput.trim());
  const applyCourseFilters = () => setAppliedCourseFilters(draftCourseFilters);
  const clearCourseFilters = () => {
    setDraftCourseFilters(EMPTY_COURSE_FILTERS);
    setAppliedCourseFilters(EMPTY_COURSE_FILTERS);
    setCourseSearchInput("");
    setAppliedCourseSearch("");
  };
  const removeCourseFilter = (key: string) => {
    const nextFilters = {
      ...appliedCourseFilters,
      [key]: EMPTY_COURSE_FILTERS[key as keyof typeof EMPTY_COURSE_FILTERS],
    };
    setAppliedCourseFilters(nextFilters);
    setDraftCourseFilters(nextFilters);
  };

  const runQuestionSearch = () =>
    setAppliedQuestionSearch(questionSearchInput.trim());
  const applyQuestionFilters = () =>
    setAppliedQuestionFilters(draftQuestionFilters);
  const clearQuestionFilters = () => {
    setDraftQuestionFilters(EMPTY_QUESTION_FILTERS);
    setAppliedQuestionFilters(EMPTY_QUESTION_FILTERS);
    setQuestionSearchInput("");
    setAppliedQuestionSearch("");
  };
  const removeQuestionFilter = (key: string) => {
    const nextFilters = {
      ...appliedQuestionFilters,
      [key]:
        EMPTY_QUESTION_FILTERS[key as keyof typeof EMPTY_QUESTION_FILTERS],
    };
    setAppliedQuestionFilters(nextFilters);
    setDraftQuestionFilters(nextFilters);
  };

  useEffect(() => {
    setCoursePage(1);
  }, [appliedCourseSearch, appliedCourseFilters, questions.length]);

  useEffect(() => {
    setQuestionPage(1);
  }, [selectedCourse, appliedQuestionSearch, appliedQuestionFilters, sortBy, sortDir]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminPageShell backTo={basePath}>
        {/* COURSE SELECTION VIEW */}
        {!selectedCourse ? (
          <>
            <ListPageHeader
              title="Question Bank"
              className="mb-6"
              actions={
                <Button
                  className="gap-2"
                  onClick={() => router.push(questionEditorPath)}
                >
                  <Plus className="h-4 w-4" /> New Question
                </Button>
              }
            />

            {/* Stats Row */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
              <AdminStatCard
                icon={Database}
                value={questions.length}
                label="Total Questions"
              />
              <AdminStatCard
                icon={CheckCircle2}
                value={courses.length}
                label="Courses"
                iconWrapClassName="bg-green-100"
                iconClassName="text-green-600"
              />
              <AdminStatCard
                icon={BarChart3}
                value={avgDifficulty}
                label="Avg Difficulty"
                iconWrapClassName="bg-blue-100"
                iconClassName="text-blue-600"
              />
              <AdminStatCard
                icon={Tag}
                value={
                  Object.keys(typeLabels).filter((t) =>
                    questions.some((q) => q.type === t),
                  ).length
                }
                label="Question Types"
                iconWrapClassName="bg-purple-100"
                iconClassName="text-purple-600"
              />
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <SearchBar
                  value={courseSearchInput}
                  onChange={setCourseSearchInput}
                  onSearch={runCourseSearch}
                  placeholder="Search courses by code, name, or faculty"
                  className="min-w-0 flex-1"
                />
                <FilterPanel
                  title="Course filters"
                  description="Filter courses by question state and average difficulty."
                  filters={courseFilterDefinitions}
                  value={draftCourseFilters}
                  onValueChange={(key, nextValue) =>
                    setDraftCourseFilters((prev) => ({
                      ...prev,
                      [key]: nextValue,
                    }))
                  }
                  onApply={applyCourseFilters}
                  onClear={clearCourseFilters}
                  activeCount={activeCourseFilterCount}
                  className="shrink-0"
                />
              </div>
              <ActiveFilterChips
                chips={activeCourseFilterChips}
                onRemove={removeCourseFilter}
                onClearAll={clearCourseFilters}
              />
            </div>

            {/* Course row pagination */}
            {(() => {
              const courseTotalPages = Math.max(
                1,
                Math.ceil(visibleCourses.length / COURSES_PER_PAGE),
              );
              const paginatedCourses = visibleCourses.slice(
                (coursePage - 1) * COURSES_PER_PAGE,
                coursePage * COURSES_PER_PAGE,
              );
              return (
                <>
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(240px,1.35fr)_120px_140px_minmax(220px,1fr)_24px] md:items-center md:gap-4">
                      <span>Course</span>
                      <span>Questions</span>
                      <span>Avg. difficulty</span>
                      <span>Question types</span>
                      <span className="sr-only">Open</span>
                    </div>
                    <div className="divide-y">
                    {paginatedCourses.map((course, index) => {
                      const courseQuestions = questions.filter(
                        (q) => q.course?.code === course.code,
                      );
                      const questionTypes = [
                        ...new Set(courseQuestions.map((q) => q.type)),
                      ];
                      const avgDiff =
                        courseQuestions.length > 0
                          ? courseQuestions.reduce(
                              (s, q) => s + (q.difficulty || 1),
                              0,
                            ) / courseQuestions.length
                          : 0;
                      const diffInfo = difficultyLabel(avgDiff);
                      return (
                        <button
                          type="button"
                          key={course.id}
                          className="group grid w-full gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(240px,1.35fr)_120px_140px_minmax(220px,1fr)_24px] md:items-center"
                          onClick={() => setSelectedCourse(course.code)}
                          aria-label={`Open question bank for ${course.code}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm ${getGradientClass((coursePage - 1) * COURSES_PER_PAGE + index)}`}
                            >
                              {course.code.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {course.code}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {course.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm md:block">
                            <span className="text-muted-foreground md:hidden">
                              Questions
                            </span>
                            <span className="font-semibold tabular-nums text-foreground">
                              {courseQuestions.length}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm md:block">
                            <span className="text-muted-foreground md:hidden">
                              Avg. difficulty
                            </span>
                            <span className={`font-medium ${diffInfo.color}`}>
                              {courseQuestions.length > 0 ? diffInfo.text : "—"}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-start justify-between gap-3 md:block">
                            <span className="shrink-0 text-sm text-muted-foreground md:hidden">
                              Question types
                            </span>
                            <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                              {questionTypes.length === 0 && (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                              {questionTypes.slice(0, 3).map((type) => (
                                <span
                                  key={type}
                                  className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                                >
                                  {typeLabels[type] || type}
                                </span>
                              ))}
                              {questionTypes.length > 3 && (
                                <span className="self-center text-xs text-muted-foreground">
                                  +{questionTypes.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground md:block" />
                        </button>
                      );
                    })}
                    </div>
                  </div>
                  <DataPagination
                    currentPage={coursePage}
                    totalPages={courseTotalPages}
                    totalItems={visibleCourses.length}
                    onPageChange={setCoursePage}
                    itemLabel="courses"
                    className="border-t-0 px-0 pt-2"
                    syncUrl={false}
                  />
                </>
              );
            })()}

            {courses.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No courses yet</p>
                <p className="text-sm">
                  Create a course first to start adding questions.
                </p>
              </div>
            )}

            {courses.length > 0 && visibleCourses.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No courses found</p>
                <p className="text-sm">
                  Try another keyword for course code or name.
                </p>
              </div>
            )}
          </>
        ) : (
          /* QUESTION LIST VIEW (after selecting a course) */
          <>
            <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setSelectedCourse(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground mb-0.5">
                    {selectedCourse} — Question Bank
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {courses.find((c) => c.code === selectedCourse)?.name || ""}{" "}
                    • {filtered.length} questions
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => router.push(`${basePath}/question-history`)}
                >
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Button>
                <Button
                  className="gap-2"
                  onClick={() =>
                    router.push(
                      `${questionEditorPath}?courseCode=${selectedCourse}`,
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> New Question
                </Button>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <SearchBar
                  value={questionSearchInput}
                  onChange={setQuestionSearchInput}
                  onSearch={runQuestionSearch}
                  placeholder="Search questions or IDs..."
                  className="min-w-0 flex-1"
                />
                <FilterPanel
                  title="Question filters"
                  description="Filter by type, difficulty, and points."
                  filters={questionFilterDefinitions}
                  value={draftQuestionFilters}
                  onValueChange={(key, nextValue) =>
                    setDraftQuestionFilters((prev) => ({
                      ...prev,
                      [key]: nextValue,
                    }))
                  }
                  onApply={applyQuestionFilters}
                  onClear={clearQuestionFilters}
                  activeCount={activeQuestionFilterCount}
                  className="shrink-0"
                />
              </div>
              <ActiveFilterChips
                chips={activeQuestionFilterChips}
                onRemove={removeQuestionFilter}
                onClearAll={clearQuestionFilters}
              />
            </div>

            {(() => {
              const totalQuestionPages = Math.max(
                1,
                Math.ceil(filtered.length / QUESTIONS_PER_PAGE),
              );
              const displayedQuestions = filtered.slice(
                (questionPage - 1) * QUESTIONS_PER_PAGE,
                questionPage * QUESTIONS_PER_PAGE,
              );

              return (
                <>
                  {/* Question Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[180px] whitespace-nowrap">
                            <button
                              onClick={() => toggleSort("updatedAt")}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              Updated At
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="flex-1 min-w-48">Content</TableHead>
                          <TableHead className="w-28">Type</TableHead>
                          <TableHead className="w-24 text-center">
                            <button
                              onClick={() => toggleSort("difficulty")}
                              className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                            >
                              Difficulty
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </TableHead>
                          <TableHead className="w-32 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedQuestions.map((question) => {
                          const diff = difficultyLabel(question.difficulty || 1);
                          return (
                            <TableRow key={question.id} className="hover:bg-muted/50">
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatUpdatedAt(question.updatedAt)}
                              </TableCell>
                              <TableCell className="text-sm line-clamp-2">
                                {question.content}
                              </TableCell>
                              <TableCell className="text-sm">
                                {typeLabels[question.type] || question.type}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${diff.color}`}>
                                  {diff.text}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={async () => {
                                      setPreviewQuestion(question);
                                      setDetailLoading(true);
                                      setDetailError(false);
                                      try {
                                        const detail = await api.getQuestionById(question.id);
                                        setDetailQuestion(detail as Question);
                                      } catch {
                                        setDetailError(true);
                                        setDetailQuestion(null);
                                      } finally {
                                        setDetailLoading(false);
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      router.push(
                                        `${questionEditorPath}?id=${question.id}&courseCode=${selectedCourse}`,
                                      )
                                    }
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleDuplicate(question)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => handleDelete(question.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {filtered.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No questions found</p>
                      <p className="text-sm">
                        Create your first question for this course.
                      </p>
                    </div>
                  )}

                  <DataPagination
                    currentPage={questionPage}
                    totalPages={totalQuestionPages}
                    totalItems={filtered.length}
                    onPageChange={setQuestionPage}
                    itemLabel="questions"
                    className="border-t-0 px-0 pt-2"
                    syncUrl={false}
                  />
                </>
              );
            })()}
          </>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={!!previewQuestion}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewQuestion(null);
              setDetailQuestion(null);
              setDetailError(false);
            }
          }}
        >
          <DialogContent className="w-[950px] max-w-[95vw] max-h-[85vh] overflow-hidden p-0 gap-0">
            {detailLoading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {detailError && !detailLoading && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="text-lg font-medium">Unable to load question details</p>
                <p className="text-sm text-muted-foreground text-center">
                  An error occurred while fetching the full question data.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!previewQuestion) return;
                    setDetailLoading(true);
                    setDetailError(false);
                    try {
                      const detail = await api.getQuestionById(previewQuestion.id);
                      setDetailQuestion(detail as Question);
                    } catch {
                      setDetailError(true);
                      setDetailQuestion(null);
                    } finally {
                      setDetailLoading(false);
                    }
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {!detailLoading && !detailError && detailQuestion && (() => {
              const q = detailQuestion;
              const diff = difficultyLabel(q.difficulty || 1);
              const typeLabel = typeLabels[q.type] || q.type;
              const options = normalizeOptions(q.options);
              const correctAnswers = normalizeCorrectAnswer(q.correctAnswer);
              const hasOptions = !NO_OPTIONS_TYPES.has(q.type);

              return (
                <>
                  {/* Fixed Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">Question Preview</h2>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {typeLabel}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setPreviewQuestion(null);
                        setDetailQuestion(null);
                        setDetailError(false);
                      }}
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="max-h-[calc(85vh-73px)] overflow-y-auto p-6 space-y-6">

                    {/* 1. Question Content */}
                    <Section title="Question Content">
                      <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                        {q.content}
                      </p>
                    </Section>

                    {/* 2. Answer Options */}
                    {hasOptions ? (
                      <Section title="Answer Options">
                        {options.length > 0 ? (
                          <div className="space-y-2">
                            {options.map((opt) => {
                              const isCorrect = correctAnswers.some(
                                (ca) => ca.toUpperCase() === opt.id.toUpperCase() || ca === opt.text,
                              );
                              return (
                                <div
                                  key={opt.id}
                                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                                    isCorrect
                                      ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700"
                                      : "border-border bg-card"
                                  }`}
                                >
                                  <span
                                    className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                      isCorrect
                                        ? "bg-green-500 text-white"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {isCorrect ? "✓" : opt.id}
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap break-words pt-0.5">
                                    {opt.text}
                                  </span>
                                  {isCorrect && (
                                    <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                                      Correct answer
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            This question type does not use answer options
                          </p>
                        )}
                      </Section>
                    ) : (
                      <Section title="Answer Options">
                        <p className="text-sm text-muted-foreground italic">
                          This question type does not use answer options
                        </p>
                      </Section>
                    )}

                    {/* 3. Correct Answer */}
                    <Section
                      title="Correct Answer"
                      className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                    >
                      {correctAnswers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {correctAnswers.map((ans, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {ans}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No correct answer provided
                        </p>
                      )}
                    </Section>

                    {/* 4. Explanation */}
                    <Section title="Explanation">
                      {q.explanation ? (
                        <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                          {q.explanation}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No explanation provided
                        </p>
                      )}
                    </Section>

                    <Separator />

                    {/* 5. Difficulty, Points, Type */}
                    <div className="grid grid-cols-3 gap-4">
                      <InfoCard
                        label="Difficulty"
                        value={diff.text}
                        valueClassName={diff.color}
                      />
                      <InfoCard
                        label="Points"
                        value={String(q.points ?? 1)}
                      />
                      <InfoCard
                        label="Type"
                        value={typeLabel}
                      />
                    </div>

                    {/* 6. Metadata */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[100px]">Course:</span>
                        <span>{q.course?.code || q.course?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[100px]">Created:</span>
                        <span>{formatDateSafe(q.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium min-w-[100px]">Last updated:</span>
                        <span>{formatDateSafe(q.updatedAt)}</span>
                      </div>
                    </div>

                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </AdminPageShell>
    </DashboardLayout>
  );
}



