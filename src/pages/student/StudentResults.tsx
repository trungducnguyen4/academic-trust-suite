import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataPagination } from "@/components/common/DataPagination";
import { ListPageHeader } from "@/components/common/list/ListPageHeader";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { SortButton, type SortOrder } from "@/components/common/list/SortButton";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import { sortItems } from "@/components/common/list/sort-utils";
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
import { Loader2, Award, FileCheck2, RotateCcw, Trophy } from "lucide-react";
import api from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";

const scoreBadgeClass = (score: unknown) => {
  const numericScore = typeof score === "number" ? score : null;

  if (numericScore === null) return "border-slate-200 bg-slate-50 text-slate-600";
  if (numericScore >= 8) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (numericScore >= 5) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
};

const statusBadgeClass = (status?: string) => {
  const normalized = String(status || "").toUpperCase();

  if (["GRADED", "FINALIZED"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "FLAGGED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
};

export default function StudentResults() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    status: "all",
    courseCode: "all",
    score: { min: undefined, max: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    status: "all",
    courseCode: "all",
    score: { min: undefined, max: undefined },
  });
  const [sortField, setSortField] = useState("exam.title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await api.getMySubmissions();
        if (mounted) setSubmissions(data || []);
      } catch (err) {
        console.error("Failed to load submissions", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  const resultFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        allLabel: "All Status",
        options: [
          { label: "Submitted", value: "SUBMITTED" },
          { label: "Graded", value: "GRADED" },
          { label: "Flagged", value: "FLAGGED" },
          { label: "Finalized", value: "FINALIZED" },
        ],
      },
      {
        key: "courseCode",
        label: "Course",
        type: "select",
        allLabel: "All Courses",
        options: Array.from(
          new Set(
            submissions
              .map((submission) => submission.exam?.course?.code)
              .filter(Boolean),
          ),
        ).map((code) => ({ label: String(code), value: String(code) })),
      },
      {
        key: "score",
        label: "Score",
        type: "number-range",
        min: 0,
        max: 100,
        step: 1,
      },
    ],
    [submissions],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter((submission) => {
      const statusFilter = appliedFilters.status as string | undefined;
      const courseFilter = appliedFilters.courseCode as string | undefined;
      const scoreFilter = appliedFilters.score as
        | { min?: number; max?: number }
        | undefined;

      const searchMatched = !normalizedSearch
        ? true
        : [
            submission.exam?.title ?? submission.title,
            submission.exam?.course?.code,
            submission.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      if (!searchMatched) return false;

      if (statusFilter && statusFilter !== "all" && submission.status !== statusFilter) {
        return false;
      }

      if (
        courseFilter &&
        courseFilter !== "all" &&
        submission.exam?.course?.code !== courseFilter
      ) {
        return false;
      }

      if (scoreFilter && (scoreFilter.min !== undefined || scoreFilter.max !== undefined)) {
        const score = typeof submission.score === "number" ? submission.score : -1;
        if (scoreFilter.min !== undefined && score < scoreFilter.min) return false;
        if (scoreFilter.max !== undefined && score > scoreFilter.max) return false;
      }

      return true;
    });

    return sortItems(filtered, sortField, sortOrder);
  }, [appliedFilters, normalizedSearch, submissions, sortField, sortOrder]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE),
  );
  const paginatedSubmissions = filteredSubmissions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const RESULT_ITEM_HEIGHT = 92;
  const RESULT_LIST_MIN_HEIGHT = ITEMS_PER_PAGE * RESULT_ITEM_HEIGHT;

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
      courseCode: "all",
      score: { min: undefined, max: undefined },
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
      courseCode: "all",
      score: { min: undefined, max: undefined },
    };
    const next = { ...appliedFilters, [key]: empty[key] };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  };

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    resultFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(appliedFilters, resultFilterDefinitions);

  const resultSortOptions = [
    { field: "score", label: "Score" },
    { field: "status", label: "Status" },
    { field: "exam.title", label: "Exam Title" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackToDashboardButton to="/student" className="-ml-2" />

        <div className="space-y-3">
          <ListPageHeader title="Results" />
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search by exam title or course"
              className="flex-1"
            />
            <SortButton
              options={resultSortOptions}
              value={sortField}
              order={sortOrder}
              onSortChange={(field, order) => {
                setSortField(field);
                setSortOrder(order);
              }}
            />
            <FilterPanel
              title="Result filters"
              description="Filter by status, course, and score range."
              filters={resultFilterDefinitions}
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
            <CardTitle>My Results</CardTitle>
            <CardDescription>Graded and submitted exams</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div
                className="space-y-3"
                style={{ minHeight: RESULT_LIST_MIN_HEIGHT }}
              >
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">
                      No results match current search/filter
                    </p>
                  </div>
                ) : (
                  paginatedSubmissions.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:border-primary/30 hover:bg-white md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 space-y-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {s.exam?.title ?? s.title}
                          </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {s.exam?.course?.code || "Course unavailable"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={statusBadgeClass(s.status)}
                          >
                            <FileCheck2 className="mr-1 h-3.5 w-3.5" />
                            {getStatusBadgeLabel(s.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={scoreBadgeClass(
                              String(s.status).toUpperCase() === "SUBMITTED" ? null : s.score,
                            )}
                          >
                            <Trophy className="mr-1 h-3.5 w-3.5" />
                            {String(s.status).toUpperCase() === "SUBMITTED"
                              ? "Waiting for grading"
                              : `Score: ${s.score !== null ? s.score : "N/A"}`}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Attempt {s.attemptNo ?? "N/A"}
                          </Badge>
                        </div>
                        <p className="sr-only">
                          {getStatusBadgeLabel(s.status)} • {s.score !== null ? s.score : "—"}
                        </p>
                        <p className="sr-only">
                          Attempt {s.attemptNo ?? "N/A"}
                        </p>
                      </div>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        {String(s.status).toUpperCase() === "SUBMITTED" ? (
                          <Button size="sm" variant="outline" disabled>
                            Waiting for grading
                          </Button>
                        ) : (
                          <Button asChild size="sm">
                            <Link to={`/student/grading?examId=${s.examId ?? s.exam?.id}&submissionId=${s.id}`}>
                              View Result
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredSubmissions.length}
              onPageChange={setPage}
              itemLabel="results"
              syncUrl={false}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
