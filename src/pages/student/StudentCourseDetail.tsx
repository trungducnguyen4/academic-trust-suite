import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, Calendar, Clock, FileText } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataPagination } from "@/components/common/DataPagination";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import {
  FilterDefinition,
  FilterValues,
} from "@/components/common/list/filter-types";
import {
  getActiveFilterCount,
  getFilterChips,
} from "@/components/common/list/filter-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";
import api, { unwrapPaginatedData } from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { CourseTerm, formatCourseTerm } from "@/lib/course-term";

type Course = {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  academicYear?: string;
  term?: CourseTerm;
  semester?: string;
  credits?: number;
};

type Exam = {
  id: string;
  title: string;
  status: string;
  startTime?: string | null;
  duration?: number;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};

export default function StudentCourseDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    status: "all",
    startTime: { from: undefined, to: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    status: "all",
    startTime: { from: undefined, to: undefined },
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Course id is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [courseRes, examsRes] = await Promise.all([
          api.getCourse(id),
          api.getExams({ courseId: id, limit: 50 }),
        ]);

        setCourse(courseRes || null);
        setExams(unwrapPaginatedData<Exam>(examsRes));
      } catch (err: any) {
        const message = err?.message || "Unable to load course details.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const sortedExams = useMemo(
    () =>
      [...exams].sort((a, b) => {
        const aTs = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTs = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTs - aTs;
      }),
    [exams],
  );

  const examFilterDefinitions: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      allLabel: "All Status",
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Published", value: "PUBLISHED" },
        { label: "Ongoing", value: "ONGOING" },
        { label: "Completed", value: "COMPLETED" },
      ],
    },
    {
      key: "startTime",
      label: "Start Time",
      type: "date-range",
    },
  ];

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredExams = useMemo(() => {
    return sortedExams.filter((exam) => {
      const statusFilter = appliedFilters.status as string | undefined;
      const startTimeFilter = appliedFilters.startTime as
        | { from?: string; to?: string }
        | undefined;

      const searchMatched = !normalizedSearch
        ? true
        : [exam.title, exam.status].join(" ").toLowerCase().includes(normalizedSearch);
      if (!searchMatched) return false;

      if (statusFilter && statusFilter !== "all" && exam.status !== statusFilter) {
        return false;
      }

      if (startTimeFilter?.from || startTimeFilter?.to) {
        const startTs = exam.startTime ? new Date(exam.startTime).getTime() : NaN;
        if (Number.isNaN(startTs)) return false;
        if (startTimeFilter.from) {
          const fromTs = new Date(startTimeFilter.from).getTime();
          if (!Number.isNaN(fromTs) && startTs < fromTs) return false;
        }
        if (startTimeFilter.to) {
          const toDate = new Date(startTimeFilter.to);
          toDate.setHours(23, 59, 59, 999);
          const toTs = toDate.getTime();
          if (!Number.isNaN(toTs) && startTs > toTs) return false;
        }
      }

      return true;
    });
  }, [appliedFilters, normalizedSearch, sortedExams]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / ITEMS_PER_PAGE));
  const paginatedExams = filteredExams.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const EXAM_ITEM_HEIGHT = 92;
  const EXAM_LIST_MIN_HEIGHT = ITEMS_PER_PAGE * EXAM_ITEM_HEIGHT;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };
  const clearFilters = () => {
    const empty: FilterValues = {
      status: "all",
      startTime: { from: undefined, to: undefined },
    };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };
  const removeFilter = (key: string) => {
    const empty: FilterValues = {
      status: "all",
      startTime: { from: undefined, to: undefined },
    };
    const next = { ...appliedFilters, [key]: empty[key] };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  };

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    examFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(appliedFilters, examFilterDefinitions);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <BackToDashboardButton to="/student" className="-ml-2" />

          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {course?.name || "Course Details"}
              </h1>
              {course?.code && <Badge variant="secondary">{course.code}</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {course?.description ||
                "No description available for this course."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Term: {formatCourseTerm(
                  course?.academicYear,
                  course?.term,
                  course?.semester,
                )}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Credits: {course?.credits ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading course data...
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium text-foreground">
                Could not load this course.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Exams In This Course</CardTitle>
              <CardDescription>{filteredExams.length} exam(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <SearchBar
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={runSearch}
                    placeholder="Search by exam title"
                    className="flex-1"
                  />
                  <FilterPanel
                    title="Exam filters"
                    description="Filter by status and start time."
                    filters={examFilterDefinitions}
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

              {filteredExams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  No exams match current search/filter.
                </div>
              ) : (
                <div
                  className="space-y-3"
                  style={{ minHeight: EXAM_LIST_MIN_HEIGHT }}
                >
                  {paginatedExams.map((exam) => {
                    const canJoin =
                      exam.status === "PUBLISHED" || exam.status === "ONGOING";
                    return (
                      <div
                        key={exam.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {exam.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {exam.startTime
                                ? format(
                                    new Date(exam.startTime),
                                    "MMM d, yyyy HH:mm",
                                  )
                                : "Not scheduled"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {exam.duration || 0} min
                            </span>
                            <Badge variant="outline">
                              {statusLabel[exam.status] || getStatusBadgeLabel(exam.status)}
                            </Badge>
                          </div>
                        </div>

                        {canJoin ? (
                          <Button asChild>
                            <Link to={`/student/exam-ready?examId=${exam.id}`}>
                              Open Exam
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            Not Available
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <DataPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredExams.length}
                onPageChange={setPage}
                itemLabel="exams"
                syncUrl={false}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
