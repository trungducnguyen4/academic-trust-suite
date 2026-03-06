import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, GraduationCap, ArrowRight } from 'lucide-react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, addHours } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function BellDropdown() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  // Close when click outside both button and dropdown
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function handleBell() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    console.warn('[BellDropdown] toggle open ->', !open);
    setOpen((v) => !v);
  }

  const items = [
    { id: '1', type: 'info', message: 'Results for "Quiz 1 - Python Basics" are available', time: addHours(new Date(), -2) },
    { id: '2', type: 'warning', message: 'Reminder: "Midterm Exam - Data Structures" is coming up', time: addHours(new Date(), -5) },
  ];

  return (
    <>
      <Button
        ref={btnRef}
        variant="ghost"
        className="relative h-9 w-9 rounded-xl pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          handleBell();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBell();
          }
        }}
        aria-haspopup="true"
        aria-expanded={open}
        tabIndex={0}
      >
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notifications</span>
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-border" />
      </Button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-[9999] w-[min(96vw,380px)] rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <span className="font-semibold text-base">Notifications</span>
            <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {items.length} new
            </span>
          </div>

          {/* Items */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/40">
            {items.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors cursor-pointer">
                {/* avatar / icon placeholder */}
                <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                  n.type === 'warning' ? 'bg-amber-500/15 text-amber-600' : 'bg-blue-500/15 text-blue-600'
                }`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(n.time, { addSuffix: true })}</p>
                </div>
                {/* unread dot */}
                <div className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full ${n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-secondary/30">
            <Link
              to="/notifications"
              className="block text-center text-sm font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-shadow group-hover:shadow-glow-blue">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-lg tracking-tight">ExamTrust</span>
        </Link>

        <nav className="flex items-center gap-3">
          {/* Notifications dropdown (custom for robustness) */}
          <BellDropdown />
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-xl">
                  <Avatar className="h-9 w-9 ring-2 ring-border">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
                      {user.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive rounded-lg">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-xl gap-2 px-5 shadow-sm">
              <Link to="/login">
                Sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
