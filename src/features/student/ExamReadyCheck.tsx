"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Loader2, Monitor, RefreshCw, Shield, Wifi } from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import api from "@/lib/api";

type CheckStatus = "pending" | "checking" | "passed" | "failed";
type ExamStep = "system-check" | "ready";

interface SystemCheck {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: CheckStatus;
  detail?: string;
}

const defaultExamInfo = {
  title: "Bài thi cuối kỳ Cấu trúc dữ liệu",
  course: "CS201 - Khoa Công nghệ thông tin",
  duration: 120,
  totalQuestions: 45,
  sessionId: "EXM-2026-DS-001",
};

export default function ExamReadyCheck() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId") || undefined;

  const examInfo = {
    title: searchParams.get("title")
      ? decodeURIComponent(searchParams.get("title")!)
      : defaultExamInfo.title,
    course: searchParams.get("course")
      ? decodeURIComponent(searchParams.get("course")!)
      : defaultExamInfo.course,
    duration: searchParams.get("duration")
      ? Number(searchParams.get("duration"))
      : defaultExamInfo.duration,
    totalQuestions: defaultExamInfo.totalQuestions,
    sessionId: searchParams.get("examId")
      ? `EXM-2026-${searchParams.get("examId")}`
      : defaultExamInfo.sessionId,
  };

  const [currentStep, setCurrentStep] = useState<ExamStep>("system-check");
  const [agreed, setAgreed] = useState(false);
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: "internet",
      label: "Kết nối Internet",
      icon: <Wifi className="h-4 w-4" />,
      status: "pending",
    },
    {
      id: "browser",
      label: "Hỗ trợ toàn màn hình",
      icon: <Monitor className="h-4 w-4" />,
      status: "pending",
    },
  ]);
  const [allChecksPassed, setAllChecksPassed] = useState(false);
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let mounted = true;

    (async () => {
      try {
        setCheckingAttempt(true);
        const existing = await api.getMyExamSubmission(examId);
        if (!mounted || !existing) return;
        const status = String(existing.status || "").toUpperCase();
        if (["SUBMITTED", "GRADED", "FLAGGED", "IN_PROGRESS"].includes(status)) {
          setCurrentStep("system-check");
        }
      } catch {
        // ignore missing submission
      } finally {
        if (mounted) setCheckingAttempt(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [examId]);

  const updateCheck = useCallback((id: string, status: CheckStatus, detail?: string) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status, detail } : c)));
  }, []);

  const runSystemChecks = useCallback(async () => {
    setIsRunningChecks(true);
    setChecks((prev) =>
      prev.map((c) => ({ ...c, status: "checking" as CheckStatus, detail: undefined })),
    );

    if (navigator.onLine) {
      updateCheck("internet", "passed", "Kết nối ổn định");
    } else {
      updateCheck("internet", "failed", "Không phát hiện kết nối Internet");
    }
    await new Promise((r) => setTimeout(r, 300));

    if (document.documentElement.requestFullscreen) {
      updateCheck("browser", "passed", "Trình duyệt hỗ trợ chế độ toàn màn hình");
    } else {
      updateCheck("browser", "failed", "Trình duyệt này không hỗ trợ chế độ toàn màn hình");
    }

    setIsRunningChecks(false);
  }, [updateCheck]);

  useEffect(() => {
    runSystemChecks();
  }, [runSystemChecks]);

  useEffect(() => {
    setAllChecksPassed(checks.every((c) => c.status === "passed"));
  }, [checks]);

  const passedCount = checks.filter((c) => c.status === "passed").length;
  const failedCount = checks.filter((c) => c.status === "failed").length;

  const handleStartExam = async () => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch {
      /* continue */
    }

    if (!examId) {
      toast.error("Thiếu mã bài thi. Vui lòng mở lại bài thi từ trang tổng quan.");
      return;
    }

    try {
      const res = await api.startExam(examId);
      if (!res?.id) {
        toast.error("Không thể bắt đầu lượt thi. Vui lòng thử lại.");
        return;
      }
      try {
        localStorage.setItem("currentSubmissionId", res.id);
        localStorage.setItem("currentSubmissionExamId", examId);
      } catch {}
    } catch (err: any) {
      console.error("Failed to start submission on server:", err);
      toast.error(err?.message || "Không thể bắt đầu bài thi. Vui lòng thử lại.");
      return;
    }

    router.push(`/student/exam-taking?examId=${encodeURIComponent(examId)}`);
  };

  const handleProceed = () => {
    if (!allChecksPassed) return;
    if (!agreed) return;
    setCurrentStep("ready");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <BackToDashboardButton to="/student" className="mb-4 -ml-2" />

        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="mb-1 text-xl">{examInfo.title}</CardTitle>
                <CardDescription>{examInfo.course}</CardDescription>
              </div>
              <StatusBadge tone="info">PHIÊN THI CHÍNH THỨC</StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">{examInfo.duration}</p>
                <p className="text-xs text-muted-foreground">Phút</p>
              </div>
              <div>
                <FileText className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">{examInfo.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Câu hỏi</p>
              </div>
              <div>
                <Shield className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">Có giám sát</p>
                <p className="text-xs text-muted-foreground">Chế độ</p>
              </div>
              <div>
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">Sẵn sàng</p>
                <p className="text-xs text-muted-foreground">Kiểm tra hệ thống</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 flex items-center justify-between px-4">
          {[
            { key: "system-check", label: "Kiểm tra", number: 1 },
            { key: "ready", label: "Bắt đầu", number: 2 },
          ].map((step, i) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                    i < (currentStep === "ready" ? 1 : 0)
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === (currentStep === "ready" ? 1 : 0)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    i <= (currentStep === "ready" ? 1 : 0)
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < 1 && <div className="mx-1 mb-4 h-0.5 w-16 bg-border" />}
            </div>
          ))}
        </div>

        {currentStep === "system-check" && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Kiểm tra điều kiện dự thi</CardTitle>
                    <CardDescription>
                      Hệ thống kiểm tra kết nối và chế độ toàn màn hình trước khi bạn bắt đầu.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={runSystemChecks} disabled={isRunningChecks}>
                    <RefreshCw className={`h-4 w-4 ${isRunningChecks ? "animate-spin" : ""}`} />
                    Kiểm tra lại
                  </Button>
                </div>
                <Progress value={(passedCount / checks.length) * 100} className="mt-3 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Đạt {passedCount}/{checks.length} mục{failedCount > 0 && `, ${failedCount} mục chưa đạt`}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        check.status === "passed"
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : check.status === "failed"
                            ? "border-rose-500/30 bg-rose-500/10"
                            : check.status === "checking"
                              ? "border-blue-500/30 bg-blue-500/10"
                              : "border-border bg-card"
                      }`}
                    >
                      <div className="shrink-0">{check.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{check.label}</p>
                        {check.detail && <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>}
                      </div>
                      <div className="shrink-0">
                        {check.status === "checking" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                        {check.status === "passed" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                        {check.status === "failed" && <AlertTriangle className="h-5 w-5 text-rose-500" />}
                        {check.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-border" />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Lưu ý về tính toàn vẹn và công bằng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>Nên sử dụng chế độ toàn màn hình trong suốt phiên thi.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>
                      Nền tảng ghi nhận tín hiệu bất thường để giảng viên xem xét, không tự động kết luận gian lận.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>Vui lòng duy trì kết nối Internet ổn định trong phiên thi.</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="cursor-pointer text-sm leading-relaxed">
                    Tôi đã hiểu và đồng ý với quy định của phiên thi, đồng thời xác nhận sẽ tự mình hoàn thành bài thi.
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleProceed} disabled={!allChecksPassed || !agreed} className="flex-1 h-11 gap-2" size="lg">
                {!allChecksPassed ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Cần hoàn tất kiểm tra hệ thống
                  </>
                ) : !agreed ? (
                  <>
                    <Shield className="h-4 w-4" />
                    Đồng ý quy định để tiếp tục
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Tiếp tục
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => router.push("/student")} className="h-11">
                Quay lại
              </Button>
            </div>
          </>
        )}

        {currentStep === "ready" && (
          <>
            <Card className="mb-4">
              <CardContent className="pb-6 pt-6">
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-xl font-semibold text-foreground">Sẵn sàng bắt đầu</h2>
                    <p className="text-muted-foreground">Phiên thi đã sẵn sàng. Bạn có thể bắt đầu ngay.</p>
                    {checkingAttempt && <p className="mt-2 text-xs text-muted-foreground">Đang kiểm tra trạng thái lượt thi...</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleStartExam}
                className="flex-1 h-12 gap-2 text-base"
                size="lg"
                disabled={checkingAttempt}
              >
                <ArrowRight className="h-5 w-5" />
                Bắt đầu làm bài
              </Button>
              <BackToDashboardButton to="/student" label="Về trang tổng quan" variant="outline" size="default" className="h-12" />
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Mã phiên: {examInfo.sessionId} • Mã hóa SSL • Đang ghi nhận tín hiệu phiên thi
        </p>
      </div>
    </DashboardLayout>
  );
}



