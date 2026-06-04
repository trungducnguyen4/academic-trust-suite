import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { NotificationPopupProvider, useNotificationPopup } from "@/contexts/NotificationPopupContext";
import NotificationPopup from "@/components/common/NotificationPopup";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/Notifications";
import Privacy from "./pages/Privacy";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import FeedbackDetail from "./pages/student/FeedbackDetail";
import ExamEventTimeline from "./pages/student/ExamEventTimeline";
import GradingBreakdown from "./pages/student/GradingBreakdown";
import ExamTaking from "./pages/student/ExamTaking";
import ExamReadyCheck from "./pages/student/ExamReadyCheck";
import LearningFeedbackDetail from "./pages/student/LearningFeedbackDetail";
import JoinExam from "./pages/student/JoinExam";
import JoinExamByLink from "./pages/student/JoinExamByLink";
import ScanQRJoinExam from "./pages/student/ScanQRJoinExam";
import StudentCourseDetail from "./pages/student/StudentCourseDetail";
import StudentExams from "./pages/student/StudentExams";
import StudentResults from "./pages/student/StudentResults";
import StudentCourses from "./pages/student/StudentCourses";
import StudentExamDetail from "./pages/student/StudentExamDetail";
import StudentResultDetail from "./pages/student/StudentResultDetail";
import StudentSchedule from "./pages/student/StudentSchedule";

// Lecturer
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import QuestionBankManagement from "./pages/lecturer/QuestionBankManagement";
import QuestionEditor from "./pages/lecturer/QuestionEditor";
import QuestionHistoryAnalysis from "./pages/lecturer/QuestionHistoryAnalysis";
import AdvancedExamRuleConfig from "./pages/lecturer/AdvancedExamRuleConfig";
import ExamMonitor from "./pages/lecturer/ExamMonitor";
import ExamManagement from "./pages/lecturer/ExamManagement";
import CreateCourse from "./pages/lecturer/CreateCourse";
import CourseDetail from "./pages/lecturer/CourseDetail";
import UploadDocAIGen from "./pages/lecturer/UploadDocAIGen";
import GenerateExamLink from "./pages/lecturer/GenerateExamLink";
import CreateExam from "./pages/lecturer/CreateExam";
import ExamAnalytics from "./pages/lecturer/ExamAnalytics";
import ExamResultsList from "./pages/lecturer/ExamResultsList";
import ExamPreview from "./pages/lecturer/ExamPreview";
import ExamQR from "./pages/lecturer/ExamQR";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import IntegrityOverview from "./pages/admin/IntegrityOverview";
import MetricMethodologyReference from "./pages/admin/MetricMethodologyReference";
import TransparencyDashboard from "./pages/admin/TransparencyDashboard";
import UserRoleManagement from "./pages/admin/UserRoleManagement";
import SystemPolicyConfig from "./pages/admin/SystemPolicyConfig";
import AuditLogViewer from "./pages/admin/AuditLogViewer";
import AdminCourseManagement from "./pages/admin/CourseManagement";
import AdminExamManagement from "./pages/admin/ExamManagement";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component that renders the notification popup
function NotificationPopupContainer() {
  const { showNotifications } = useNotificationPopup();
  return <NotificationPopup notifications={showNotifications} position="top-right" />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <NotificationPopupProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NotificationPopupContainer />

            <BrowserRouter>
              <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* ================= STUDENT ================= */}
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/courses" element={<StudentCourses />} />
              <Route path="/student/exams" element={<StudentExams />} />
              <Route path="/student/exams/:id" element={<StudentExamDetail />} />
              <Route path="/student/schedule" element={<StudentSchedule />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route
                path="/student/results/:examId"
                element={<StudentResultDetail />}
              />
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
              <Route path="/student/join/:token" element={<JoinExamByLink />} />
              <Route path="/student/scan-qr" element={<ScanQRJoinExam />} />
              <Route
                path="/student/courses/:id"
                element={<StudentCourseDetail />}
              />
              <Route
                path="/student/course/:id"
                element={<StudentCourseDetail />}
              />

              {/* ================= LECTURER ================= */}
              <Route path="/lecturer" element={<LecturerDashboard />} />
              <Route path="/lecturer/exams" element={<ExamManagement />} />

              {/* Key route - fixed */}
              <Route
                path="/lecturer/exam/:id/monitor"
                element={<ExamMonitor />}
              />
              <Route path="/lecturer/exam/:id/preview" element={<ExamPreview />} />
              <Route path="/lecturer/exam/:id/qr" element={<ExamQR />} />
              <Route path="/lecturer/exam/:id/results" element={<ExamResultsList />} />
              <Route
                path="/lecturer/exam/:id/preview"
                element={<ExamPreview />}
              />
              <Route
                path="/lecturer/exam/:id/results"
                element={<ExamResultsList />}
              />

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
              <Route path="/lecturer/courses" element={<CreateCourse />} />
              <Route
                path="/lecturer/create-course"
                element={<CreateCourse />}
              />
              <Route path="/lecturer/course/:id" element={<CourseDetail />} />
              <Route
                path="/lecturer/upload-doc-ai"
                element={<UploadDocAIGen />}
              />
              <Route
                path="/lecturer/generate-link"
                element={<GenerateExamLink />}
              />
              <Route path="/lecturer/exams/create" element={<CreateExam />} />
              <Route path="/lecturer/analytics" element={<ExamAnalytics />} />

              {/* ================= ADMIN ================= */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/exams" element={<AdminExamManagement />} />
              <Route path="/admin/exam/:id/monitor" element={<ExamMonitor />} />
              <Route path="/admin/exam/:id/preview" element={<ExamPreview />} />
              <Route path="/admin/exam/:id/qr" element={<ExamQR />} />
              <Route path="/admin/exam/:id/results" element={<ExamResultsList />} />
              <Route
                path="/admin/courses"
                element={<AdminCourseManagement />}
              />
              <Route path="/admin/course/:id" element={<CourseDetail />} />
              <Route
                path="/admin/question-bank"
                element={<QuestionBankManagement />}
              />
              <Route
                path="/admin/question-editor"
                element={<QuestionEditor />}
              />
              <Route
                path="/admin/question-history"
                element={<QuestionHistoryAnalysis />}
              />
              <Route path="/admin/users" element={<UserRoleManagement />} />
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
              <Route
                path="/admin/user-management"
                element={<UserRoleManagement />}
              />
              <Route
                path="/admin/system-policy"
                element={<SystemPolicyConfig />}
              />
              <Route path="/admin/audit-logs" element={<AuditLogViewer />} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
          </NotificationPopupProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
