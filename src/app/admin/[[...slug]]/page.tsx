import { notFound } from "next/navigation";

import AdminDashboard from "@/features/admin/AdminDashboard";
import AdminCourseManagement from "@/features/admin/CourseManagement";
import AdminExamManagement from "@/features/admin/ExamManagement";
import AuditLogViewer from "@/features/admin/AuditLogViewer";
import IntegrityOverview from "@/features/admin/IntegrityOverview";
import MetricMethodologyReference from "@/features/admin/MetricMethodologyReference";
import SystemPolicyConfig from "@/features/admin/SystemPolicyConfig";
import TransparencyDashboard from "@/features/admin/TransparencyDashboard";
import UserRoleManagement from "@/features/admin/UserRoleManagement";
import CourseDetail from "@/features/lecturer/CourseDetail";
import ExamMonitor from "@/features/lecturer/ExamMonitor";
import ExamPreview from "@/features/lecturer/ExamPreview";
import ExamQR from "@/features/lecturer/ExamQR";
import ExamQualityReview from "@/features/lecturer/ExamQualityReview";
import ExamResultsList from "@/features/lecturer/ExamResultsList";
import ManualGradingDetail from "@/features/lecturer/ManualGradingDetail";
import QuestionBankManagement from "@/features/lecturer/QuestionBankManagement";
import QuestionEditor from "@/features/lecturer/QuestionEditor";
import QuestionHistoryAnalysis from "@/features/lecturer/QuestionHistoryAnalysis";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminRoute({ params }: PageProps) {
  const { slug = [] } = await params;

  if (slug.length === 0) return <AdminDashboard />;

  const [section] = slug;

  if (section === "exams" && slug.length === 1) return <AdminExamManagement />;
  if (section === "exam" && slug.length === 3 && slug[2] === "monitor") return <ExamMonitor />;
  if (section === "exam" && slug.length === 3 && slug[2] === "preview") return <ExamPreview />;
  if (section === "exam" && slug.length === 3 && slug[2] === "qr") return <ExamQR />;
  if (section === "exam" && slug.length === 3 && slug[2] === "results") return <ExamResultsList />;
  if (section === "exam" && slug.length === 3 && slug[2] === "quality-review") return <ExamQualityReview />;
  if (section === "exam" && slug.length === 5 && slug[2] === "submissions" && slug[4] === "manual-grading") {
    return <ManualGradingDetail />;
  }
  if (section === "courses") return <AdminCourseManagement />;
  if (section === "course" && slug.length === 2) return <CourseDetail />;
  if (section === "question-bank") return <QuestionBankManagement />;
  if (section === "question-editor") return <QuestionEditor />;
  if (section === "question-history") return <QuestionHistoryAnalysis />;
  if (section === "users" || section === "user-management") return <UserRoleManagement />;
  if (section === "integrity") return <IntegrityOverview />;
  if (section === "settings" || section === "reports") return <AdminDashboard />;
  if (section === "metrics") return <MetricMethodologyReference />;
  if (section === "transparency") return <TransparencyDashboard />;
  if (section === "system-policy") return <SystemPolicyConfig />;
  if (section === "audit-logs") return <AuditLogViewer />;

  notFound();
}
