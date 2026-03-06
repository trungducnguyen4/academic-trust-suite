import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import FeedbackDetail from "./pages/student/FeedbackDetail";
import ExamEventTimeline from "./pages/student/ExamEventTimeline";
import GradingBreakdown from "./pages/student/GradingBreakdown";
import ExamTaking from "./pages/student/ExamTaking";
import ExamReadyCheck from "./pages/student/ExamReadyCheck";
import LearningFeedbackDetail from "./pages/student/LearningFeedbackDetail";
import JoinExam from "./pages/student/JoinExam";
import ScanQRJoinExam from "./pages/student/ScanQRJoinExam";
import OfflineExamDownload from "./pages/student/OfflineExamDownload";

// Lecturer
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import QuestionBankManagement from "./pages/lecturer/QuestionBankManagement";
import QuestionEditor from "./pages/lecturer/QuestionEditor";
import QuestionHistoryAnalysis from "./pages/lecturer/QuestionHistoryAnalysis";
import AdvancedExamRuleConfig from "./pages/lecturer/AdvancedExamRuleConfig";
import ExamMonitor from "./pages/lecturer/ExamMonitor";
import CreateCourse from "./pages/lecturer/CreateCourse";
import CourseManagement from "./pages/lecturer/CourseManagement";
import CourseDetail from "./pages/lecturer/CourseDetail";
import UploadDocAIGen from "./pages/lecturer/UploadDocAIGen";
import GenerateExamLink from "./pages/lecturer/GenerateExamLink";
import CreateExam from "./pages/lecturer/CreateExam";
import ExamAnalytics from "./pages/lecturer/ExamAnalytics";
import ExamResultsList from "./pages/lecturer/ExamResultsList";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import IntegrityOverview from "./pages/admin/IntegrityOverview";
import MetricMethodologyReference from "./pages/admin/MetricMethodologyReference";
import TransparencyDashboard from "./pages/admin/TransparencyDashboard";
import UserRoleManagement from "./pages/admin/UserRoleManagement";
import SystemPolicyConfig from "./pages/admin/SystemPolicyConfig";
import AuditLogViewer from "./pages/admin/AuditLogViewer";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />

              {/* ================= STUDENT ================= */}
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/exams" element={<StudentDashboard />} />
              <Route path="/student/results" element={<StudentDashboard />} />
              <Route path="/student/feedback" element={<FeedbackDetail />} />
              <Route path="/student/timeline" element={<ExamEventTimeline />} />
              <Route path="/student/grading" element={<GradingBreakdown />} />
              <Route path="/student/exam-ready" element={<ExamReadyCheck />} />
              <Route path="/student/exam-taking" element={<ExamTaking />} />
              <Route
                path="/student/learning-feedback"
                element={<LearningFeedbackDetail />}
              />
              <Route path="/student/join-exam" element={<JoinExam />} />
              <Route path="/student/scan-qr" element={<ScanQRJoinExam />} />
              <Route path="/student/offline-download" element={<OfflineExamDownload />} />

              {/* ================= LECTURER ================= */}
              <Route path="/lecturer" element={<LecturerDashboard />} />
              <Route path="/lecturer/exams" element={<LecturerDashboard />} />

              {/* ✅ ROUTE QUAN TRỌNG – ĐÃ FIX */}
              <Route
                path="/lecturer/exam/:id/monitor"
                element={<ExamMonitor />}
              />
              <Route path="/lecturer/exam/:id/results" element={<ExamResultsList />} />

              <Route
                path="/lecturer/question-bank"
                element={<QuestionBankManagement />}
              />
              <Route
                path="/lecturer/question-editor"
                element={<QuestionEditor />}
              />
              <Route
                path="/lecturer/question-history"
                element={<QuestionHistoryAnalysis />}
              />
              <Route
                path="/lecturer/exam-rule-config"
                element={<AdvancedExamRuleConfig />}
              />
              <Route path="/lecturer/courses" element={<CourseManagement />} />
              <Route path="/lecturer/create-course" element={<CreateCourse />} />
              <Route path="/lecturer/course/:id" element={<CourseDetail />} />
              <Route path="/lecturer/upload-doc-ai" element={<UploadDocAIGen />} />
              <Route path="/lecturer/generate-link" element={<GenerateExamLink />} />
              <Route path="/lecturer/exams/create" element={<CreateExam />} />
              <Route path="/lecturer/analytics" element={<ExamAnalytics />} />

              {/* ================= ADMIN ================= */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminDashboard />} />
              <Route path="/admin/integrity" element={<IntegrityOverview />} />
              <Route path="/admin/settings" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<AdminDashboard />} />
              <Route
                path="/admin/metrics"
                element={<MetricMethodologyReference />}
              />
              <Route
                path="/admin/transparency"
                element={<TransparencyDashboard />}
              />
              <Route path="/admin/user-management" element={<UserRoleManagement />} />
              <Route path="/admin/system-policy" element={<SystemPolicyConfig />} />
              <Route path="/admin/audit-logs" element={<AuditLogViewer />} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
