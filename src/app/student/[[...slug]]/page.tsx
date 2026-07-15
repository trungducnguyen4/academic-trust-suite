import { notFound } from "next/navigation";

import ExamEventTimeline from "@/features/student/ExamEventTimeline";
import ExamReadyCheck from "@/features/student/ExamReadyCheck";
import ExamTaking from "@/features/student/ExamTaking";
import FeedbackDetail from "@/features/student/FeedbackDetail";
import GradingBreakdown from "@/features/student/GradingBreakdown";
import JoinExam from "@/features/student/JoinExam";
import JoinExamByLink from "@/features/student/JoinExamByLink";
import LearningFeedbackDetail from "@/features/student/LearningFeedbackDetail";
import ScanQRJoinExam from "@/features/student/ScanQRJoinExam";
import StudentCourseDetail from "@/features/student/StudentCourseDetail";
import StudentCourses from "@/features/student/StudentCourses";
import StudentDashboard from "@/features/student/StudentDashboard";
import StudentExamDetail from "@/features/student/StudentExamDetail";
import StudentExams from "@/features/student/StudentExams";
import StudentResultDetail from "@/features/student/StudentResultDetail";
import StudentResults from "@/features/student/StudentResults";
import StudentSchedule from "@/features/student/StudentSchedule";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudentRoute({ params }: PageProps) {
  const { slug = [] } = await params;

  if (slug.length === 0) return <StudentDashboard />;

  const [section, first, second] = slug;

  if (section === "courses" && slug.length === 1) return <StudentCourses />;
  if (section === "courses" && slug.length === 2) return <StudentCourseDetail />;
  if (section === "course" && slug.length === 2) return <StudentCourseDetail />;
  if (section === "exams" && slug.length === 1) return <StudentExams />;
  if (section === "exams" && slug.length === 2) return <StudentExamDetail />;
  if (section === "schedule") return <StudentSchedule />;
  if (section === "results" && slug.length === 1) return <StudentResults />;
  if (section === "results" && slug.length === 2) return <StudentResultDetail />;
  if (section === "feedback") return <FeedbackDetail />;
  if (section === "timeline") return <ExamEventTimeline />;
  if (section === "grading") return <GradingBreakdown />;
  if (section === "exam-ready") return <ExamReadyCheck />;
  if (section === "exam-taking") return <ExamTaking />;
  if (section === "learning-feedback") return <LearningFeedbackDetail />;
  if (section === "join-exam") return <JoinExam />;
  if (section === "join" && slug.length === 2) return <JoinExamByLink />;
  if (section === "scan-qr") return <ScanQRJoinExam />;

  void first;
  void second;
  notFound();
}
