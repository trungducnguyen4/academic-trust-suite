"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  if (numericScore === null) return "border-border bg-muted text-muted-foreground";
  if (numericScore >= 8) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (numericScore >= 5) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
};

const statusBadgeClass = (status?: string) => {
  const normalized = String(status || "").toUpperCase();

  if (["GRADED", "FINALIZED"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (normalized === "FLAGGED") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
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
        label: "Trạng thái",
        type: "select",
        allLabel: "Tất cả trạng thái",
        options: [
          { label: "Đã nộp", value: "SUBMITTED" },
          { label: "Đã chấm", value: "GRADED" },
          { label: "Cần xem xét", value: "FLAGGED" },
          { label: "Đã hoàn tất", value: "FINALIZED" },
        ],
      },
      {
        key: "courseCode",
        label: "Khóa học",
        type: "select",
        allLabel: "Tất cả khóa học",
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
        label: "Điểm",
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
    { field: "score", label: "Điểm" },
    { field: "status", label: "Trạng thái" },
    { field: "exam.title", label: "Tên bài thi" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackToDashboardButton to="/student" className="-ml-2" />

        <div className="space-y-3">
          <ListPageHeader title="Kết quả" />
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Tìm theo tên bài thi hoặc khóa học"
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
              title="Bộ lọc kết quả"
              description="Lọc theo trạng thái, khóa học và khoảng điểm."
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
            <CardTitle>Kết quả của tôi</CardTitle>
            <CardDescription>Các bài thi đã nộp và đã chấm</CardDescription>
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
                      Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc
                    </p>
                  </div>
                ) : (
                  paginatedSubmissions.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/30 hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 space-y-3">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {s.exam?.title ?? s.title}
                          </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {s.exam?.course?.code || "Chưa có thông tin khóa học"}
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
                              ? "Đang chờ chấm"
                              : `Điểm: ${s.score !== null ? s.score : "N/A"}`}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Lượt {s.attemptNo ?? "N/A"}
                          </Badge>
                        </div>
                        <p className="sr-only">
                          {getStatusBadgeLabel(s.status)} • {s.score !== null ? s.score : "—"}
                        </p>
                        <p className="sr-only">
                          Lượt {s.attemptNo ?? "N/A"}
                        </p>
                      </div>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        {String(s.status).toUpperCase() === "SUBMITTED" ? (
                          <Button size="sm" variant="outline" disabled>
                            Đang chờ chấm
                          </Button>
                        ) : (
                          <Button asChild size="sm">
                            <Link href={`/student/grading?examId=${s.examId ?? s.exam?.id}&submissionId=${s.id}`}>
                              Xem kết quả
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
              itemLabel="kết quả"
              syncUrl={false}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



