import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import api from "@/lib/api";
import { unwrapPaginatedData } from "@/lib/api";

interface Question {
  id: string;
  content: string;
  type: string;
  course?: { code: string; name: string };
  difficulty: number;
  points: number;
  tags: string;
  createdAt: string;
  updatedAt: string;
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
  if (d <= 2) return { text: "Easy", color: "text-green-600" };
  if (d <= 3) return { text: "Medium", color: "text-yellow-600" };
  return { text: "Hard", color: "text-red-600" };
};

const EMPTY_COURSE_FILTERS: FilterValues = {
  questionState: "all",
  difficulty: "all",
};

const EMPTY_QUESTION_FILTERS: FilterValues = {
  type: "all",
  difficulty: "all",
  points: { min: undefined, max: undefined },
  tags: { value: "", operator: "contains" },
};

// Safe parser for tags - handles arrays, JSON strings, comma-separated strings, or null
const safeParseTags = (tags: unknown): string[] => {
  if (!tags) return [];
  // Already an array
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string");
  // Not a string - can't parse
  if (typeof tags !== "string") return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Not JSON - treat as comma-separated string
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
};

export default function QuestionBankManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin")
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
  const [sortBy, setSortBy] = useState<"difficulty" | "points">("difficulty");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
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
          api.getQuestions({ page: 1, limit: 200 }),
        ]);

        const firstPageQuestions = unwrapPaginatedData<Question>(firstQuestionsPage);
        const pages = Math.max(1, Number(firstQuestionsPage?.totalPages ?? 1));

        if (pages === 1) {
          setQuestions(firstPageQuestions);
        } else {
          const requests: Promise<any>[] = [];
          for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
            requests.push(api.getQuestions({ page: currentPage, limit: 200 }));
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
      {
        key: "tags",
        label: "Tags",
        type: "text",
        placeholder: "Filter by tag",
        operators: ["contains", "startsWith", "equals"],
      },
    ],
    [],
  );

  const filtered = questions
    .filter((q) => {
      const tags = safeParseTags(q.tags);
      const normalizedQuestionSearch = appliedQuestionSearch
        .trim()
        .toLowerCase();
      const matchSearch =
        q.content.toLowerCase().includes(normalizedQuestionSearch) ||
        q.id.toLowerCase().includes(normalizedQuestionSearch) ||
        tags.some((t: string) =>
          t.toLowerCase().includes(normalizedQuestionSearch),
        );

      const matchCourse = selectedCourse ? q.course?.code === selectedCourse : true;

      const typeValue = appliedQuestionFilters.type as string | undefined;
      const difficultyValue =
        appliedQuestionFilters.difficulty as string | undefined;
      const pointsFilter = appliedQuestionFilters.points as
        | { min?: number; max?: number }
        | undefined;
      const tagsFilter = appliedQuestionFilters.tags as
        | TextFilterValue
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
      const matchTags = (() => {
        if (!tagsFilter || !tagsFilter.value.trim()) return true;
        const filterValue = tagsFilter.value.trim().toLowerCase();
        const tagText = tags.join(" ").toLowerCase();
        if (tagsFilter.operator === "startsWith") {
          return tags.some((tag) => tag.toLowerCase().startsWith(filterValue));
        }
        if (tagsFilter.operator === "equals") {
          return tags.some((tag) => tag.toLowerCase() === filterValue);
        }
        return tagText.includes(filterValue);
      })();

      return (
        matchSearch &&
        matchCourse &&
        matchType &&
        matchDifficulty &&
        matchPoints &&
        matchTags
      );
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortBy === "difficulty")
        return ((a.difficulty || 1) - (b.difficulty || 1)) * mul;
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
      const newQuestion = await api.createQuestion({
        type: q.type,
        content: `[Copy] ${q.content}`,
        difficulty: q.difficulty,
        points: q.points,
        tags: safeParseTags(q.tags),
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
                  onClick={() => navigate(questionEditorPath)}
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

            {/* Course Card Pagination */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <Card
                          key={course.id}
                          className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                          onClick={() => setSelectedCourse(course.code)}
                        >
                          <div className={`h-32 ${getGradientClass((coursePage - 1) * COURSES_PER_PAGE + index)} relative`}>
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-4 left-4 text-white">
                              <p className="text-2xl font-bold">{course.code}</p>
                              <p className="text-sm text-white/80 line-clamp-1">
                                {course.name}
                              </p>
                            </div>
                            <div className="absolute top-4 right-4">
                              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                                {courseQuestions.length} questions
                              </span>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Avg Difficulty
                                </span>
                                <span className={`font-medium ${diffInfo.color}`}>
                                  {diffInfo.text}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Question Types
                                </span>
                                <span className="font-medium">
                                  {questionTypes.length}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {questionTypes.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                  >
                                    {typeLabels[t] || t}
                                  </span>
                                ))}
                                {questionTypes.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{questionTypes.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
                  onClick={() => navigate(`${basePath}/question-history`)}
                >
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Button>
                <Button
                  className="gap-2"
                  onClick={() =>
                    navigate(
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
                  placeholder="Search questions, IDs, tags..."
                  className="min-w-0 flex-1"
                />
                <FilterPanel
                  title="Question filters"
                  description="Filter by type, difficulty, points, and tags."
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
                  {/* Question Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedQuestions.map((question, qIndex) => {
                      const diff = difficultyLabel(question.difficulty || 1);
                      const tags = safeParseTags(question.tags);
                      return (
                        <Card
                          key={question.id}
                          className="overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div
                            className={`h-24 ${getGradientClass(qIndex)} relative`}
                          >
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute top-3 right-3 flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 h-6 w-6 p-0"
                                onClick={() => setPreviewQuestion(question)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 h-6 w-6 p-0"
                                onClick={() =>
                                  navigate(
                                    `${questionEditorPath}?id=${question.id}&courseCode=${selectedCourse}`,
                                  )
                                }
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {question.id.slice(0, 8)}
                                  </span>
                                  <span
                                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${diff.color}`}
                                  >
                                    {diff.text}
                                  </span>
                                </div>
                                <p className="text-sm line-clamp-3 mb-2">
                                  {question.content}
                                </p>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                  <span>
                                    {typeLabels[question.type] || question.type}
                                  </span>
                                  <span>•</span>
                                  <span>{question.points || 1} pts</span>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {tags.slice(0, 3).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                                    >
                                      <Tag className="h-2.5 w-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                  {tags.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => handleDuplicate(question)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleDelete(question.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
          onOpenChange={() => setPreviewQuestion(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {previewQuestion?.id.slice(0, 8)}
                </span>
                Question Preview
              </DialogTitle>
              <DialogDescription>Full question details</DialogDescription>
            </DialogHeader>
            {previewQuestion && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Content</p>
                  <p className="text-sm text-muted-foreground">
                    {previewQuestion.content}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Difficulty
                    </p>
                    <p className="text-lg font-semibold">
                      {previewQuestion.difficulty || 1}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Points</p>
                    <p className="text-lg font-semibold">
                      {previewQuestion.points || 1}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Course:</span>{" "}
                    {previewQuestion.course?.code || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {typeLabels[previewQuestion.type] || previewQuestion.type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {new Date(previewQuestion.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>{" "}
                    {new Date(previewQuestion.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {safeParseTags(previewQuestion.tags).map((t: string) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground"
                    >
                      <Tag className="h-3 w-3" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminPageShell>
    </DashboardLayout>
  );
}
