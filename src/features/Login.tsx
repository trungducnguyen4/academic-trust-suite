"use client";

import { useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPopup } from '@/contexts/NotificationPopupContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { addNotification } = useNotificationPopup();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      
      // Show welcome notification
      addNotification({
        title: 'Welcome back!',
        message: 'You have successfully logged in.',
        type: 'success',
      });

      // Try to fetch and show recent notifications
      try {
        const notificationsRes = await api.getMyNotifications({ limit: 3, unreadOnly: true });
        const recentNotifications = notificationsRes.data || [];
        
        if (Array.isArray(recentNotifications) && recentNotifications.length > 0) {
          // Show recent notifications
          recentNotifications.forEach((notif: any) => {
            addNotification({
              title: notif.title || 'Notification',
              message: notif.message || notif.content || 'You have a new notification',
              type: notif.type || 'info',
              timestamp: notif.createdAt ? new Date(notif.createdAt) : new Date(),
            });
          });
        }
      } catch (error) {
        // Silently fail notification fetch
        console.debug('Could not fetch recent notifications:', error);
      }

      const user = email.toLowerCase();
      if (user.includes('student')) {
        router.push('/student');
      } else if (user.includes('lecturer')) {
        router.push('/lecturer');
      } else if (user.includes('admin')) {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('failed to fetch')) {
        setError('Cannot connect to server. Please ensure backend is running on port 3001.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
          </div>
          <span className="text-base">ExamTrust</span>
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to home
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[420px]">
          <div className="bg-card border border-border rounded-lg p-8 shadow-soft">
            {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">ExamTrust</span>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Sign in to your account
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
              </p>

              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Need an account?{' '}
                <a href="#" className="text-primary hover:underline font-medium">Sign up</a>
              </p>
              <Link href="/reset-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 bg-card border border-border rounded-lg p-5">
            <p className="text-xs text-muted-foreground font-medium text-center mb-3 uppercase tracking-wider">
              Demo Accounts
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@tdhuhu.edu.vn');
                    setPassword('123123123Az!');
                  }}
                  className="text-primary hover:underline"
                >
                  <strong>Admin:</strong> admin@tdhuhu.edu.vn / 123123123Az!
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('lecturer01@tdhuhu.edu.vn');
                    setPassword('123123123Az!');
                  }}
                  className="text-primary hover:underline"
                >
                  <strong>Lecturer:</strong> lecturer01@tdhuhu.edu.vn / 123123123Az!
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('522h0001@tdhuhu.edu.vn');
                    setPassword('123123123Az!');
                  }}
                  className="text-primary hover:underline"
                >
                  <strong>Student:</strong> 522h0001@tdhuhu.edu.vn / 123123123Az!
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Product</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Sign Up</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Legal</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Support</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Connect</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2024 ExamTrust. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}



