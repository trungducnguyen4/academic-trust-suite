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
import { Button } from "@/components/ui/button";
import { Loader2, Award } from "lucide-react";
import api from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { getStatusBadgeLabel } from "@/components/ui/status-badge";

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
                      className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {s.exam?.title ?? s.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {s.exam?.course?.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getStatusBadgeLabel(s.status)} • {s.score !== null ? s.score : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm">
                          <Link to={`/student/grading?examId=${s.examId ?? s.exam?.id}`}>
                            View Result
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/student/exams/${s.examId ?? s.exam?.id}`}>
                            Exam Detail
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
