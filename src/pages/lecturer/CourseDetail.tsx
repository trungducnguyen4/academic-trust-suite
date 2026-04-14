import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataPagination } from "@/components/common/DataPagination";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Plus,
  FileSpreadsheet,
  UserPlus,
  Trash2,
  Mail,
  Download,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api, { unwrapPaginatedData } from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

interface Student {
  enrollmentId: string;
  userId: string;
  studentCode: string;
  name: string;
  email: string;
  status: string;
  joinedAt: string;
}

interface Enrollment {
  id: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    studentId?: string | null;
  };
  joinedAt: string;
}

interface Course {
  id: string;
  code?: string;
  name?: string;
  semester?: string;
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const [enrollmentsRaw, setEnrollmentsRaw] = useState<any[] | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({
    status: "all",
    joinedAt: { from: undefined, to: undefined },
    studentCode: { value: "", operator: "contains" },
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    status: "all",
    joinedAt: { from: undefined, to: undefined },
    studentCode: { value: "", operator: "contains" },
  });
  const [page, setPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Manual Add Form
  const [newStudent, setNewStudent] = useState({ name: "", id: "", email: "" });

  const parseEmailsFromCSV = (text: string): string[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const emails: string[] = [];
    for (const line of lines) {
      const parts = line
        .split(/[,;\t]/)
        .map((part) => part.trim().replace(/^["']|["']$/g, ""));
      for (const part of parts) {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
          emails.push(part.toLowerCase());
        }
      }
    }
    return [...new Set(emails)];
  };

  const reloadEnrollments = async (courseId: string) => {
    const enrollments: Enrollment[] = await api.getCourseEnrollments(courseId);
    const mapped: Student[] = enrollments.map((e: Enrollment) => ({
      enrollmentId: e.id,
      userId: e.student.id,
      studentCode: e.student.studentId || e.student.id.slice(0, 8),
      name: e.student.fullName,
      email: e.student.email,
      status: "active",
      joinedAt: new Date(e.joinedAt).toISOString().split("T")[0],
    }));
    setStudents(mapped);
    setEnrollmentsRaw(enrollments || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Try fetching by id first (DB id). If not found, fallback to searching by course code.
        let courseRes: any | null = null;
        let enrollments: Enrollment[] = [];

        try {
          courseRes = await api.getCourse(id);
        } catch (err) {
          courseRes = null;
        }

        if (!courseRes || !courseRes.id) {
          // fallback: fetch all courses and match by code or id
          try {
            const courses = unwrapPaginatedData(await api.getCourses());
            const found = courses.find(
              (c: any) =>
                (c.code && c.code.toLowerCase() === String(id).toLowerCase()) ||
                c.id === id,
            );
            if (found) {
              courseRes = found;
            }
          } catch (err) {
            console.warn("Failed to fetch courses for fallback lookup", err);
          }
        }

        if (courseRes && courseRes.id) {
          // fetch enrollments by the resolved course id
          enrollments = await api.getCourseEnrollments(courseRes.id);
          setCourse({
            id: courseRes.id,
            code: courseRes.code,
            name: courseRes.name,
            semester: courseRes.semester,
          });
          setResolvedCourseId(courseRes.id);
        } else {
          // no course found — keep course as null and try to fetch enrollments by id param anyway
          try {
            enrollments = await api.getCourseEnrollments(id);
            setResolvedCourseId(id);
          } catch (err) {
            enrollments = [];
            setResolvedCourseId(null);
          }
        }

        const mapped: Student[] = enrollments.map((e: Enrollment) => ({
          enrollmentId: e.id,
          userId: e.student.id,
          studentCode: e.student.studentId || e.student.id.slice(0, 8),
          name: e.student.fullName,
          email: e.student.email,
          status: "active",
          joinedAt: new Date(e.joinedAt).toISOString().split("T")[0],
        }));
        setStudents(mapped);
        setEnrollmentsRaw(enrollments || []);
      } catch (err) {
        console.error("Failed to fetch course or enrollments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const studentFilterDefinitions: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      allLabel: "All Status",
      options: [{ label: "Active", value: "active" }],
    },
    {
      key: "joinedAt",
      label: "Joined Date",
      type: "date-range",
    },
    {
      key: "studentCode",
      label: "Student ID",
      type: "text",
      placeholder: "Filter by student ID",
      operators: ["contains", "startsWith", "equals"],
    },
  ];

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const filteredStudents = students.filter((student) => {
    const statusFilter = appliedFilters.status as string | undefined;
    const joinedAtFilter = appliedFilters.joinedAt as
      | { from?: string; to?: string }
      | undefined;
    const codeFilter = appliedFilters.studentCode as TextFilterValue | undefined;

    const searchMatched = !normalizedSearch
      ? true
      : [student.name, student.studentCode, student.email]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
    if (!searchMatched) return false;

    const matchesStatus =
      !statusFilter || statusFilter === "all" || student.status === statusFilter;
    if (!matchesStatus) return false;

    const matchesCode = (() => {
      if (!codeFilter || !codeFilter.value.trim()) return true;
      const source = student.studentCode.toLowerCase();
      const value = codeFilter.value.trim().toLowerCase();
      if (codeFilter.operator === "startsWith") return source.startsWith(value);
      if (codeFilter.operator === "equals") return source === value;
      return source.includes(value);
    })();
    if (!matchesCode) return false;

    const matchesJoinedDate = (() => {
      if (!joinedAtFilter || (!joinedAtFilter.from && !joinedAtFilter.to)) return true;
      const joinedTs = new Date(student.joinedAt).getTime();
      if (Number.isNaN(joinedTs)) return false;
      if (joinedAtFilter.from) {
        const fromTs = new Date(joinedAtFilter.from).getTime();
        if (!Number.isNaN(fromTs) && joinedTs < fromTs) return false;
      }
      if (joinedAtFilter.to) {
        const toDate = new Date(joinedAtFilter.to);
        toDate.setHours(23, 59, 59, 999);
        const toTs = toDate.getTime();
        if (!Number.isNaN(toTs) && joinedTs > toTs) return false;
      }
      return true;
    })();

    return matchesJoinedDate;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const STUDENT_ROW_HEIGHT = 56;
  const STUDENT_TABLE_HEADER_HEIGHT = 48;
  const STUDENT_TABLE_MIN_HEIGHT =
    ITEMS_PER_PAGE * STUDENT_ROW_HEIGHT + STUDENT_TABLE_HEADER_HEIGHT;

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
    const emptyFilters: FilterValues = {
      status: "all",
      joinedAt: { from: undefined, to: undefined },
      studentCode: { value: "", operator: "contains" },
    };
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };
  const removeFilter = (key: string) => {
    const emptyFilters: FilterValues = {
      status: "all",
      joinedAt: { from: undefined, to: undefined },
      studentCode: { value: "", operator: "contains" },
    };
    const next = { ...appliedFilters, [key]: emptyFilters[key] };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  };

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    studentFilterDefinitions,
  );
  const activeFilterChips = getFilterChips(appliedFilters, studentFilterDefinitions);

  const handleAddManual = async () => {
    if (!resolvedCourseId) return;
    const keyword = newStudent.id.trim().toLowerCase();
    if (!keyword) return;

    try {
      setIsAdding(true);
      const studentsDb = await api.getStudents();
      const target = studentsDb.find(
        (s: any) =>
          String(s.email || "").toLowerCase() === keyword ||
          String(s.studentId || "").toLowerCase() === keyword,
      );

      if (!target) {
        toast.error("No student found with the provided email or student ID");
        return;
      }

      await api.enrollStudent(resolvedCourseId, target.id);
      await reloadEnrollments(resolvedCourseId);
      setNewStudent({ name: "", id: "", email: "" });
      toast.success("Student added successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add student");
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || !resolvedCourseId) return;

    try {
      setIsImporting(true);
      const text = await importFile.text();
      const emails = parseEmailsFromCSV(text);

      if (emails.length === 0) {
        toast.error("No valid emails found in file");
        return;
      }

      const result = await api.bulkEnrollByEmails(resolvedCourseId, emails);
      await reloadEnrollments(resolvedCourseId);
      setImportFile(null);
      toast.success(`Imported ${result.success.length} student(s)`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (enrollmentId: string) => {
    try {
      await api.removeEnrollment(enrollmentId);
      setStudents((prev) =>
        prev.filter((s) => s.enrollmentId !== enrollmentId),
      );
      toast.success("Student removed from course");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove student");
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* <BackToDashboardButton to={basePath} className="-ml-2" /> */}

        {/* Header */}
        <div>
          <Button
            variant="ghost"
            className="pl-0 gap-2 mb-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              navigate(
                basePath === "/admin"
                  ? "/admin/courses"
                  : "/lecturer/courses",
              )
            }
          >
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </Button>
          <ListPageHeader
            title={`${course?.name || "Course Details"}${course?.code ? ` (${course.code})` : ""}`}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export List
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" /> Add Students
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Students to Course</DialogTitle>
                      <DialogDescription>
                        Add students manually or import from a CSV file.
                      </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="manual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="import">Import CSV</TabsTrigger>
                      </TabsList>

                      {/* Manual Entry Tab */}
                      <TabsContent value="manual" className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="sid">
                            Student Email / Student ID{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="sid"
                            placeholder="e.g. student@university.edu or 20120001"
                            value={newStudent.id}
                            onChange={(e) =>
                              setNewStudent({ ...newStudent, id: e.target.value })
                            }
                          />
                        </div>
                        <Button
                          onClick={handleAddManual}
                          className="w-full mt-2"
                          disabled={!newStudent.id || isAdding}
                        >
                          {isAdding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Add Student
                        </Button>
                      </TabsContent>

                      {/* Import CSV Tab */}
                      <TabsContent value="import" className="space-y-4 py-4">
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer bg-muted/20">
                          <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium">
                            Drag & drop CSV file here
                          </p>
                          <p className="text-xs text-muted-foreground my-2">or</p>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="relative"
                          >
                            Browse File
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              accept=".csv"
                              onChange={(e) =>
                                setImportFile(e.target.files?.[0] || null)
                              }
                            />
                          </Button>
                          {importFile && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                              <CheckCircle2 className="h-4 w-4" />
                              {importFile.name}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium">Required CSV Format:</p>
                          <p className="font-mono bg-muted p-1 rounded">Email</p>
                        </div>
                        <Button
                          onClick={handleImportCSV}
                          className="w-full"
                          disabled={!importFile || isImporting}
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" /> Import Students
                            </>
                          )}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />
          <p className="text-muted-foreground">
            {course?.semester || "Semester unknown"} • {students.length} Students Enrolled
          </p>
            {typeof window !== "undefined" &&
              window.location.hostname.includes("localhost") && (
                <div className="mt-3 p-3 rounded-md bg-muted/30 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Dev debug</div>
                  <div>
                    Resolved course id:{" "}
                    <span className="font-mono">
                      {resolvedCourseId || "none"}
                    </span>
                  </div>
                  <div>
                    Enrollments fetched:{" "}
                    {Array.isArray(enrollmentsRaw)
                      ? enrollmentsRaw.length
                      : "null"}
                  </div>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">
                      Show raw enrollments (first 5)
                    </summary>
                    <pre className="max-h-56 overflow-auto p-2 bg-white text-xs text-muted-foreground rounded mt-2">
                      {enrollmentsRaw
                        ? JSON.stringify(enrollmentsRaw.slice(0, 5), null, 2)
                        : "no data"}
                    </pre>
                  </details>
                </div>
              )}
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Search by name, ID, email"
              className="flex-1"
            />
            <FilterPanel
              title="Student filters"
              description="Filter by status, joined date, and student ID."
              filters={studentFilterDefinitions}
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

        {/* Student List */}
        <Card>
          <CardContent className="p-0">
            <div
              className="overflow-hidden"
              style={{ minHeight: STUDENT_TABLE_MIN_HEIGHT }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((student) => (
                      <TableRow key={student.enrollmentId}>
                        <TableCell className="font-mono font-medium">
                          {student.studentCode}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span>{student.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.joinedAt}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(student.enrollmentId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No students found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredStudents.length}
              onPageChange={setPage}
              itemLabel="students"
              syncUrl={false}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
