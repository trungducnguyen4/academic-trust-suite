"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Users,
  BookOpen,
  Shield,
  GraduationCap,
  CalendarDays,
  LogOut,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Bell,
  Menu,
  X,
  User,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
}

const studentNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/student",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
  },
  {
    title: "My Courses",
    href: "/student/courses",
    icon: <GraduationCap className="h-[18px] w-[18px]" />,
  },
  {
    title: "My Exams",
    href: "/student/exams",
    icon: <FileText className="h-[18px] w-[18px]" />,
  },
  {
    title: "Schedule",
    href: "/student/schedule",
    icon: <CalendarDays className="h-[18px] w-[18px]" />,
  },
  {
    title: "Results",
    href: "/student/results",
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
  },
];

const lecturerNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/lecturer",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
  },
  {
    title: "Courses",
    href: "/lecturer/courses",
    icon: <GraduationCap className="h-[18px] w-[18px]" />,
  },
  {
    title: "Exams",
    href: "/lecturer/exams",
    icon: <FileText className="h-[18px] w-[18px]" />,
  },
  {
    title: "Question Bank",
    href: "/lecturer/question-bank",
    icon: <BookOpen className="h-[18px] w-[18px]" />,
  },
  {
    title: "Analytics",
    href: "/lecturer/analytics",
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
  },
];

const adminNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
  },
  {
    title: "Courses",
    href: "/admin/courses",
    icon: <GraduationCap className="h-[18px] w-[18px]" />,
  },
  {
    title: "Exams",
    href: "/admin/exams",
    icon: <FileText className="h-[18px] w-[18px]" />,
  },
  {
    title: "Question Bank",
    href: "/admin/question-bank",
    icon: <BookOpen className="h-[18px] w-[18px]" />,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: <Users className="h-[18px] w-[18px]" />,
  },
  {
    title: "Integrity",
    href: "/admin/integrity",
    icon: <Shield className="h-[18px] w-[18px]" />,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-[18px] w-[18px]" />,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  notifications?: Array<{
    id: string;
    type?: "info" | "warning" | "error";
    title: string;
    message: string;
    time?: string | Date;
  }>;
}

export function DashboardLayout({
  children,
  notifications = [],
}: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    notifications: liveNotifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const effectiveNotifications =
    liveNotifications.length > 0
      ? liveNotifications.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          time: item.createdAt,
          isRead: item.isRead,
          link: item.link,
        }))
      : notifications.map((item) => ({
          ...item,
          isRead: false,
          link: null,
        }));

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const navItems =
    user.role === "STUDENT"
      ? studentNavItems
      : user.role === "LECTURER"
        ? lecturerNavItems
        : adminNavItems;

  const roleLabel =
    user.role === "STUDENT"
      ? "Student"
      : user.role === "LECTURER"
        ? "Lecturer"
        : "Administrator";

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-4",
          !isMobile && collapsed ? "justify-center" : "gap-3",
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
        </div>
        {(isMobile || !collapsed) && (
          <span className="font-bold text-sidebar-foreground text-base tracking-tight">
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
          const isActive = pathname === item.href;
          const link = (
            <Link
              key={item.href}
              href={item.href as any}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                !isMobile && collapsed && "justify-center px-0",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {(isMobile || !collapsed) && <span>{item.title}</span>}
              {(isMobile || !collapsed) && isActive && (
                <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
              )}
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
            className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md p-2",
            !isMobile && collapsed && "justify-center",
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {user.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {(isMobile || !collapsed) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user.fullName}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
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
              className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md"
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
                className="flex w-full items-center justify-center rounded-md p-2 mt-2 text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
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
            className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar (overlay) */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-[280px] bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebarContent(true)}
        </aside>

        {/* Desktop sidebar (fixed) */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out hidden lg:block",
            sidebarWidth,
          )}
        >
          {sidebarContent(false)}
        </aside>

        {/* Main content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out w-full",
            "lg:ml-[260px]",
            collapsed && "lg:ml-[72px]",
            !collapsed && "lg:ml-[260px]",
          )}
        >
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground h-8 w-8"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => void markAllAsRead()}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  {notificationsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <p className="text-sm">Loading notifications...</p>
                    </div>
                  ) : effectiveNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto p-2">
                      {effectiveNotifications.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-lg px-3 py-2.5 hover:bg-muted/60",
                            !item.isRead && "bg-primary/5",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              className="text-left flex-1"
                              onClick={async () => {
                                if (!item.isRead) await markAsRead(item.id);
                                if (item.link) {
                                  router.push(item.link);
                                }
                              }}
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.message}
                              </p>
                            </button>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {item.time
                                  ? new Date(item.time).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                              <div className="flex items-center gap-1">
                                {!item.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => void markAsRead(item.id)}
                                  >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {liveNotifications.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground"
                                    onClick={() =>
                                      void removeNotification(item.id)
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="px-2 pt-1 pb-2">
                        <Button
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => router.push("/notifications")}
                        >
                          Open full notifications
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-8 px-2 rounded-lg"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden sm:block">
                      <span className="text-muted-foreground">Hello, </span>
                      <span className="font-semibold text-foreground">
                        {user.fullName.split(" ")[0]}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export { FileText };



