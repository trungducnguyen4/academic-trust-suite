import { useState, useEffect, useMemo } from "react";
import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Users,
  Clock,
  CalendarClock,
  Eye,
  Trash2,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api, { unwrapPaginatedData } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
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

interface Exam {
  id: string;
  title: string;
  description?: string;
  course: { id: string; code: string; name: string };
  creator: { id: string; fullName: string };
  status: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "ARCHIVED";
  duration: number;
  totalPoints?: number;
  passingScore?: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  _count?: {
    examQuestions: number;
    submissions: number;
  };
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  DRAFT: { label: "Draft", variant: "default" },
  PUBLISHED: { label: "Published", variant: "secondary" },
  ONGOING: { label: "Ongoing", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "destructive" },
};

const EMPTY_FILTERS: FilterValues = {
  status: "all",
  courseId: "all",
  creatorId: "all",
  duration: { min: undefined, max: undefined },
  totalPoints: { min: undefined, max: undefined },
  createdAt: { from: undefined, to: undefined },
  title: { value: "", operator: "contains" },
};

export default function AdminExamManagement() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    startTime: "",
    endTime: "",
  });
  const [courses, setCourses] = useState<any[]>([]);

  const toDatetimeLocalValue = (isoDate?: string) => {
    if (!isoDate) return "";
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return "";
    const localDate = new Date(
      parsed.getTime() - parsed.getTimezoneOffset() * 60000,
    );
    return localDate.toISOString().slice(0, 16);
  };

  const formatExamMetadata = (exam: Exam) => {
    const parts = [];
    if (exam.duration) parts.push(`${exam.duration} min`);
    if (exam._count?.examQuestions) parts.push(`${exam._count.examQuestions} Q`);
    if (exam._count?.submissions) parts.push(`${exam._count.submissions} submissions`);
    const createdAgo = formatDistanceToNow(new Date(exam.createdAt), { addSuffix: false });
    if (createdAgo) parts.push(`created ${createdAgo} ago`);
    return parts.join(" • ");
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsData, coursesData] = await Promise.all([
        api.getExams(),
        api.getCourses(),
      ]);
      const exams = unwrapPaginatedData(examsData);
      const courses = unwrapPaginatedData(coursesData);
      setExams(exams || []);
      setCourses(courses || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const examFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
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
          { label: "Archived", value: "ARCHIVED" },
        ],
      },
      {
        key: "courseId",
        label: "Course",
        type: "select",
        allLabel: "All Courses",
        options: courses.map((course: any) => ({
          label: `${course.code} - ${course.name}`,
          value: course.id,
        })),
      },
      {
        key: "creatorId",
        label: "Creator",
        type: "select",
        allLabel: "All Creators",
        options: Array.from(
          new Map(
            exams.map((exam) => [exam.creator.id, exam.creator.fullName]),
          ).entries(),
        ).map(([value, label]) => ({ label, value })),
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Filter by title",
        operators: ["contains", "startsWith", "equals"],
        defaultOperator: "contains",
      },
      {
        key: "duration",
        label: "Duration (min)",
        type: "number-range",
        min: 0,
        max: 300,
        step: 5,
      },
      {
        key: "totalPoints",
        label: "Total Points",
        type: "number-range",
        min: 0,
        max: 500,
        step: 1,
      },
      {
        key: "createdAt",
        label: "Created At",
        type: "date-range",
      },
    ],
    [courses, exams],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();

  const filteredExams = useMemo(() => {
    const statusValue = appliedFilters.status as string | undefined;
    const courseValue = appliedFilters.courseId as string | undefined;
    const creatorValue = appliedFilters.creatorId as string | undefined;
    const titleFilter = appliedFilters.title as TextFilterValue | undefined;
    const durationFilter = appliedFilters.duration as
      | { min?: number; max?: number }
      | undefined;
    const totalPointsFilter = appliedFilters.totalPoints as
      | { min?: number; max?: number }
      | undefined;
    const createdAtRange = appliedFilters.createdAt as
      | { from?: string; to?: string }
      | undefined;

    const matchesText = (source: string, filter?: TextFilterValue) => {
      if (!filter || !filter.value.trim()) return true;
      const sourceValue = source.toLowerCase();
      const filterValue = filter.value.trim().toLowerCase();
      if (filter.operator === "startsWith")
        return sourceValue.startsWith(filterValue);
      if (filter.operator === "equals") return sourceValue === filterValue;
      return sourceValue.includes(filterValue);
    };

    return exams.filter((exam) => {
      const matchesSearch = !normalizedSearch
        ? true
        : [
            exam.title,
            exam.course.code,
            exam.course.name,
            exam.creator.fullName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      const matchesStatus =
        !statusValue || statusValue === "all" || exam.status === statusValue;
      const matchesCourse =
        !courseValue || courseValue === "all" || exam.course.id === courseValue;
      const matchesCreator =
        !creatorValue ||
        creatorValue === "all" ||
        exam.creator.id === creatorValue;
      const matchesTitle = matchesText(exam.title, titleFilter);
      const matchesDuration = (() => {
        if (
          !durationFilter ||
          (durationFilter.min === undefined && durationFilter.max === undefined)
        )
          return true;
        if (
          durationFilter.min !== undefined &&
          exam.duration < durationFilter.min
        )
          return false;
        if (
          durationFilter.max !== undefined &&
          exam.duration > durationFilter.max
        )
          return false;
        return true;
      })();
      const matchesPoints = (() => {
        if (
          !totalPointsFilter ||
          (totalPointsFilter.min === undefined &&
            totalPointsFilter.max === undefined)
        )
          return true;
        if (exam.totalPoints === undefined || exam.totalPoints === null)
          return false;
        if (
          totalPointsFilter.min !== undefined &&
          exam.totalPoints < totalPointsFilter.min
        )
          return false;
        if (
          totalPointsFilter.max !== undefined &&
          exam.totalPoints > totalPointsFilter.max
        )
          return false;
        return true;
      })();
      const matchesCreatedAt = (() => {
        if (!createdAtRange?.from && !createdAtRange?.to) return true;
        const createdAt = new Date(exam.createdAt).getTime();
        if (createdAtRange.from) {
          const from = new Date(createdAtRange.from).getTime();
          if (!Number.isNaN(from) && createdAt < from) return false;
        }
        if (createdAtRange.to) {
          const to = new Date(createdAtRange.to).getTime();
          if (!Number.isNaN(to) && createdAt > to) return false;
        }
        return true;
      })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse &&
        matchesCreator &&
        matchesTitle &&
        matchesDuration &&
        matchesPoints &&
        matchesCreatedAt
      );
    });
  }, [exams, normalizedSearch, appliedFilters]);

  const [page, setPage] = useState(1);
  const EXAM_ROWS_PER_VIEW = 10;
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAM_ROWS_PER_VIEW));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const displayedExams = useMemo(
    () => {
      const start = (page - 1) * EXAM_ROWS_PER_VIEW;
      return filteredExams.slice(start, start + EXAM_ROWS_PER_VIEW);
    },
    [filteredExams, page],
  );
  const EXAM_ROW_HEIGHT = 60;
  const EXAM_TABLE_HEADER_HEIGHT = 48;
  const EXAM_TABLE_MIN_HEIGHT =
    EXAM_ROWS_PER_VIEW * EXAM_ROW_HEIGHT + EXAM_TABLE_HEADER_HEIGHT;

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    examFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(
    appliedFilters,
    examFilterDefinitions,
  );

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const removeFilter = (key: string) => {
    const nextFilters = {
      ...appliedFilters,
      [key]: EMPTY_FILTERS[key as keyof typeof EMPTY_FILTERS],
    };
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    try {
      setIsDeleting(true);
      await api.deleteExam(selectedExam.id);
      setExams(exams.filter((e) => e.id !== selectedExam.id));
      toast.success("Exam deleted successfully");
      setShowDeleteDialog(false);
      setSelectedExam(null);
    } catch (error) {
      console.error("Failed to delete exam:", error);
      toast.error("Failed to delete exam");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenRescheduleDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setRescheduleForm({
      startTime: toDatetimeLocalValue(exam.startTime),
      endTime: toDatetimeLocalValue(exam.endTime),
    });
    setShowRescheduleDialog(true);
  };

  const handleSaveReschedule = async () => {
    if (!selectedExam) return;

    if (!rescheduleForm.startTime || !rescheduleForm.endTime) {
      toast.error("Please provide both start and end time");
      return;
    }

    const startTime = new Date(rescheduleForm.startTime);
    const endTime = new Date(rescheduleForm.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      toast.error("Invalid schedule date/time");
      return;
    }

    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    if ((endTime.getTime() - startTime.getTime()) / 60000 < selectedExam.duration) {
      toast.error(`Schedule window must be at least ${selectedExam.duration} minutes`);
      return;
    }

    try {
      setIsRescheduling(true);
      await api.rescheduleExam(selectedExam.id, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      setExams((prev) =>
        prev.map((exam) =>
          exam.id === selectedExam.id
            ? {
                ...exam,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              }
            : exam,
        ),
      );

      toast.success("Exam schedule updated successfully");
      setShowRescheduleDialog(false);
      setSelectedExam(null);
    } catch (error) {
      console.error("Failed to reschedule exam:", error);
      toast.error("Failed to reschedule exam");
    } finally {
      setIsRescheduling(false);
    }
  };

  const stats = {
    total: exams.length,
    published: exams.filter((e) => e.status === "PUBLISHED").length,
    ongoing: exams.filter((e) => e.status === "ONGOING").length,
    submissions: exams.reduce(
      (sum, e) => sum + (e._count?.submissions || 0),
      0,
    ),
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading exams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <ListPageHeader title="All Exams" className="mb-4" />

        {/* Stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={FileText}
            value={stats.total}
            label="Total Exams"
          />
          <AdminStatCard
            icon={CheckCircle2}
            value={stats.published}
            label="Published"
            iconWrapClassName="bg-blue-500/10"
            iconClassName="text-blue-600"
          />
          <AdminStatCard
            icon={Clock}
            value={stats.ongoing}
            label="Ongoing"
            iconWrapClassName="bg-amber-500/10"
            iconClassName="text-amber-600"
          />
          <AdminStatCard
            icon={Users}
            value={stats.submissions}
            label="Total Submissions"
            iconWrapClassName="bg-emerald-500/10"
            iconClassName="text-emerald-600"
          />
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search exams, courses, or lecturers"
              className="flex-1"
            />
            <FilterPanel
              title="Exam filters"
              description="Filter by status, course, creator, duration, points, and created date."
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

        {/* Exam List */}
        <Card>
          <CardContent className="p-0">
            {displayedExams.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center px-6 py-12 text-center"
                style={{ minHeight: EXAM_TABLE_MIN_HEIGHT }}
              >
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground font-medium">
                  {exams.length === 0
                    ? "No exams created yet"
                    : "No exams match your filters"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {exams.length === 0
                    ? "Exams will appear here once lecturers create them"
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <div
                className="overflow-hidden"
                style={{ minHeight: EXAM_TABLE_MIN_HEIGHT }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-w-sm">Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lecturer</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedExams.map((exam) => {
                      const createdAgo = formatDistanceToNow(
                        new Date(exam.createdAt),
                        { addSuffix: true },
                      );
                      return (
                        <TableRow key={exam.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div>
                              <div className="truncate">{exam.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatExamMetadata(exam)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-mono">
                                {exam.course.code}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {exam.course.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {exam.creator.fullName}
                          </TableCell>
                          <TableCell className="max-w-[14rem]">
                            <div className="text-xs text-muted-foreground leading-5">
                              {exam.startTime ? (
                                <div className="truncate">
                                  <span className="font-medium">Start:</span>{" "}
                                  {new Date(exam.startTime).toLocaleString()}
                                </div>
                              ) : (
                                <div className="truncate">Start: Not scheduled</div>
                              )}
                              {exam.endTime ? (
                                <div className="truncate">
                                  <span className="font-medium">End:</span>{" "}
                                  {new Date(exam.endTime).toLocaleString()}
                                </div>
                              ) : (
                                <div className="truncate">End: Not scheduled</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                statusConfig[exam.status]?.variant || "default"
                              }
                              className="text-xs"
                            >
                              {statusConfig[exam.status]?.label || exam.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2 text-xs">
                                  <Eye className="h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                {(exam.status === "ONGOING" ||
                                  exam.status === "PUBLISHED") && (
                                  <DropdownMenuItem className="gap-2 text-xs">
                                    <Clock className="h-4 w-4" />
                                    Monitor
                                  </DropdownMenuItem>
                                )}
                                {(exam.status === "COMPLETED" ||
                                  (exam._count?.submissions ?? 0) > 0) && (
                                  <DropdownMenuItem className="gap-2 text-xs">
                                    <BarChart3 className="h-4 w-4" />
                                    Results
                                  </DropdownMenuItem>
                                )}
                                {(exam.status === "DRAFT" ||
                                  exam.status === "PUBLISHED") && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRescheduleDialog(exam)}
                                    className="gap-2 text-xs"
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                    Reschedule
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedExam(exam);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="gap-2 text-destructive text-xs"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredExams.length}
              onPageChange={setPage}
              itemLabel="exams"
            />
          </CardContent>
        </Card>
      </AdminPageShell>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Exam</DialogTitle>
            <DialogDescription>
              Update start and end time for "{selectedExam?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminRescheduleStartTime">Start time</Label>
              <Input
                id="adminRescheduleStartTime"
                type="datetime-local"
                value={rescheduleForm.startTime}
                onChange={(e) =>
                  setRescheduleForm((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminRescheduleEndTime">End time</Label>
              <Input
                id="adminRescheduleEndTime"
                type="datetime-local"
                value={rescheduleForm.endTime}
                onChange={(e) =>
                  setRescheduleForm((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The exam window must be at least the configured duration.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRescheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveReschedule} disabled={isRescheduling}>
              {isRescheduling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedExam?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
