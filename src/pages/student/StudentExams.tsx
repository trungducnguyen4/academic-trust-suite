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
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

export default function StudentExams() {
  const [exams, setExams] = useState<any[]>([]);
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
        const examsList = available || [];
        const submissions = mySubs || [];
        const submittedExamIds = new Set<string>(
          submissions
            .filter((s: any) =>
              ["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(
                String(s.status || "").toUpperCase(),
              ),
            )
            .map((s: any) => s.examId ?? s.exam?.id),
        );
        if (mounted) {
          setExams(
            examsList.map((e: any) => ({
              ...e,
              submitted: submittedExamIds.has(e.id),
            })),
          );
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
          { label: "Published", value: "PUBLISHED" },
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
    return exams.filter((exam: any) => {
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

      if (statusFilter && statusFilter !== "all" && exam.status !== statusFilter) {
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
            <CardTitle>Available Exams</CardTitle>
            <CardDescription>Start or review exam details</CardDescription>
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
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No exams match current search/filter
                    </p>
                  </div>
                ) : (
                  paginatedExams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {exam.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {exam.course?.code ?? exam.course}
                        </p>
                        {exam.startTime && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(exam.startTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!exam.submitted && (
                          <Button asChild size="sm">
                            <Link to={`/student/exam-ready?examId=${exam.id}`}>
                              Start
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/student/grading?examId=${exam.id}`}>
                            Result
                          </Link>
                        </Button>
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
