import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Search,
  Trash2,
  Users,
} from "lucide-react";
import api, { unwrapPaginatedData } from "@/lib/api";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { useAuth } from "@/contexts/AuthContext";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

interface Lecturer {
  id: string;
  fullName: string;
  email: string;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
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
  semester: string;
  description: string;
  credits: string;
  lecturerId: string;
}

const defaultForm: CourseForm = {
  name: "",
  semester: "",
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

export default function AdminCourseManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [search, setSearch] = useState("");

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

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((course) => {
      return (
        course.code.toLowerCase().includes(q) ||
        course.name.toLowerCase().includes(q) ||
        (course.semester || "").toLowerCase().includes(q) ||
        (course.lecturer?.fullName || "").toLowerCase().includes(q)
      );
    });
  }, [courses, search]);

  const courseStats = useMemo(() => {
    const totalCourses = courses.length;
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
    semester: form.semester.trim() || undefined,
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
      semester: course.semester || "",
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
          <Label htmlFor="semester">Semester</Label>
          <Input
            id="semester"
            value={form.semester}
            onChange={(e) => onChange({ semester: e.target.value })}
            placeholder="e.g. 2025-2026/2"
          />
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
      <div className="space-y-6">
        <BackToDashboardButton to="/admin" className="-ml-2" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Course Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create, update, and organize courses across the platform.
            </p>
          </div>

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
                  disabled={saving || !createForm.name.trim()}
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {courseStats.totalCourses}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {courseStats.assignedLecturers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assigned Lecturers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {courseStats.totalEnrollments}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Enrollments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {courseStats.activeCourses}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active Courses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All Courses</CardTitle>
                <CardDescription>
                  Total: {courses.length} courses
                </CardDescription>
              </div>
              <div className="relative md:w-72">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code, name, semester..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead className="text-center min-w-20">
                    Students
                  </TableHead>
                  <TableHead className="text-center min-w-20">Exams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-mono font-medium">
                        {course.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {course.name}
                      </TableCell>
                      <TableCell>{course.semester || "N/A"}</TableCell>
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
          </CardContent>
        </Card>
      </div>

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
              disabled={saving || !editForm.name.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
