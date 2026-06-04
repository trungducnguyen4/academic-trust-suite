import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Profile() {
  const { user, isAuthenticated, applyProfileToSession } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [studentId, setStudentId] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setFullName(user.fullName || "");
    setEmail(user.email || "");
    setDepartment(user.department || "");
    setStudentId(user.studentId || "");
  }, [user]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStudent) {
      toast.error("Profile editing is temporarily disabled for students");
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await api.updateMyProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        department: department.trim() || undefined,
        studentId:
          user.role === "STUDENT" ? studentId.trim() || undefined : undefined,
      });
      applyProfileToSession(updatedUser);
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please complete all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password confirmation does not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.changeMyPassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password updated successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const roleLabel =
    user.role === "STUDENT"
      ? "Student"
      : user.role === "LECTURER"
        ? "Lecturer"
        : "Administrator";

  const dashboardPath =
    user.role === "ADMIN"
      ? "/admin"
      : user.role === "LECTURER"
        ? "/lecturer"
        : "/student";

  return (
    <DashboardLayout>
      <div className="w-full max-w-6xl">
        <BackToDashboardButton to={dashboardPath} className="mb-4 -ml-2" />

        <h1 className="text-2xl font-semibold text-foreground mb-1">Profile</h1>
        <p className="text-muted-foreground mb-6">
          Manage your account settings
        </p>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] xl:items-start">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>
                Update personal info for your account (no avatar change)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">
                    {user.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground break-all">
                    {user.email}
                  </p>
                  <StatusBadge status={user.role} domain="role" className="mt-2">
                    {roleLabel}
                  </StatusBadge>
                </div>
              </div>
              <Separator />
              <form
                className="grid gap-4 lg:grid-cols-2"
                onSubmit={handleProfileUpdate}
              >
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isStudent}
                    required
                  />
                </div>
                <div className="grid gap-2 lg:col-span-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input
                    id="email-address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isStudent}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isStudent}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="student-id">Student ID</Label>
                  <Input
                    id="student-id"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={isStudent || user.role !== "STUDENT"}
                    placeholder={
                      user.role === "STUDENT"
                        ? "Enter your student ID"
                        : "Only available for students"
                    }
                  />
                </div>
                <div className="grid gap-2 lg:col-span-2">
                  <Label>Role</Label>
                  <Input
                    value={roleLabel}
                    disabled
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator to change your role.
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <Button type="submit" disabled={isSavingProfile || isStudent}>
                    {isSavingProfile && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={isUpdatingPassword}>
                    {isUpdatingPassword && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
