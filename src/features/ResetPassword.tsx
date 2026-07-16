"use client";

import { useState } from 'react';
import Link from "next/link";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      setError('Không tìm thấy địa chỉ email. Vui lòng kiểm tra và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main id="main-content" className="page-surface flex min-h-[100dvh] items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-medium sm:p-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-foreground">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">ExamTrust</span>
          </Link>
        </div>

        {isSubmitted ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Kiểm tra email của bạn</h1>
            <p className="text-muted-foreground mt-2 mb-6">
              Liên kết đặt lại mật khẩu đã được gửi đến <strong>{email}</strong>.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground mt-8">Đặt lại mật khẩu</h1>
            <p className="text-muted-foreground mt-2 mb-6">
              Nhập địa chỉ email để nhận liên kết đặt lại mật khẩu.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Địa chỉ email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tenban@truong.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gửi liên kết đặt lại
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}



