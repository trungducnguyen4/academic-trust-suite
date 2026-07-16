import { notFound } from "next/navigation";

import AdvancedExamRuleConfig from "@/features/lecturer/AdvancedExamRuleConfig";
import CourseDetail from "@/features/lecturer/CourseDetail";
import CreateCourse from "@/features/lecturer/CreateCourse";
import CreateExam from "@/features/lecturer/CreateExam";
import ExamAnalytics from "@/features/lecturer/ExamAnalytics";
import ExamManagement from "@/features/lecturer/ExamManagement";
import ExamMonitor from "@/features/lecturer/ExamMonitor";
import ExamPreview from "@/features/lecturer/ExamPreview";
import ExamQR from "@/features/lecturer/ExamQR";
import ExamQualityReview from "@/features/lecturer/ExamQualityReview";
import ExamResultsList from "@/features/lecturer/ExamResultsList";
import GenerateExamLink from "@/features/lecturer/GenerateExamLink";
import LecturerDashboard from "@/features/lecturer/LecturerDashboard";
import ManualGradingDetail from "@/features/lecturer/ManualGradingDetail";
import QuestionBankManagement from "@/features/lecturer/QuestionBankManagement";
import QuestionEditor from "@/features/lecturer/QuestionEditor";
import QuestionHistoryAnalysis from "@/features/lecturer/QuestionHistoryAnalysis";
import UploadDocAIGen from "@/features/lecturer/UploadDocAIGen";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function LecturerRoute({ params }: PageProps) {
  const { slug = [] } = await params;

  if (slug.length === 0) return <LecturerDashboard />;

  const [section] = slug;

  if (section === "exams" && slug.length === 1) return <ExamManagement />;
  if (section === "exam" && slug.length === 3 && slug[2] === "monitor") return <ExamMonitor />;
  if (section === "exam" && slug.length === 3 && slug[2] === "preview") return <ExamPreview />;
  if (section === "exam" && slug.length === 3 && slug[2] === "qr") return <ExamQR />;
  if (section === "exam" && slug.length === 3 && slug[2] === "results") return <ExamResultsList />;
  if (section === "exam" && slug.length === 3 && slug[2] === "quality-review") return <ExamQualityReview />;
  if (section === "exam" && slug.length === 5 && slug[2] === "submissions" && slug[4] === "manual-grading") {
    return <ManualGradingDetail />;
  }
  if (section === "question-bank") return <QuestionBankManagement />;
  if (section === "question-editor") return <QuestionEditor />;
  if (section === "question-history") return <QuestionHistoryAnalysis />;
  if (section === "exam-rule-config") return <AdvancedExamRuleConfig />;
  if (section === "courses") return <CreateCourse />;
  if (section === "create-course") return <CreateCourse />;
  if (section === "course" && slug.length === 2) return <CourseDetail />;
  if (section === "upload-doc-ai") return <UploadDocAIGen />;
  if (section === "generate-link") return <GenerateExamLink />;
  if (section === "exams" && slug.length === 2 && slug[1] === "create") return <CreateExam />;
  if (section === "analytics") return <ExamAnalytics />;

  notFound();
}
