import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import StudentDashboard from "./pages/student/StudentDashboard";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import IntegrityOverview from "./pages/admin/IntegrityOverview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/exams" element={<StudentDashboard />} />
            <Route path="/student/results" element={<StudentDashboard />} />
            
            {/* Lecturer Routes */}
            <Route path="/lecturer" element={<LecturerDashboard />} />
            <Route path="/lecturer/exams" element={<LecturerDashboard />} />
            <Route path="/lecturer/exams/create" element={<LecturerDashboard />} />
            <Route path="/lecturer/questions" element={<LecturerDashboard />} />
            <Route path="/lecturer/analytics" element={<LecturerDashboard />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminDashboard />} />
            <Route path="/admin/integrity" element={<IntegrityOverview />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<AdminDashboard />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
