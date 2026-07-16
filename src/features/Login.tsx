"use client";

import { AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPopup } from "@/contexts/NotificationPopupContext";
import api from "@/lib/api";

const demoAccounts = [
  { role: "Quản trị viên", email: "admin@tdhuhu.edu.vn" },
  { role: "Giảng viên", email: "lecturer01@tdhuhu.edu.vn" },
  { role: "Sinh viên", email: "522h0001@tdhuhu.edu.vn" },
] as const;

const demoPassword = "123123123Az!";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const { addNotification } = useNotificationPopup();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await login(email, password);
      addNotification({
        title: "Đăng nhập thành công",
        message: "Phiên làm việc của bạn đã sẵn sàng.",
        type: "success",
      });

      try {
        const response = await api.getMyNotifications({ limit: 3, unreadOnly: true });
        const recentNotifications = response.data || [];
        if (Array.isArray(recentNotifications)) {
          recentNotifications.forEach((notification: any) => {
            addNotification({
              title: notification.title || "Thông báo",
              message: notification.message || notification.content || "Bạn có thông báo mới.",
              type: notification.type || "info",
              timestamp: notification.createdAt ? new Date(notification.createdAt) : new Date(),
            });
          });
        }
      } catch (notificationError) {
        console.debug("Could not fetch recent notifications:", notificationError);
      }

      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail.includes("lecturer")) router.push("/lecturer");
      else if (normalizedEmail.includes("admin")) router.push("/admin");
      else router.push("/student");
    } catch (loginError: any) {
      const message = String(loginError?.message || "").toLowerCase();
      setError(
        message.includes("failed to fetch")
          ? "Không thể kết nối máy chủ. Hãy kiểm tra backend tại cổng 3001."
          : "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
      );
    }
  };

  const applyDemoAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="page-surface min-h-[100dvh]">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            ExamTrust
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Trang chủ</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,0.55fr)] lg:py-16">
        <section className="hidden max-w-xl lg:block">
          <p className="text-sm font-semibold text-primary">Không gian làm việc an toàn</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-[-0.05em] xl:text-5xl">
            Tiếp tục công việc theo đúng vai trò của bạn
          </h1>
          <p className="mt-5 max-w-[54ch] text-base leading-7 text-muted-foreground">
            Sinh viên làm bài tập trung. Giảng viên quản lý đề thi. Quản trị viên theo dõi vận hành và toàn vẹn học thuật.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3" aria-label="Các vai trò được hỗ trợ">
            {demoAccounts.map((account) => (
              <div key={account.role} className="rounded-xl border border-border/70 bg-card/80 px-4 py-5 shadow-soft">
                <p className="text-sm font-semibold">{account.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">Không gian riêng</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-medium sm:p-8">
            <div>
              <p className="text-sm font-semibold text-primary">Chào mừng trở lại</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Đăng nhập ExamTrust</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Sử dụng tài khoản được nhà trường cấp.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-6" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="tenban@truong.edu.vn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link href="/reset-password" className="text-xs font-medium text-primary hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                Khi đăng nhập, bạn đồng ý với chính sách sử dụng và bảo vệ dữ liệu của nhà trường.
              </p>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Đang xác thực
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-card/70 p-4">
            <p className="text-sm font-semibold">Tài khoản demo</p>
            <p className="mt-1 text-xs text-muted-foreground">Chọn một vai trò để điền thông tin đăng nhập.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-11 whitespace-normal px-2 py-2 text-xs"
                  onClick={() => applyDemoAccount(account.email)}
                >
                  {account.role}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
