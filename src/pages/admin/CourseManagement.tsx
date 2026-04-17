import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import api, { unwrapPaginatedData } from "@/lib/api";
import {
  COURSE_TERM_OPTIONS,
  CourseTerm,
  formatCourseTerm,
  getAcademicYearOptions,
  getDefaultAcademicYear,
} from "@/lib/course-term";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { useAuth } from "@/contexts/AuthContext";

interface Lecturer {
  id: string;
  fullName: string;
  email: string;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  academicYear?: string;
  term?: CourseTerm;
  semester?: string;
  description?: string;
  credits?: number;
  status?: string;
  lecturerId?: string | null;
  lecturer?: Lecturer | null;
  _count?: {
    enrollments?: number;
    exams?: number;
  };
}

interface CourseForm {
  name: string;
  academicYear: string;
  term: CourseTerm;
  description: string;
  credits: string;
  lecturerId: string;
}

const defaultTerm: CourseTerm = "TERM_2";
const academicYearOptions = getAcademicYearOptions();

const defaultForm: CourseForm = {
  name: "",
  academicYear: getDefaultAcademicYear(),
  term: defaultTerm,
  description: "",
  credits: "",
  lecturerId: "unassigned",
};

const toAsciiUpper = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toUpperCase();

const buildToken = (value: string, maxLength: number, fallback: string) => {
  const compact = toAsciiUpper(value).split(/\s+/).filter(Boolean).join("");
  return (compact.slice(0, maxLength) || fallback).toUpperCase();
};

const EMPTY_FILTERS: FilterValues = {
  status: "all",
  lecturerId: "all",
  academicYear: { value: "", operator: "contains" },
  term: "all",
  credits: { min: undefined, max: undefined },
};

export default function AdminCourseManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CourseForm>(defaultForm);
  const [editForm, setEditForm] = useState<CourseForm>(defaultForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, lecturersRes] = await Promise.all([
        api.getCourses({ page: 1, limit: 200 }),
        api.getLecturers(),
      ]);

      setCourses(unwrapPaginatedData<CourseItem>(coursesRes));
      setLecturers(lecturersRes || []);
    } catch (error) {
      console.error("Failed to load course management data", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load courses",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const courseFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        allLabel: "All Status",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
        ],
      },
      {
        key: "lecturerId",
        label: "Lecturer",
        type: "select",
        allLabel: "All Lecturers",
        options: lecturers.map((lecturer) => ({
          label: lecturer.fullName,
          value: lecturer.id,
        })),
      },
      {
        key: "academicYear",
        label: "Academic year",
        type: "text",
        placeholder: "Filter by academic year",
        operators: ["contains", "startsWith", "equals"],
        defaultOperator: "contains",
      },
      {
        key: "term",
        label: "Term",
        type: "select",
        allLabel: "All Terms",
        options: COURSE_TERM_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        key: "credits",
        label: "Credits",
        type: "number-range",
        min: 0,
        max: 10,
        step: 1,
      },
    ],
    [lecturers],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();

  const filteredCourses = useMemo(() => {
    const academicYearFilter = appliedFilters.academicYear as
      | TextFilterValue
      | undefined;
    const termFilter = appliedFilters.term as string | undefined;
    const creditsFilter = appliedFilters.credits as
      | { min?: number; max?: number }
      | undefined;
    const statusValue = appliedFilters.status as string | undefined;
    const lecturerValue = appliedFilters.lecturerId as string | undefined;

    const matchesText = (
      source: string | undefined,
      filter?: TextFilterValue,
    ) => {
      if (!filter || !filter.value.trim()) return true;
      const sourceValue = (source || "").toLowerCase();
      const filterValue = filter.value.trim().toLowerCase();
      if (filter.operator === "startsWith")
        return sourceValue.startsWith(filterValue);
      if (filter.operator === "equals") return sourceValue === filterValue;
      return sourceValue.includes(filterValue);
    };

    return courses.filter((course) => {
      const termLabel = formatCourseTerm(
        course.academicYear,
        course.term,
        course.semester,
      );
      const matchesSearch = !normalizedSearch
        ? true
        : [
            course.code,
            course.name,
            termLabel,
            course.lecturer?.fullName || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

      const matchesStatus =
        !statusValue ||
        statusValue === "all" ||
        (course.status || "draft") === statusValue;
      const matchesLecturer =
        !lecturerValue ||
        lecturerValue === "all" ||
        course.lecturerId === lecturerValue;
      const matchesAcademicYear = matchesText(
        course.academicYear,
        academicYearFilter,
      );
      const matchesTerm =
        !termFilter || termFilter === "all" || course.term === termFilter;
      const matchesCredits = (() => {
        if (
          !creditsFilter ||
          (creditsFilter.min === undefined && creditsFilter.max === undefined)
        )
          return true;
        const credits = course.credits;
        if (credits === undefined || credits === null) return false;
        if (creditsFilter.min !== undefined && credits < creditsFilter.min)
          return false;
        if (creditsFilter.max !== undefined && credits > creditsFilter.max)
          return false;
        return true;
      })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLecturer &&
        matchesAcademicYear &&
        matchesTerm &&
        matchesCredits
      );
    });
  }, [courses, normalizedSearch, appliedFilters]);

  const [page, setPage] = useState(1);
  const COURSE_ROWS_PER_VIEW = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSE_ROWS_PER_VIEW));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const displayedCourses = useMemo(
    () => {
      const start = (page - 1) * COURSE_ROWS_PER_VIEW;
      return filteredCourses.slice(start, start + COURSE_ROWS_PER_VIEW);
    },
    [filteredCourses, page],
  );
  const COURSE_ROW_HEIGHT = 72;
  const COURSE_TABLE_HEADER_HEIGHT = 48;
  const COURSE_TABLE_MIN_HEIGHT =
    COURSE_ROWS_PER_VIEW * COURSE_ROW_HEIGHT + COURSE_TABLE_HEADER_HEIGHT;

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    courseFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(
    appliedFilters,
    courseFilterDefinitions,
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

  const courseStats = useMemo(() => {
    const totalCourses = filteredCourses.length;
    const assignedLecturers = courses.filter((course) =>
      Boolean(course.lecturerId),
    ).length;
    const totalEnrollments = courses.reduce(
      (sum, course) => sum + (course._count?.enrollments || 0),
      0,
    );
    const activeCourses = courses.filter(
      (course) => (course.status || "draft").toLowerCase() !== "archived",
    ).length;

    return {
      totalCourses,
      assignedLecturers,
      totalEnrollments,
      activeCourses,
    };
  }, [courses]);

  const toPayload = (form: CourseForm, allowUnassign = false) => ({
    name: form.name.trim(),
    academicYear: form.academicYear.trim() || undefined,
    term: form.term || undefined,
    description: form.description.trim() || undefined,
    credits: form.credits ? Number(form.credits) : undefined,
    lecturerId:
      form.lecturerId === "unassigned"
        ? allowUnassign
          ? null
          : undefined
        : form.lecturerId,
  });

  const getPreviewCode = (courseName: string) => {
    const courseToken = buildToken(courseName, 6, "COURSE");
    const creatorToken = buildToken(
      user?.fullName || user?.email || "",
      4,
      "USER",
    );
    return `${courseToken}-${creatorToken}-XX`;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await api.createCourse(toPayload(createForm));
      setCourses((prev) => [created, ...prev]);
      setCreateForm(defaultForm);
      setShowCreateDialog(false);
      toast.success("Course created successfully");
    } catch (error) {
      console.error("Failed to create course", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create course",
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (course: CourseItem) => {
    setEditingCourseId(course.id);
    setEditForm({
      name: course.name,
      academicYear: course.academicYear || getDefaultAcademicYear(),
      term: course.term || defaultTerm,
      description: course.description || "",
      credits: course.credits ? String(course.credits) : "",
      lecturerId: course.lecturerId || "unassigned",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingCourseId) return;

    setSaving(true);
    try {
      const updated = await api.updateCourse(
        editingCourseId,
        toPayload(editForm, true),
      );
      setCourses((prev) =>
        prev.map((item) => (item.id === editingCourseId ? updated : item)),
      );
      setShowEditDialog(false);
      setEditingCourseId(null);
      toast.success("Course updated successfully");
    } catch (error) {
      console.error("Failed to update course", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update course",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCourse(id);
      setCourses((prev) => prev.filter((item) => item.id !== id));
      toast.success("Course deleted successfully");
    } catch (error) {
      console.error("Failed to delete course", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete course",
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const renderForm = (
    form: CourseForm,
    onChange: (patch: Partial<CourseForm>) => void,
  ) => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="course-code">Course Code (auto-generated)</Label>
          <Input
            id="course-code"
            value={getPreviewCode(form.name)}
            disabled
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academicYear">Academic year</Label>
          <Select
            value={form.academicYear}
            onValueChange={(value) => onChange({ academicYear: value })}
          >
            <SelectTrigger id="academicYear">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="course-name">Course Name *</Label>
          <Input
            id="course-name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="term">Term</Label>
          <Select
            value={form.term}
            onValueChange={(value) =>
              onChange({ term: value as CourseTerm })
            }
          >
            <SelectTrigger id="term">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {COURSE_TERM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="credits">Credits</Label>
        <Input
          id="credits"
          type="number"
          min={1}
          max={10}
          value={form.credits}
          onChange={(e) => onChange({ credits: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lecturer">Lecturer</Label>
        <Select
          value={form.lecturerId}
          onValueChange={(value) => onChange({ lecturerId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select lecturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {lecturers.map((lecturer) => (
              <SelectItem key={lecturer.id} value={lecturer.id}>
                {lecturer.fullName} ({lecturer.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <AdminPageShell>
        <ListPageHeader
          title="All Courses"
          actions={
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Course</DialogTitle>
                  <DialogDescription>
                    Fill course information and optionally assign a lecturer.
                  </DialogDescription>
                </DialogHeader>

                {renderForm(createForm, (patch) =>
                  setCreateForm((prev) => ({ ...prev, ...patch })),
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={
                      saving ||
                      !createForm.name.trim() ||
                      !createForm.academicYear.trim() ||
                      !createForm.term
                    }
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={BookOpen}
            value={courseStats.totalCourses}
            label="Total Courses"
            iconWrapClassName="bg-blue-500/10"
            iconClassName="text-blue-600"
          />
          <AdminStatCard
            icon={GraduationCap}
            value={courseStats.assignedLecturers}
            label="Assigned Lecturers"
            iconWrapClassName="bg-violet-500/10"
            iconClassName="text-violet-600"
          />
          <AdminStatCard
            icon={Users}
            value={courseStats.totalEnrollments}
            label="Total Enrollments"
            iconWrapClassName="bg-emerald-500/10"
            iconClassName="text-emerald-600"
          />
          <AdminStatCard
            icon={Pencil}
            value={courseStats.activeCourses}
            label="Active Courses"
            iconWrapClassName="bg-amber-500/10"
            iconClassName="text-amber-600"
          />
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search by code, name, academic year, term, or lecturer"
              className="flex-1"
            />
            <FilterPanel
              title="Course filters"
              description="Filter courses by status, lecturer, academic year, term, and credits."
              filters={courseFilterDefinitions}
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
          <CardContent className="p-0">
            <div
              className="overflow-hidden"
              style={{ minHeight: COURSE_TABLE_MIN_HEIGHT }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Lecturer</TableHead>
                    <TableHead className="text-center min-w-20">
                      Students
                    </TableHead>
                    <TableHead className="text-center min-w-20">
                      Exams
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCourses.length > 0 ? (
                    displayedCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-mono font-medium">
                          {course.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {course.name}
                        </TableCell>
                        <TableCell>
                          {formatCourseTerm(
                            course.academicYear,
                            course.term,
                            course.semester,
                          )}
                        </TableCell>
                        <TableCell>
                          {course.lecturer ? (
                            <div className="text-sm">
                              <p className="font-medium">
                                {course.lecturer.fullName}
                              </p>
                              <p className="text-muted-foreground">
                                {course.lecturer.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {course._count?.enrollments || 0}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {course._count?.exams || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {(course.status || "draft").toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/admin/course/${course.id}`)
                              }
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(course)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmActionDialog
                              title="Delete course"
                              description="This action cannot be undone. The course will be removed if no dependent data blocks deletion."
                              confirmText="Delete"
                              destructive
                              onConfirm={() => handleDelete(course.id)}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmActionDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No course found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredCourses.length}
              onPageChange={setPage}
              itemLabel="courses"
            />
          </CardContent>
        </Card>
      </AdminPageShell>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and lecturer assignment.
            </DialogDescription>
          </DialogHeader>

          {renderForm(editForm, (patch) =>
            setEditForm((prev) => ({ ...prev, ...patch })),
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                saving ||
                !editForm.name.trim() ||
                !editForm.academicYear.trim() ||
                !editForm.term
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
