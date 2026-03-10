import { ReactNode, useState, useEffect } from 'react';
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
  PanelLeftClose,
  PanelLeft,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderNotification {
  id: string;
  message: string;
  time: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
}

const studentNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/student', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { title: 'My Exams', href: '/student/exams', icon: <FileText className="h-[18px] w-[18px]" /> },
  { title: 'Results', href: '/student/results', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
];

const lecturerNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/lecturer', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { title: 'Courses', href: '/lecturer/create-course', icon: <GraduationCap className="h-[18px] w-[18px]" /> },
  { title: 'Exams', href: '/lecturer/exams', icon: <FileText className="h-[18px] w-[18px]" /> },
  { title: 'Question Bank', href: '/lecturer/question-bank', icon: <BookOpen className="h-[18px] w-[18px]" /> },
  { title: 'Analytics', href: '/lecturer/analytics', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
];

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { title: 'Users', href: '/admin/users', icon: <Users className="h-[18px] w-[18px]" /> },
  { title: 'Integrity', href: '/admin/integrity', icon: <Shield className="h-[18px] w-[18px]" /> },
  { title: 'Settings', href: '/admin/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // TODO: Replace with API-backed notifications once endpoint is available.
  const notifications: HeaderNotification[] = [];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = 
    user.role === 'STUDENT' ? studentNavItems :
    user.role === 'LECTURER' ? lecturerNavItems :
    adminNavItems;

  const roleLabel = 
    user.role === 'STUDENT' ? 'Student' :
    user.role === 'LECTURER' ? 'Lecturer' :
    'Administrator';

  const roleColor =
    user.role === 'STUDENT' ? 'bg-blue-500/20 text-blue-400' :
    user.role === 'LECTURER' ? 'bg-violet-500/20 text-violet-400' :
    'bg-emerald-500/20 text-emerald-400';

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  // Shared sidebar content — used for both desktop and mobile
  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border px-4",
        !isMobile && collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-inner-glow">
          <GraduationCap className="h-5 w-5" />
        </div>
        {(isMobile || !collapsed) && (
          <span className="font-bold text-sidebar-foreground text-lg tracking-tight">
            ExamTrust
          </span>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 mt-2 overflow-y-auto">
        {(isMobile || !collapsed) && (
          <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const link = (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                !isMobile && collapsed && 'justify-center px-0',
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow-blue/20"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {(isMobile || !collapsed) && <span>{item.title}</span>}
              {(isMobile || !collapsed) && isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
            </Link>
          );

          if (!isMobile && collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl p-2 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-xl p-2",
          !isMobile && collapsed && 'justify-center'
        )}>
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-sidebar-accent">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {user.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {(isMobile || !collapsed) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.fullName}</p>
              <span className={cn("inline-flex items-center mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", roleColor)}>
                {roleLabel}
              </span>
            </div>
          )}
        </div>
        {(isMobile || !collapsed) && (
          <>
            <Separator className="my-2 bg-sidebar-border" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </>
        )}
        {!isMobile && collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex w-full items-center justify-center rounded-xl p-2 mt-2 text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar (overlay) */}
        <aside className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[280px] sidebar-gradient border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {sidebarContent(true)}
        </aside>

        {/* Desktop sidebar (fixed) */}
        <aside className={cn(
          "fixed left-0 top-0 z-40 h-screen sidebar-gradient border-r border-sidebar-border transition-all duration-300 ease-in-out hidden lg:block",
          sidebarWidth
        )}>
          {sidebarContent(false)}
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out w-full",
          "lg:ml-[260px]",
          collapsed && "lg:ml-[72px]",
          !collapsed && "lg:ml-[260px]"
        )}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2 lg:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl text-muted-foreground hover:text-foreground h-9 w-9"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {notifications.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span className="sr-only">Open notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-xl">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="text-xs text-muted-foreground">{notifications.length}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      There's no notification.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start gap-1 py-2"
                      >
                        <span className="text-sm leading-snug">{notification.message}</span>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="text-sm hidden sm:block">
                <span className="text-muted-foreground">Hello, </span>
                <span className="font-semibold text-foreground">{user.fullName.split(' ')[0]}</span>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-6 xl:p-8">
            <div className="mx-auto max-w-[1400px]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
