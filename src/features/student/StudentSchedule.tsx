"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { CalendarClock, Clock3, Loader2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { ListPageHeader } from "@/components/common/list/ListPageHeader";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import {
  getActiveFilterCount,
  getFilterChips,
} from "@/components/common/list/filter-utils";
import {
  type FilterDefinition,
  type FilterValues,
} from "@/components/common/list/filter-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api";

type ScheduleExamItem = {
  id: string;
  title?: string;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number;
  course?: {
    id?: string;
    code?: string;
    name?: string;
  };
  submitted?: boolean;
};

const dayLabel = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE");
};

const statusBadgeClass = (status?: string) => {
  const normalized = String(status || "PUBLISHED").toUpperCase();

  if (normalized === "ONGOING") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
};

export default function StudentSchedule() {
  const [items, setItems] = useState<ScheduleExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    status: "all",
    courseCode: "all",
    startTime: { from: undefined, to: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    status: "all",
    courseCode: "all",
    startTime: { from: undefined, to: undefined },
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [availableExams, submissions] = await Promise.all([
          api.getAvailableExams(),
          api.getMySubmissions(),
        ]);

        if (!mounted) return;

        const submittedIds = new Set<string>(
          (submissions || [])
            .filter((item: any) =>
              ["SUBMITTED", "GRADED", "FLAGGED", "FINALIZED"].includes(
                String(item.status || "").toUpperCase(),
              ),
            )
            .map((item: any) => String(item.examId || item.exam?.id || "")),
        );

        const mapped = (availableExams || []).map((exam: any) => ({
          id: String(exam.id),
          title: exam.title,
          status: exam.status,
          startTime: exam.startTime,
          endTime: exam.endTime,
          duration: exam.duration,
          course: exam.course,
          submitted: submittedIds.has(String(exam.id)),
        }));

        setItems(mapped);
      } catch (error) {
        console.error("Failed to load student schedule", error);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        allLabel: "All Status",
        options: [
          { label: "Published", value: "PUBLISHED" },
          { label: "Ongoing", value: "ONGOING" },
        ],
      },
      {
        key: "courseCode",
        label: "Course",
        type: "select",
        allLabel: "All Courses",
        options: Array.from(
          new Set(items.map((item) => item.course?.code).filter(Boolean)),
        ).map((code) => ({ label: String(code), value: String(code) })),
      },
      {
        key: "startTime",
        label: "Exam Date",
        type: "date-range",
      },
    ],
    [items],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusFilter = appliedFilters.status as string | undefined;
      const courseFilter = appliedFilters.courseCode as string | undefined;
      const startTimeFilter = appliedFilters.startTime as
        | { from?: string; to?: string }
        | undefined;

      const searchMatched = !normalizedSearch
        ? true
        : [item.title, item.course?.code, item.course?.name]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      if (!searchMatched) return false;

      if (statusFilter && statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (courseFilter && courseFilter !== "all" && item.course?.code !== courseFilter) {
        return false;
      }

      if (startTimeFilter?.from || startTimeFilter?.to) {
        const startTs = item.startTime ? new Date(item.startTime).getTime() : NaN;
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
  }, [appliedFilters, items, normalizedSearch]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ScheduleExamItem[]>();

    [...filteredItems]
      .sort((a, b) => {
        const aTs = a.startTime ? new Date(a.startTime).getTime() : Number.MAX_SAFE_INTEGER;
        const bTs = b.startTime ? new Date(b.startTime).getTime() : Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      })
      .forEach((item) => {
        const key = item.startTime
          ? format(startOfDay(new Date(item.startTime)), "yyyy-MM-dd")
          : "unscheduled";
        const bucket = map.get(key) || [];
        bucket.push(item);
        map.set(key, bucket);
      });

    return Array.from(map.entries());
  }, [filteredItems]);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const clearFilters = () => {
    const empty: FilterValues = {
      status: "all",
      courseCode: "all",
      startTime: { from: undefined, to: undefined },
    };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setSearchInput("");
    setAppliedSearch("");
  };

  const removeFilter = (key: string) => {
    const empty: FilterValues = {
      status: "all",
      courseCode: "all",
      startTime: { from: undefined, to: undefined },
    };
    const next = { ...appliedFilters, [key]: empty[key] };
    setAppliedFilters(next);
    setDraftFilters(next);
  };

  const activeFilterCount = getActiveFilterCount(appliedFilters, filterDefinitions);
  const activeFilterChips = getFilterChips(appliedFilters, filterDefinitions);

  return (
    <DashboardLayout>
      <div className="space-y-6 rounded-2xl bg-[linear-gradient(180deg,hsl(200_40%_97%)_0%,hsl(0_0%_100%)_42%)] p-4 sm:p-5 lg:p-6">
        <BackToDashboardButton to="/student" className="-ml-2" />

        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
          <ListPageHeader title="Exam Schedule" />
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search exam title or course"
              className="flex-1"
            />
            <FilterPanel
              title="Schedule filters"
              description="Filter by status, course and date range."
              filters={filterDefinitions}
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

        <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-medium">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70">
            <CardTitle className="flex items-center gap-2 text-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </span>
              Calendar View
            </CardTitle>
            <CardDescription>
              Lightweight calendar-like timeline for your exam windows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </div>
            ) : groupedByDate.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                <CalendarClock className="mx-auto h-6 w-6" />
                <p className="mt-2">No upcoming or ongoing exams match current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedByDate.map(([dateKey, dateItems]) => {
                  const representativeDate =
                    dateKey === "unscheduled" ? null : new Date(`${dateKey}T00:00:00`);
                  return (
                    <div
                      key={dateKey}
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-amber-400" />
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {representativeDate
                              ? `${dayLabel(representativeDate)} - ${format(representativeDate, "MMM d, yyyy")}`
                              : "Unscheduled"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {dateItems.length} exam(s)
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {dateItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:border-primary/30 hover:bg-white md:flex-row md:items-center md:justify-between"
                          >
                            <div className="border-l-2 border-primary/50 pl-3">
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.course?.code || "-"} - {item.course?.name || "Course unavailable"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {item.startTime
                                    ? format(new Date(item.startTime), "HH:mm")
                                    : "N/A"}
                                  {" to "}
                                  {item.endTime ? format(new Date(item.endTime), "HH:mm") : "N/A"}
                                </span>
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={statusBadgeClass(item.status)}>
                                {item.status || "PUBLISHED"}
                              </Badge>
                              {item.submitted ? (
                                <Badge
                                  variant="secondary"
                                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  Submitted
                                </Badge>
                              ) : null}
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"
                              >
                                <Link href={`/student/exams/${item.id}`}>Detail</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



