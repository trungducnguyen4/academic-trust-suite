import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Clock,
  CalendarClock,
  Eye,
  Edit2,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api, { unwrapPaginatedData } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Exam {
  id: string;
  title: string;
  description?: string;
  course: { id: string; code: string; name: string };
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

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

export default function ExamManagement() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    status: "all",
    courseId: "all",
    title: { value: "", operator: "contains" },
    duration: { min: undefined, max: undefined },
    createdAt: { from: undefined, to: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    status: "all",
    courseId: "all",
    title: { value: "", operator: "contains" },
    duration: { min: undefined, max: undefined },
    createdAt: { from: undefined, to: undefined },
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    passingScore: "",
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    startTime: "",
    endTime: "",
  });

  const toDatetimeLocalValue = (isoDate?: string) => {
    if (!isoDate) return "";
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return "";
    const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
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
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const [examData, courseData] = await Promise.all([
        api.getExams(),
        api.getMyCourses(),
      ]);
      setExams(unwrapPaginatedData(examData) || []);
      setCourses(
        (Array.isArray(courseData)
          ? courseData
          : unwrapPaginatedData(courseData)) || [],
      );
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
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

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setEditForm({
      title: exam.title,
      description: exam.description || "",
      passingScore: exam.passingScore?.toString() || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedExam) return;
    try {
      setIsUpdating(true);
      const updateData: any = {
        title: editForm.title,
        description: editForm.description,
      };
      if (editForm.passingScore) {
        updateData.passingScore = parseInt(editForm.passingScore, 10);
      }
      await api.updateExam(selectedExam.id, updateData);

      // Update local state
      setExams(
        exams.map((e) =>
          e.id === selectedExam.id ? { ...e, ...updateData } : e,
        ),
      );

      toast.success("Exam updated successfully");
      setShowEditDialog(false);
      setSelectedExam(null);
    } catch (error) {
      console.error("Failed to update exam:", error);
      toast.error("Failed to update exam");
    } finally {
      setIsUpdating(false);
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
      toast.error(
        `Schedule window must be at least ${selectedExam.duration} minutes`,
      );
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
        options: courses.map((course) => ({
          label: `${course.code} - ${course.name}`,
          value: course.id,
        })),
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Filter by title",
        operators: ["contains", "startsWith", "equals"],
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
        key: "createdAt",
        label: "Created At",
        type: "date-range",
      },
    ],
    [courses],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredExams = useMemo(() => {
    const statusValue = appliedFilters.status as string | undefined;
    const courseValue = appliedFilters.courseId as string | undefined;
    const titleFilter = appliedFilters.title as TextFilterValue | undefined;
    const durationFilter = appliedFilters.duration as
      | { min?: number; max?: number }
      | undefined;
    const createdAtRange = appliedFilters.createdAt as
      | { from?: string; to?: string }
      | undefined;

    const matchesText = (source: string, filter?: TextFilterValue) => {
      if (!filter || !filter.value.trim()) return true;
      const sourceValue = source.toLowerCase();
      const filterValue = filter.value.trim().toLowerCase();
      if (filter.operator === "startsWith") return sourceValue.startsWith(filterValue);
      if (filter.operator === "equals") return sourceValue === filterValue;
      return sourceValue.includes(filterValue);
    };

    return exams.filter((exam) => {
      const matchesSearch = !normalizedSearch
        ? true
        : [exam.title, exam.course.code, exam.course.name]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

      const matchesStatus =
        !statusValue || statusValue === "all" || exam.status === statusValue;
      const matchesCourse =
        !courseValue || courseValue === "all" || exam.course.id === courseValue;
      const matchesTitle = matchesText(exam.title, titleFilter);

      const matchesDuration = (() => {
        if (
          !durationFilter ||
          (durationFilter.min === undefined && durationFilter.max === undefined)
        ) {
          return true;
        }
        if (durationFilter.min !== undefined && exam.duration < durationFilter.min) {
          return false;
        }
        if (durationFilter.max !== undefined && exam.duration > durationFilter.max) {
          return false;
        }
        return true;
      })();

      const matchesCreatedAt = (() => {
        if (!createdAtRange || (!createdAtRange.from && !createdAtRange.to)) {
          return true;
        }
        const createdAt = new Date(exam.createdAt).getTime();
        if (Number.isNaN(createdAt)) return false;
        if (createdAtRange.from) {
          const fromTs = new Date(createdAtRange.from).getTime();
          if (!Number.isNaN(fromTs) && createdAt < fromTs) return false;
        }
        if (createdAtRange.to) {
          const toDate = new Date(createdAtRange.to);
          toDate.setHours(23, 59, 59, 999);
          const toTs = toDate.getTime();
          if (!Number.isNaN(toTs) && createdAt > toTs) return false;
        }
        return true;
      })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse &&
        matchesTitle &&
        matchesDuration &&
        matchesCreatedAt
      );
    });
  }, [appliedFilters, exams, normalizedSearch]);

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
      courseId: "all",
      title: { value: "", operator: "contains" },
      duration: { min: undefined, max: undefined },
      createdAt: { from: undefined, to: undefined },
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
      courseId: "all",
      title: { value: "", operator: "contains" },
      duration: { min: undefined, max: undefined },
      createdAt: { from: undefined, to: undefined },
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

  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / ITEMS_PER_PAGE));
  const EXAM_ROW_HEIGHT = 60;
  const EXAM_TABLE_HEADER_HEIGHT = 48;
  const EXAM_TABLE_MIN_HEIGHT =
    ITEMS_PER_PAGE * EXAM_ROW_HEIGHT + EXAM_TABLE_HEADER_HEIGHT;

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedExams = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredExams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExams, page]);

  const stats = {
    total: exams.length,
    published: exams.filter((e) => e.status === "PUBLISHED").length,
    ongoing: exams.filter((e) => e.status === "ONGOING").length,
    draft: exams.filter((e) => e.status === "DRAFT").length,
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
      <AdminPageShell backTo="/lecturer">
        <ListPageHeader
          title="Exam Management"
          actions={
            <Button
              onClick={() => navigate("/lecturer/exams/create")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Exam
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            icon={AlertCircle}
            value={stats.draft}
            label="Draft"
            iconWrapClassName="bg-gray-500/10"
            iconClassName="text-gray-600"
          />
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search exams, courses"
              className="flex-1"
            />
            <FilterPanel
              title="Exam filters"
              description="Filter by status, course, title, duration, and date."
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
          <CardContent>
            {filteredExams.length === 0 ? (
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
                    ? "Create your first exam to get started"
                    : "Try adjusting your filters"}
                </p>
                {exams.length === 0 && (
                  <Button
                    onClick={() => navigate("/lecturer/exams/create")}
                    className="mt-4"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam
                  </Button>
                )}
              </div>
            ) : (
              <div
                className="overflow-x-auto"
                style={{ minHeight: EXAM_TABLE_MIN_HEIGHT }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-w-sm">Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExams.map((exam) => {
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
                                {" "}
                                {exam.course.code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {exam.course.name}
                              </div>
                            </div>
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
                            <StatusBadge
                              status={exam.status}
                              domain="exam"
                              className="text-xs"
                            >
                              {exam.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(
                                      `/lecturer/exam/${exam.id}/preview`,
                                    )
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                {(exam.status === "ONGOING" ||
                                  exam.status === "PUBLISHED") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(
                                        `/lecturer/exam/${exam.id}/monitor`,
                                      )
                                    }
                                    className="gap-2"
                                  >
                                    <Clock className="h-4 w-4" />
                                    Monitor
                                  </DropdownMenuItem>
                                )}
                                {(exam.status === "COMPLETED" ||
                                  (exam._count?.submissions ?? 0) > 0) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(
                                        `/lecturer/exam/${exam.id}/results`,
                                      )
                                    }
                                    className="gap-2"
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                    Results
                                  </DropdownMenuItem>
                                )}
                                {(exam.status === "DRAFT" ||
                                  exam.status === "PUBLISHED") && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRescheduleDialog(exam)}
                                    className="gap-2"
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                    Reschedule
                                  </DropdownMenuItem>
                                )}
                                {exam.status === "DRAFT" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEditExam(exam)}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedExam(exam);
                                        setShowDeleteDialog(true);
                                      }}
                                      className="gap-2 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
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
          </CardContent>
          <DataPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredExams.length}
            onPageChange={setPage}
            itemLabel="exams"
          />
        </Card>
      </AdminPageShell>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
            <DialogDescription>Update exam details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Exam title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Exam description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={editForm.passingScore}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    passingScore: e.target.value,
                  }))
                }
                placeholder="Passing score (0-100)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Exam</DialogTitle>
            <DialogDescription>
              Update the start and end time for "{selectedExam?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rescheduleStartTime">Start time</Label>
              <Input
                id="rescheduleStartTime"
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
              <Label htmlFor="rescheduleEndTime">End time</Label>
              <Input
                id="rescheduleEndTime"
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedExam?.title}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExam}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
