"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Users,
  Shield,
  Settings,
  BarChart3,
  Activity,
  Database,
  ArrowRight,
  Loader2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import api, { unwrapPaginatedData } from "@/lib/api";
import { FileText } from "@/components/layout/DashboardLayout";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  course?: { code: string };
}

interface Submission {
  id: string;
  score: number | null;
  startedAt: string;
  exam?: { title: string };
  student?: { fullName: string; email: string };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, examsRes, submissionsRes, coursesRes] =
          await Promise.all([
            api.getUsers(),
            api.getExams(),
            api.getSubmissions(),
            api.getCourses(),
          ]);
        setUsers(unwrapPaginatedData(usersRes));
        setExams(unwrapPaginatedData(examsRes));
        setSubmissions(unwrapPaginatedData(submissionsRes));
        setCourses(unwrapPaginatedData(coursesRes));
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate stats from real data
  const now = new Date();
  const activeExams = exams.filter(
    (e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now,
  ).length;
  const totalUsers = users.length;

  const studentCount = users.filter((u) => u.role === "STUDENT").length;
  const lecturerCount = users.filter((u) => u.role === "LECTURER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  const userBreakdown = [
    {
      role: "Sinh viên",
      count: studentCount,
      percentage: totalUsers ? (studentCount / totalUsers) * 100 : 0,
    },
    {
      role: "Giảng viên",
      count: lecturerCount,
      percentage: totalUsers ? (lecturerCount / totalUsers) * 100 : 0,
    },
    {
      role: "Quản trị viên",
      count: adminCount,
      percentage: totalUsers ? (adminCount / totalUsers) * 100 : 0,
    },
  ];

  // Recent activity from submissions and users
  const recentActivity = [
    ...submissions.slice(0, 2).map((s) => ({
      id: s.id,
      action: `Nộp bài thi: ${s.exam?.title || "Không xác định"}`,
      user: s.student?.fullName || "Sinh viên",
      time: new Date(s.startedAt).toLocaleDateString("vi-VN"),
    })),
    ...users.slice(0, 2).map((u) => ({
      id: u.id,
      action: `Người dùng đã đăng ký: ${u.role}`,
      user: u.fullName,
      time: new Date(u.createdAt).toLocaleDateString("vi-VN"),
    })),
  ].slice(0, 4);

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
      <AdminPageShell showBackButton={false}>
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Quản trị hệ thống
          </h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi và quản lý nền tảng khảo thí
          </p>
        </div>

        {/* System Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Users}
            value={totalUsers.toLocaleString()}
            label="Tổng người dùng"
          />
          <AdminStatCard
            icon={Activity}
            value={activeExams}
            label="Bài thi đang hoạt động"
            iconWrapClassName="bg-info/10"
            iconClassName="text-info"
          />
          <AdminStatCard
            icon={Shield}
            value={submissions.length}
            label="Bài nộp"
            iconWrapClassName="bg-warning/10"
            iconClassName="text-warning"
          />
          <AdminStatCard
            icon={Database}
            value={courses.length}
            label="Tổng khóa học"
            iconWrapClassName="bg-success/10"
            iconClassName="text-success"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Phân bổ người dùng</CardTitle>
              <CardDescription>Thống kê theo vai trò</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userBreakdown.map((item) => (
                <div key={item.role} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{item.role}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
              <CardDescription>Các sự kiện hệ thống mới nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bài nộp gần đây</CardTitle>
                <CardDescription>Các lượt nộp bài mới nhất</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                asChild
              >
                <Link href="/admin/integrity">
                  Xem tất cả
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có bài nộp
                  </p>
                ) : (
                  submissions.slice(0, 3).map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {sub.exam?.title || "Bài thi không xác định"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.student?.fullName || "Sinh viên không xác định"}
                          </p>
                        </div>
                        <StatusBadge
                          status={sub.score !== null ? "graded" : "pending"}
                          domain="submission"
                        >
                          {sub.score !== null ? `${sub.score}%` : "Đang chờ"}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bắt đầu: {new Date(sub.startedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tác vụ quản trị</CardTitle>
            <CardDescription>Các lựa chọn quản lý hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/users">
                  <Users className="h-5 w-5" />
                  <span>Quản lý người dùng</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/exams">
                  <FileText className="h-5 w-5" />
                  <span>Quản lý bài thi</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/integrity">
                  <Shield className="h-5 w-5" />
                  <span>Xem xét tính toàn vẹn</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/settings">
                  <Settings className="h-5 w-5" />
                  <span>Thiết lập hệ thống</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/courses">
                  <BarChart3 className="h-5 w-5" />
                  <span>Quản lý khóa học</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin/question-bank">
                  <BookOpen className="h-5 w-5" />
                  <span>Ngân hàng câu hỏi</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminPageShell>
    </DashboardLayout>
  );
}



