import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Clock,
  BarChart3,
  Settings,
  Users,
  BookOpen,
  Shield,
  GraduationCap,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
}

const studentNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/student', icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: 'My Exams', href: '/student/exams', icon: <FileText className="h-4 w-4" /> },
  { title: 'Results', href: '/student/results', icon: <BarChart3 className="h-4 w-4" /> },
];

const lecturerNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/lecturer', icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: 'Courses', href: '/lecturer/create-course', icon: <GraduationCap className="h-4 w-4" /> },
  { title: 'Exams', href: '/lecturer/exams', icon: <FileText className="h-4 w-4" /> },
  { title: 'Question Bank', href: '/lecturer/question-bank', icon: <BookOpen className="h-4 w-4" /> },
  { title: 'Analytics', href: '/lecturer/analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: 'Users', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
  { title: 'Integrity', href: '/admin/integrity', icon: <Shield className="h-4 w-4" /> },
  { title: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = 
    user.role === 'student' ? studentNavItems :
    user.role === 'lecturer' ? lecturerNavItems :
    adminNavItems;

  const roleLabel = 
    user.role === 'student' ? 'Student' :
    user.role === 'lecturer' ? 'Lecturer' :
    'Administrator';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">ExamTrust</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
