import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  title: "Data Structures Final Exam",
  course: "CS201 — Faculty of Computer Science",
  duration: 120,
  totalQuestions: 45,
  sessionId: "EXM-2026-DS-001",
};

export default function ExamReadyCheck() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      label: "Internet Connection",
      icon: <Wifi className="h-4 w-4" />,
      status: "pending",
    },
    {
      id: "browser",
      label: "Fullscreen Support",
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
      updateCheck("internet", "passed", "Connection stable");
    } else {
      updateCheck("internet", "failed", "No internet connection detected");
    }
    await new Promise((r) => setTimeout(r, 300));

    if (document.documentElement.requestFullscreen) {
      updateCheck("browser", "passed", "Fullscreen supported by this browser/environment");
    } else {
      updateCheck("browser", "failed", "Fullscreen is not available in this browser/environment");
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
      toast.error("Missing exam id. Please re-open the exam from your dashboard.");
      return;
    }

    try {
      const res = await api.startExam(examId);
      if (!res?.id) {
        toast.error("Could not start exam submission. Please try again.");
        return;
      }
      try {
        localStorage.setItem("currentSubmissionId", res.id);
        localStorage.setItem("currentSubmissionExamId", examId);
      } catch {}
    } catch (err: any) {
      console.error("Failed to start submission on server:", err);
      toast.error(err?.message || "Failed to start exam. Please try again.");
      return;
    }

    navigate(`/student/exam-taking?examId=${encodeURIComponent(examId)}`);
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
              <StatusBadge tone="info">OFFICIAL SESSION</StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">{examInfo.duration}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div>
                <FileText className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">{examInfo.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <Shield className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">Proctored</p>
                <p className="text-xs text-muted-foreground">Mode</p>
              </div>
              <div>
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">Ready</p>
                <p className="text-xs text-muted-foreground">System check</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 flex items-center justify-between px-4">
          {[
            { key: "system-check", label: "System Check", number: 1 },
            { key: "ready", label: "Start", number: 2 },
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
                    <CardTitle className="text-lg">System Readiness Check</CardTitle>
                    <CardDescription>
                      We verify connection and fullscreen support before you can start the exam.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={runSystemChecks} disabled={isRunningChecks}>
                    <RefreshCw className={`h-4 w-4 ${isRunningChecks ? "animate-spin" : ""}`} />
                    Recheck
                  </Button>
                </div>
                <Progress value={(passedCount / checks.length) * 100} className="mt-3 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {passedCount}/{checks.length} checks passed{failedCount > 0 && ` · ${failedCount} failed`}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        check.status === "passed"
                          ? "border-emerald-200 bg-emerald-50/60"
                          : check.status === "failed"
                            ? "border-rose-200 bg-rose-50/60"
                            : check.status === "checking"
                              ? "border-blue-200 bg-blue-50/60"
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
                  Integrity & Fairness Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>Fullscreen is recommended for proctored exams.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>
                      The platform records suspicious activity for instructor review, but does not automatically decide cheating.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p>Please keep a stable internet connection during the exam session.</p>
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
                    I understand and agree to the exam rules and proctoring conditions. I confirm that I will complete this exam independently.
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleProceed} disabled={!allChecksPassed || !agreed} className="flex-1 h-11 gap-2" size="lg">
                {!allChecksPassed ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    System Checks Required
                  </>
                ) : !agreed ? (
                  <>
                    <Shield className="h-4 w-4" />
                    Accept Agreement to Continue
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/student")} className="h-11">
                Back
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
                    <h2 className="mb-1 text-xl font-semibold text-foreground">Ready to Start!</h2>
                    <p className="text-muted-foreground">The exam is ready. You may begin now.</p>
                    {checkingAttempt && <p className="mt-2 text-xs text-muted-foreground">Checking attempt status...</p>}
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
                Start Exam Now
              </Button>
              <BackToDashboardButton to="/student" label="Return to Dashboard" variant="outline" size="default" className="h-12" />
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Session ID: {examInfo.sessionId} · SSL Encrypted · Proctoring Active
        </p>
      </div>
    </DashboardLayout>
  );
}
