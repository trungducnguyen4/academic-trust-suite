import { useState, useEffect, useMemo } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Users,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, unwrapPaginatedData } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { CourseTerm, COURSE_TERM_OPTIONS, formatCourseTerm } from "@/lib/course-term";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  id: string;
  code: string;
  name: string;
  department?: string;
  faculty?: string;
  academicYear?: string;
  term?: CourseTerm;
  semester?: string;
  enrolledStudents?: number;
  totalStudents?: number;
  progress?: number;
  lastAccessed?: string;
  _count?: {
    enrollments?: number;
    exams?: number;
  };
}

interface GroupedCourses {
  [faculty: string]: Course[];
}

const EMPTY_FILTERS: FilterValues = {
  faculty: "all",
  examState: "all",
  academicYear: { value: "", operator: "contains" },
  term: "all",
  students: { min: undefined, max: undefined },
};

const gradientClasses = [
  "bg-gradient-to-br from-pink-400 to-pink-600",
  "bg-gradient-to-br from-purple-400 to-indigo-600",
  "bg-gradient-to-br from-blue-400 to-cyan-600",
  "bg-gradient-to-br from-green-400 to-emerald-600",
  "bg-gradient-to-br from-yellow-400 to-orange-600",
  "bg-gradient-to-br from-red-400 to-pink-600",
  "bg-gradient-to-br from-gray-400 to-gray-600",
];

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Use my-courses which returns aggregated fields from the backend
      const raw = await api.getMyCourses();
      // Normalise: backend returns array directly (not paginated)
      const safeRelativeTime = (raw: any): string => {
        if (!raw) return "—";
        const d = new Date(raw);
        if (isNaN(d.getTime())) return "—";
        return formatDistanceToNow(d, { addSuffix: true });
      };

      const list: Course[] = (
        Array.isArray(raw) ? raw : unwrapPaginatedData(raw)
      ).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        faculty: c.faculty ?? c.department ?? "General",
        department: c.department,
        academicYear: c.academicYear,
        term: c.term,
        semester: c.semester,
        enrolledStudents: c.enrolledStudents ?? c._count?.enrollments ?? 0,
        totalStudents: c.totalStudents ?? c._count?.enrollments ?? 0,
        progress: c.progress ?? 0,
        lastAccessed: safeRelativeTime(c.lastAccessed),
        _count: {
          enrollments: c._count?.enrollments ?? 0,
          exams: c._count?.exams ?? 0,
        },
      }));
      setCourses(list);
      setRecentCourses(list.slice(0, 2));
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupCoursesByFaculty = (courses: Course[]): GroupedCourses => {
    return courses.reduce((acc, course) => {
      const faculty = course.faculty || "Other";
      if (!acc[faculty]) {
        acc[faculty] = [];
      }
      acc[faculty].push(course);
      return acc;
    }, {} as GroupedCourses);
  };

  const getGradientClass = (index: number): string => {
    return gradientClasses[index % gradientClasses.length];
  };

  const courseFilterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: "faculty",
        label: "Faculty",
        type: "select",
        allLabel: "All Faculties",
        options: Array.from(
          new Set(courses.map((course) => course.faculty || "General")),
        ).map((faculty) => ({
          label: faculty,
          value: faculty,
        })),
      },
      {
        key: "examState",
        label: "Exam State",
        type: "select",
        allLabel: "All Courses",
        options: [
          { label: "Has Exams", value: "hasExams" },
          { label: "No Exams", value: "noExams" },
        ],
      },
      {
        key: "academicYear",
        label: "Academic year",
        type: "text",
        operators: ["contains", "startsWith", "equals"],
        placeholder: "Filter by academic year",
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
        key: "students",
        label: "Students",
        type: "number-range",
        min: 0,
        max: 500,
        step: 1,
      },
    ],
    [courses],
  );

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredCourses = useMemo(() => {
    const facultyFilter = appliedFilters.faculty as string | undefined;
    const examStateFilter = appliedFilters.examState as string | undefined;
    const academicYearFilter = appliedFilters.academicYear as
      | TextFilterValue
      | undefined;
    const termFilter = appliedFilters.term as string | undefined;
    const studentsFilter = appliedFilters.students as
      | { min?: number; max?: number }
      | undefined;

    const matchText = (source: string | undefined, filter?: TextFilterValue) => {
      if (!filter || !filter.value.trim()) return true;
      const sourceValue = (source || "").toLowerCase();
      const filterValue = filter.value.trim().toLowerCase();
      if (filter.operator === "startsWith") return sourceValue.startsWith(filterValue);
      if (filter.operator === "equals") return sourceValue === filterValue;
      return sourceValue.includes(filterValue);
    };

    return courses.filter((course) => {
      const termLabel = formatCourseTerm(
        course.academicYear,
        course.term,
        course.semester,
      );
      const searchMatched = !normalizedSearch
        ? true
        : [course.code, course.name, course.faculty, termLabel]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
      if (!searchMatched) return false;

      if (
        facultyFilter &&
        facultyFilter !== "all" &&
        (course.faculty || "General") !== facultyFilter
      ) {
        return false;
      }

      const courseExams = course._count?.exams || 0;
      if (examStateFilter === "hasExams" && courseExams === 0) return false;
      if (examStateFilter === "noExams" && courseExams > 0) return false;

      if (!matchText(course.academicYear, academicYearFilter)) return false;

      if (termFilter && termFilter !== "all" && course.term !== termFilter) {
        return false;
      }

      if (
        studentsFilter &&
        (studentsFilter.min !== undefined || studentsFilter.max !== undefined)
      ) {
        const totalStudents = course._count?.enrollments || 0;
        if (studentsFilter.min !== undefined && totalStudents < studentsFilter.min) {
          return false;
        }
        if (studentsFilter.max !== undefined && totalStudents > studentsFilter.max) {
          return false;
        }
      }

      return true;
    });
  }, [appliedFilters, courses, normalizedSearch]);

  const groupedCourses = groupCoursesByFaculty(filteredCourses);

  const COURSES_PER_PAGE = 12;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / COURSES_PER_PAGE),
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * COURSES_PER_PAGE;
    return filteredCourses.slice(start, start + COURSES_PER_PAGE);
  }, [filteredCourses, page]);

  const paginatedGrouped = groupCoursesByFaculty(paginatedCourses);

  const totalStudents = courses.reduce(
    (sum, course) => sum + (course._count?.enrollments ?? 0),
    0,
  );
  const totalExams = courses.reduce(
    (sum, course) => sum + (course._count?.exams ?? 0),
    0,
  );
  const facultiesCount = Object.keys(groupedCourses).length;

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    courseFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(appliedFilters, courseFilterDefinitions);

  const runSearch = () => setAppliedSearch(searchInput.trim());
  const applyFilters = () => setAppliedFilters(draftFilters);
  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSearchInput("");
    setAppliedSearch("");
  };
  const removeFilter = (key: string) => {
    const next = {
      ...appliedFilters,
      [key]: EMPTY_FILTERS[key as keyof typeof EMPTY_FILTERS],
    };
    setAppliedFilters(next);
    setDraftFilters(next);
  };

  return (
    <DashboardLayout>
      <AdminPageShell backTo="/lecturer">
        <ListPageHeader
          title="Course Management"
          actions={
            <div className="flex items-center gap-3">
              <Select
                value={viewMode}
                onValueChange={(value: "card" | "list") => setViewMode(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild className="gap-2">
                <Link to="/lecturer/courses">
                  <Plus className="h-4 w-4" />
                  Add Course
                </Link>
              </Button>
            </div>
          }
        />

        {/* Quick stats */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard icon={BookOpen} value={courses.length} label="Total Courses" />
            <AdminStatCard icon={Users} value={totalStudents} label="Total Students" />
            <AdminStatCard icon={Clock} value={totalExams} label="Total Exams" />
            <AdminStatCard
              icon={Filter}
              value={facultiesCount}
              label="Faculties"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search by code, name, faculty, academic year, or term"
              className="flex-1"
            />
            <FilterPanel
              title="Course filters"
              description="Filter by faculty, exam state, academic year, term, and student range."
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
        </section>

        {/* Recently Accessed Courses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recently accessed courses</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentCourses.map((course, index) => (
              <Card key={course.id} className="overflow-hidden">
                <div className={`h-32 ${getGradientClass(index)} relative`}>
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {course.faculty}
                        </p>
                        <h3 className="font-medium">{course.code}</h3>
                        <p className="text-sm text-muted-foreground">
                          {course.name}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-1 py-2 border-t border-b border-border text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-base font-semibold text-foreground">
                          {course._count?.enrollments || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Students
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-base font-semibold text-foreground">
                          {course._count?.exams || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Exams
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-xs font-medium text-foreground line-clamp-1">
                          {course.lastAccessed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Accessed
                        </div>
                      </div>
                    </div>

                    {course.progress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{course.progress}% complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Course Overview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Course overview</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                All (except removed from view)
              </Button>
              <Select defaultValue="name">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Course name</SelectItem>
                  <SelectItem value="code">Course code</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="card">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(paginatedGrouped).map(
                ([faculty, facultyCourses]) => (
                  <div key={faculty}>
                    <h3 className="text-lg font-medium mb-4 text-foreground">
                      {faculty}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {facultyCourses.map((course, index) => (
                        <Card
                          key={course.id}
                          className="overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div
                            className={`h-24 ${getGradientClass(index)} relative`}
                          >
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute top-3 right-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium text-sm">
                                  {course.code}
                                </h4>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {course.name}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="text-lg font-semibold text-foreground">
                                    {course._count?.enrollments || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <Users className="h-3 w-3" />
                                    <span>Students</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                  <div className="text-lg font-semibold text-foreground">
                                    {course._count?.exams || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <BookOpen className="h-3 w-3" />
                                    <span>Exams</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                  <div className="text-xs font-medium text-foreground text-center">
                                    {course.lastAccessed}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span>Accessed</span>
                                  </div>
                                </div>
                              </div>

                              {course.progress && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>{course.progress}% complete</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{ width: `${course.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Link to={`/lecturer/course/${course.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {filteredCourses.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No courses match current search/filter.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DataPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredCourses.length}
            onPageChange={setPage}
            itemLabel="courses"
            className="border-t-0 px-0"
            syncUrl={false}
          />
        </section>
      </AdminPageShell>
    </DashboardLayout>
  );
}
