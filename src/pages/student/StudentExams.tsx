import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataPagination } from "@/components/common/DataPagination";
import { ListPageHeader } from "@/components/common/list/ListPageHeader";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

type StudentExamItem = {
  id: string;
  title?: string;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number;
  submitted?: boolean;
  completed?: boolean;
  source?: "available" | "submission";
  course?: {
    id?: string;
    code?: string;
    name?: string;
  };
};

const statusText = (exam: StudentExamItem) => {
  if (exam.completed) return "Completed";
  const status = String(exam.status || "").toUpperCase();
  if (status === "ONGOING") return "Ongoing";
  return "Upcoming";
};

export default function StudentExams() {
  const [exams, setExams] = useState<StudentExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    submissionState: "all",
    status: "all",
    courseCode: "all",
    startTime: { from: undefined, to: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    submissionState: "all",
    status: "all",
    courseCode: "all",
    startTime: { from: undefined, to: undefined },
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        setLoading(true);
        const [available, mySubs] = await Promise.all([
          api.getAvailableExams(),
          api.getMySubmissions(),
        ]);
        const examsList = (available || []) as any[];
        const submissions = (mySubs || []) as any[];
        const submittedExamIds = new Set<string>(
          submissions
            .filter((s: any) =>
              ["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(
                String(s.status || "").toUpperCase(),
              ),
            )
            .map((s: any) => String(s.examId ?? s.exam?.id)),
        );

        const byId = new Map<string, StudentExamItem>();

        examsList.forEach((exam: any) => {
          const id = String(exam.id);
          byId.set(id, {
            id,
            title: exam.title,
            status: exam.status,
            startTime: exam.startTime,
            endTime: exam.endTime,
            duration: exam.duration,
            course: exam.course,
            submitted: submittedExamIds.has(id),
            completed: false,
            source: "available",
          });
        });

        submissions.forEach((submission: any) => {
          const submissionStatus = String(submission.status || "").toUpperCase();
          const examId = String(submission.examId ?? submission.exam?.id ?? "");
          if (!examId) return;

          const isCompleted = ["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(
            submissionStatus,
          );

          const existing = byId.get(examId);
          if (existing) {
            byId.set(examId, {
              ...existing,
              submitted: existing.submitted || isCompleted,
              completed: existing.completed || isCompleted,
            });
            return;
          }

          byId.set(examId, {
            id: examId,
            title: submission.exam?.title,
            status: isCompleted ? "COMPLETED" : submissionStatus,
            startTime: submission.submittedAt || submission.startedAt,
            duration: undefined,
            course: submission.exam?.course,
            submitted: isCompleted,
            completed: isCompleted,
            source: "submission",
          });
        });

        if (mounted) {
          setExams(Array.from(byId.values()));
        }
      } catch (err) {
        console.error("Failed to load exams", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  const examFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "submissionState",
        label: "Submission",
        type: "select",
        allLabel: "All",
        options: [
          { label: "Not Submitted", value: "notSubmitted" },
          { label: "Submitted", value: "submitted" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        allLabel: "All Status",
        options: [
          { label: "Upcoming", value: "PUBLISHED" },
          { label: "Ongoing", value: "ONGOING" },
          { label: "Completed", value: "COMPLETED" },
        ],
      },
      {
        key: "courseCode",
        label: "Course",
        type: "select",
        allLabel: "All Courses",
        options: Array.from(
          new Set(exams.map((exam) => exam.course?.code).filter(Boolean)),
        ).map((code) => ({
          label: String(code),
          value: String(code),
        })),
      },
      {
        key: "startTime",
        label: "Start Time",
        type: "date-range",
      },
    ],
    [exams],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const submissionState = appliedFilters.submissionState as string | undefined;
      const statusFilter = appliedFilters.status as string | undefined;
      const courseFilter = appliedFilters.courseCode as string | undefined;
      const startTimeFilter = appliedFilters.startTime as
        | { from?: string; to?: string }
        | undefined;

      const searchMatched = !normalizedSearch
        ? true
        : [exam.title, exam.course?.code, exam.course?.name]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      if (!searchMatched) return false;

      if (submissionState === "submitted" && !exam.submitted) return false;
      if (submissionState === "notSubmitted" && exam.submitted) return false;

      const effectiveStatus = exam.completed
        ? "COMPLETED"
        : String(exam.status || "PUBLISHED").toUpperCase();

      if (statusFilter && statusFilter !== "all" && effectiveStatus !== statusFilter) {
        return false;
      }

      if (
        courseFilter &&
        courseFilter !== "all" &&
        exam.course?.code !== courseFilter
      ) {
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
  }, [appliedFilters, exams, normalizedSearch]);

  const examSummary = useMemo(() => {
    const counts = { upcoming: 0, ongoing: 0, completed: 0 };
    exams.forEach((exam) => {
      const status = statusText(exam).toLowerCase();
      if (status === "upcoming") counts.upcoming += 1;
      if (status === "ongoing") counts.ongoing += 1;
      if (status === "completed") counts.completed += 1;
    });
    return counts;
  }, [exams]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / ITEMS_PER_PAGE));
  const paginatedExams = filteredExams.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const EXAM_ITEM_HEIGHT = 106;
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
      submissionState: "all",
      status: "all",
      courseCode: "all",
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
      submissionState: "all",
      status: "all",
      courseCode: "all",
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
      <div className="space-y-6">
        <BackToDashboardButton to="/student" className="-ml-2" />

        <div className="space-y-3">
          <ListPageHeader title="Exams" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="text-xl font-semibold text-foreground">{examSummary.upcoming}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Ongoing</p>
              <p className="text-xl font-semibold text-foreground">{examSummary.ongoing}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold text-foreground">{examSummary.completed}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search exam title or course"
              className="flex-1"
            />
            <FilterPanel
              title="Exam filters"
              description="Filter by submission, status, course and start time."
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

        <Card>
          <CardHeader>
            <CardTitle>My Exams</CardTitle>
            <CardDescription>
              Upcoming, ongoing, and completed exams with clear course context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div
                className="space-y-3"
                style={{ minHeight: EXAM_LIST_MIN_HEIGHT }}
              >
                {filteredExams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">
                      No exams match current search/filter
                    </p>
                  </div>
                ) : (
                  paginatedExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {exam.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {(exam.course?.code || "-") + " - " + (exam.course?.name || "Course unavailable")}
                        </p>
                        {exam.startTime && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(exam.startTime).toLocaleString()}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{statusText(exam)}</Badge>
                          {exam.submitted ? <Badge variant="secondary">Submitted</Badge> : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!exam.submitted && !exam.completed ? (
                          <Button asChild size="sm">
                            <Link to={`/student/exam-ready?examId=${exam.id}`}>Start</Link>
                          </Button>
                        ) : null}

                        <Button asChild variant="outline" size="sm">
                          <Link to={`/student/exams/${exam.id}`}>Detail</Link>
                        </Button>

                        {exam.submitted ? (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/student/results/${exam.id}`}>Result</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
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
      </div>
    </DashboardLayout>
  );
}
