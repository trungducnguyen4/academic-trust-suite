import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import {
  BadgeCheck,
  Crown,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api, { unwrapPaginatedData } from "@/lib/api";
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

type BackendRole = "STUDENT" | "LECTURER" | "ADMIN";
type BackendStatus = "active" | "suspended" | "pending";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: BackendRole;
  studentId?: string | null;
  department?: string | null;
  status?: BackendStatus;
  createdAt: string;
}

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  role: BackendRole;
  department: string;
  studentId: string;
  status: BackendStatus;
}

const EMPTY_CREATE_FORM: UserForm = {
  fullName: "",
  email: "",
  password: "",
  role: "STUDENT",
  department: "",
  studentId: "",
  status: "active",
};

const EMPTY_EDIT_FORM: UserForm = {
  fullName: "",
  email: "",
  password: "",
  role: "STUDENT",
  department: "",
  studentId: "",
  status: "active",
};

const USER_FILTERS: FilterDefinition[] = [
  {
    key: "role",
    label: "Role",
    type: "select",
    allLabel: "All Roles",
    options: [
      { label: "Student", value: "STUDENT" },
      { label: "Lecturer", value: "LECTURER" },
      { label: "Admin", value: "ADMIN" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    allLabel: "All Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Pending", value: "pending" },
      { label: "Suspended", value: "suspended" },
    ],
  },
  {
    key: "department",
    label: "Department",
    type: "text",
    placeholder: "Filter by department",
    defaultOperator: "contains",
    operators: ["contains", "startsWith", "equals"],
  },
  {
    key: "studentId",
    label: "Student ID",
    type: "text",
    placeholder: "Filter by student ID",
    defaultOperator: "contains",
    operators: ["contains", "startsWith", "equals"],
  },
  {
    key: "createdAt",
    label: "Created At",
    type: "date-range",
  },
];

const EMPTY_FILTERS: FilterValues = {
  role: "all",
  status: "all",
  department: { value: "", operator: "contains" },
  studentId: { value: "", operator: "contains" },
  createdAt: { from: undefined, to: undefined },
};

export default function UserRoleManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_EDIT_FORM);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const USER_ROW_HEIGHT = 56;
  const USER_TABLE_HEADER_HEIGHT = 48;
  const USER_TABLE_MIN_HEIGHT =
    ITEMS_PER_PAGE * USER_ROW_HEIGHT + USER_TABLE_HEADER_HEIGHT;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers({ page: 1, limit: 1000 });

      const rows = unwrapPaginatedData<UserRow>(response);
      setUsers(rows);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const normalizedSearch = appliedSearch.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchesSearch = !normalizedSearch
        ? true
        : [
            item.fullName,
            item.email,
            item.studentId || "",
            item.department || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

      const roleValue = appliedFilters.role as string | undefined;
      const statusValue = appliedFilters.status as string | undefined;
      const departmentFilter = appliedFilters.department as
        | TextFilterValue
        | undefined;
      const studentIdFilter = appliedFilters.studentId as
        | TextFilterValue
        | undefined;
      const createdAtRange = appliedFilters.createdAt as
        | { from?: string; to?: string }
        | undefined;

      const matchesRole =
        !roleValue || roleValue === "all" || item.role === roleValue;
      const matchesStatus =
        !statusValue || statusValue === "all" || item.status === statusValue;

      const matchesText = (
        source: string | null | undefined,
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

      const matchesDepartment = matchesText(item.department, departmentFilter);
      const matchesStudentId = matchesText(item.studentId, studentIdFilter);

      const matchesCreatedAt = (() => {
        if (!createdAtRange?.from && !createdAtRange?.to) return true;
        const createdAt = new Date(item.createdAt).getTime();
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
        matchesRole &&
        matchesStatus &&
        matchesDepartment &&
        matchesStudentId &&
        matchesCreatedAt
      );
    });
  }, [users, normalizedSearch, appliedFilters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  const activeFilterCount = getActiveFilterCount(appliedFilters, USER_FILTERS);
  const activeFilterChips = getFilterChips(appliedFilters, USER_FILTERS);

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

  const openEditDialog = (target: UserRow) => {
    setEditingUser(target);
    setEditForm({
      fullName: target.fullName,
      email: target.email,
      password: "",
      role: target.role,
      department: target.department || "",
      studentId: target.studentId || "",
      status: target.status || "active",
    });
    setShowEditDialog(true);
  };

  const handleCreateUser = async () => {
    if (!createForm.fullName || !createForm.email || !createForm.password) {
      toast.error("Please fill full name, email, and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
        department: createForm.department.trim() || undefined,
        studentId:
          createForm.role === "STUDENT"
            ? createForm.studentId.trim() || undefined
            : undefined,
      });
      toast.success("User created successfully");
      setShowAddDialog(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setPage(1);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editForm.fullName || !editForm.email) {
      toast.error("Please fill full name and email");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateUser(editingUser.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        status: editForm.status,
        department: editForm.department.trim() || undefined,
        studentId:
          editForm.role === "STUDENT"
            ? editForm.studentId.trim() || undefined
            : undefined,
        password: editForm.password.trim() || undefined,
      });
      toast.success("User updated successfully");
      setShowEditDialog(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRoleChange = async (target: UserRow, role: BackendRole) => {
    if (target.id === currentUser?.id) {
      toast.error("Cannot change your own role");
      return;
    }
    try {
      await api.updateUser(target.id, { role });
      setUsers((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, role } : item)),
      );
      toast.success("Role updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update role");
    }
  };

  const handleToggleStatus = async (target: UserRow) => {
    if (target.id === currentUser?.id) {
      toast.error("Cannot suspend your own account");
      return;
    }

    const nextStatus: BackendStatus =
      target.status === "active" ? "suspended" : "active";
    try {
      await api.updateUser(target.id, { status: nextStatus });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, status: nextStatus } : item,
        ),
      );
      toast.success("Account status updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  const handleDeleteUser = async (target: UserRow) => {
    if (target.id === currentUser?.id) {
      toast.error("Cannot delete your own account");
      return;
    }

    try {
      setDeletingId(target.id);
      const response = await api.deleteUser(target.id);
      toast.success(response?.message || "User archived");
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const pageStats = useMemo(
    () => ({
      students: paginatedUsers.filter((item) => item.role === "STUDENT").length,
      lecturers: paginatedUsers.filter((item) => item.role === "LECTURER")
        .length,
      admins: paginatedUsers.filter((item) => item.role === "ADMIN").length,
    }),
    [paginatedUsers],
  );

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
      <AdminPageShell>
        <ListPageHeader
          title="All Users"
          actions={
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={createForm.fullName}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Nguyen Van A"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="user@university.edu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Initial Password</Label>
                      <Input
                        type="password"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="At least 6 characters"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={createForm.role}
                        onValueChange={(value: BackendRole) =>
                          setCreateForm((prev) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="LECTURER">Lecturer</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={createForm.status}
                        onValueChange={(value: BackendStatus) =>
                          setCreateForm((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        value={createForm.department}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Student ID</Label>
                      <Input
                        value={createForm.studentId}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            studentId: e.target.value,
                          }))
                        }
                        placeholder="Required for students"
                        disabled={createForm.role !== "STUDENT"}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
          className="mb-4"
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <AdminStatCard
            icon={Users}
            value={filteredUsers.length}
            label="Total Users"
          />
          <AdminStatCard
            icon={BadgeCheck}
            value={pageStats.students}
            label="Students (current page)"
            iconWrapClassName="bg-sky-500/10"
            iconClassName="text-sky-600"
          />
          <AdminStatCard
            icon={Users}
            value={pageStats.lecturers}
            label="Lecturers (current page)"
            iconWrapClassName="bg-violet-500/10"
            iconClassName="text-violet-600"
          />
          <AdminStatCard
            icon={Crown}
            value={pageStats.admins}
            label="Admins (current page)"
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
              placeholder="Search by name, email, student ID, or department"
              className="flex-1"
            />
            <FilterPanel
              title="User filters"
              description="Filter by role, status, department, student ID, and created date."
              filters={USER_FILTERS}
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
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className="overflow-hidden"
              style={{ minHeight: USER_TABLE_MIN_HEIGHT }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.fullName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.role}
                          onValueChange={(value: BackendRole) =>
                            handleQuickRoleChange(item, value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STUDENT">Student</SelectItem>
                            <SelectItem value="LECTURER">Lecturer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{item.department || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={
                            item.status === "active"
                              ? "success"
                              : item.status === "suspended"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {item.status || "active"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(item)}
                            title={
                              item.status === "active"
                                ? "Suspend account"
                                : "Activate account"
                            }
                          >
                            {item.status === "active" ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </Button>
                          <ConfirmActionDialog
                            title="Archive user"
                            description={`Archive user "${item.fullName}"?`}
                            confirmText="Archive"
                            destructive
                            onConfirm={() => handleDeleteUser(item)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              disabled={deletingId === item.id}
                              title="Archive user"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </ConfirmActionDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} / {totalPages} ({filteredUsers.length} users)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update profile, role, and account status
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value: BackendRole) =>
                      setEditForm((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="LECTURER">Lecturer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value: BackendStatus) =>
                      setEditForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input
                    value={editForm.studentId}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        studentId: e.target.value,
                      }))
                    }
                    disabled={editForm.role !== "STUDENT"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminPageShell>
    </DashboardLayout>
  );
}
