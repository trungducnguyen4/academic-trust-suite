import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, getStatusBadgeLabel } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Wifi,
  Monitor,
  Shield,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  Download,
  Package,
  LockKeyhole,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

type CheckStatus = "pending" | "checking" | "passed" | "failed";
type ExamStep = "download" | "system-check" | "locked" | "ready";

interface SystemCheck {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: CheckStatus;
  detail?: string;
}

// Mock exam info — in real app this would come from API/context
const defaultExamInfo = {
  title: "Data Structures Final Exam",
  course: "CS201 — Faculty of Computer Science",
  scheduledAt: new Date(),
  duration: 120,
  totalQuestions: 45,
  sessionId: "EXM-2026-DS-001",
  packageSize: "2.4 MB",
  // Simulate: lecturer has NOT unlocked the exam yet
  lecturerUnlocked: false,
};

export default function ExamReadyCheck() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requiresDownload = searchParams.get("download") !== "false";
  const examId = searchParams.get("examId") || undefined;

  // Build exam info from URL params (fallback to defaults)
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
    packageSize: defaultExamInfo.packageSize,
    lecturerUnlocked: defaultExamInfo.lecturerUnlocked,
  };

  // Step management — skip download step if not required
  const [currentStep, setCurrentStep] = useState<ExamStep>(
    requiresDownload ? "download" : "system-check",
  );

  // Download state
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // System check state
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

  // Lock state — simulate lecturer unlock polling
  const [isUnlocked, setIsUnlocked] = useState(examInfo.lecturerUnlocked);
  const [pollingDots, setPollingDots] = useState("");
  const [blockedAttemptStatus, setBlockedAttemptStatus] = useState<
    string | null
  >(null);
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
        if (["SUBMITTED", "GRADED", "FLAGGED"].includes(status)) {
          setBlockedAttemptStatus(status);
        }
      } catch {
        // Ignore not-found and continue normal flow
      } finally {
        if (mounted) setCheckingAttempt(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [examId]);

  // Polling animation for locked screen
  useEffect(() => {
    if (currentStep !== "locked") return;
    const interval = setInterval(() => {
      setPollingDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 600);
    return () => clearInterval(interval);
  }, [currentStep]);

  // --- Download logic ---
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    // Simulate download progress
    for (let i = 0; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 40));
      setDownloadProgress(i);
    }
    setDownloadProgress(100);
    setIsDownloading(false);
    setIsDownloaded(true);
  };

  const handleProceedToChecks = () => {
    setCurrentStep("system-check");
    runSystemChecks();
  };

  // --- System check logic ---
  const updateCheck = useCallback(
    (id: string, status: CheckStatus, detail?: string) => {
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, detail } : c)),
      );
    },
    [],
  );

  const runSystemChecks = useCallback(async () => {
    setIsRunningChecks(true);
    setChecks((prev) =>
      prev.map((c) => ({
        ...c,
        status: "checking" as CheckStatus,
        detail: undefined,
      })),
    );

    if (navigator.onLine) {
      updateCheck("internet", "passed", "Connection stable");
    } else {
      updateCheck("internet", "failed", "No internet connection detected");
    }
    await new Promise((r) => setTimeout(r, 400));

    if (document.documentElement.requestFullscreen) {
      updateCheck(
        "browser",
        "passed",
        "Fullscreen supported by this browser/environment",
      );
    } else {
      updateCheck(
        "browser",
        "failed",
        "Fullscreen is not available in this browser/environment",
      );
    }

    setIsRunningChecks(false);
  }, [updateCheck]);

  // Run checks on mount if download not required
  useEffect(() => {
    if (!requiresDownload) {
      runSystemChecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAllChecksPassed(checks.every((c) => c.status === "passed"));
  }, [checks]);

  const passedCount = checks.filter((c) => c.status === "passed").length;
  const failedCount = checks.filter((c) => c.status === "failed").length;

  const handleProceedAfterChecks = () => {
    // Exams without download are open — go straight to ready
    // Exams with download are locked until lecturer unlocks
    if (!requiresDownload || isUnlocked) {
      setCurrentStep("ready");
    } else {
      setCurrentStep("locked");
    }
  };

  // --- Start exam ---
  const handleStartExam = async () => {
    if (blockedAttemptStatus) {
      toast.error(
        `You already have a ${getStatusBadgeLabel(blockedAttemptStatus)} attempt for this exam.`,
      );
      return;
    }

    try {
      document.documentElement.requestFullscreen?.();
    } catch {
      /* continue */
    }

    // Prefer real examId from URL params when available
    const realExamId = examId;

    if (!realExamId) {
      toast.error(
        "Missing exam id. Please re-open the exam from your dashboard.",
      );
      return;
    }

    // Try to create a submission on the server so we can persist logs against it
    try {
      const res = await api.startExam(realExamId);
      if (!res?.id) {
        toast.error("Could not start exam submission. Please try again.");
        return;
      }
      try {
        localStorage.setItem("currentSubmissionId", res.id);
        localStorage.setItem("currentSubmissionExamId", realExamId);
      } catch {}
    } catch (err: any) {
      console.error("Failed to start submission on server:", err);
      toast.error(err?.message || "Failed to start exam. Please try again.");
      return;
    }

    // Navigate to exam-taking with examId so the page can read it
    const idParam = encodeURIComponent(realExamId);
    navigate(`/student/exam-taking?examId=${idParam}`);
  };

  // Step indicator — hide download/locked steps when not required
  const steps = requiresDownload
    ? [
        { key: "download", label: "Download", number: 1 },
        { key: "system-check", label: "System Check", number: 2 },
        { key: "locked", label: "Waiting", number: 3 },
        { key: "ready", label: "Start", number: 4 },
      ]
    : [
        { key: "system-check", label: "System Check", number: 1 },
        { key: "ready", label: "Start", number: 2 },
      ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <BackToDashboardButton to="/student" className="mb-4 -ml-2" />

        {/* Exam Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-1">{examInfo.title}</CardTitle>
                <CardDescription>{examInfo.course}</CardDescription>
              </div>
              <StatusBadge tone="info">OFFICIAL SESSION</StatusBadge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">{examInfo.duration}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div>
                <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">
                  {examInfo.totalQuestions}
                </p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">Proctored</p>
                <p className="text-xs text-muted-foreground">Mode</p>
              </div>
              <div>
                <Lock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-lg font-semibold">Encrypted</p>
                <p className="text-xs text-muted-foreground">Connection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                    i < currentStepIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : i === currentStepIndex
                        ? "bg-primary/10 text-primary border-primary"
                        : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {i < currentStepIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${i <= currentStepIndex ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-1 mb-4 ${i < currentStepIndex ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ==================== STEP 1: DOWNLOAD ==================== */}
        {currentStep === "download" && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Download Exam Package
              </CardTitle>
              <CardDescription>
                You must download the encrypted exam package before proceeding.
                This ensures you can take the exam even with unstable internet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package info */}
              <div className="flex items-center gap-4 rounded-lg border border-border p-4 bg-muted/30">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{examInfo.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {examInfo.totalQuestions} questions · {examInfo.packageSize}{" "}
                    · AES-256 encrypted
                  </p>
                </div>
                {isDownloaded ? (
                  <StatusBadge status="downloaded" domain="submission">
                    Downloaded
                  </StatusBadge>
                ) : (
                  <StatusBadge status="pending" domain="submission">
                    Required
                  </StatusBadge>
                )}
              </div>

              {/* Download progress */}
              {isDownloading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Downloading & encrypting...
                    </span>
                    <span className="font-medium">{downloadProgress}%</span>
                  </div>
                  <Progress value={downloadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Package is encrypted locally. Content is not viewable until
                    the lecturer unlocks the exam.
                  </p>
                </div>
              )}

              {/* Downloaded state */}
              {isDownloaded && (
                <Alert className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    Exam package downloaded successfully and stored locally. The
                    package is encrypted and cannot be opened until the lecturer
                    unlocks the exam session.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action */}
              <div className="flex gap-3">
                {!isDownloaded ? (
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Exam Package
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleProceedToChecks}
                    className="flex-1 gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continue to System Check
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== STEP 2: SYSTEM CHECK ==================== */}
        {currentStep === "system-check" && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      System Readiness Check
                    </CardTitle>
                    <CardDescription>
                      We only verify internet connectivity and fullscreen
                      support before you can start the exam.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={runSystemChecks}
                    disabled={isRunningChecks}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isRunningChecks ? "animate-spin" : ""}`}
                    />
                    Recheck
                  </Button>
                </div>
                <Progress
                  value={(passedCount / checks.length) * 100}
                  className="mt-3 h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {passedCount}/{checks.length} checks passed
                  {failedCount > 0 && ` · ${failedCount} failed`}
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Fullscreen usually fails when the browser is outdated, the
                  page is opened inside an embedded webview/iframe, or a site,
                  browser, kiosk, or enterprise policy blocks fullscreen.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                        check.status === "passed"
                          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                          : check.status === "failed"
                            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                            : check.status === "checking"
                              ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                              : "border-border bg-card"
                      }`}
                    >
                      <div className="shrink-0">{check.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{check.label}</p>
                        {check.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {check.detail}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {check.status === "checking" && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                        {check.status === "passed" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {check.status === "failed" && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {check.status === "pending" && (
                          <div className="h-5 w-5 rounded-full border-2 border-border" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Integrity & Fairness Notice */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Integrity & Fairness Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      If fullscreen is unavailable, switch to a normal browser
                      window on a supported browser and make sure no policy or
                      embedded view is blocking fullscreen.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Fullscreen support is most likely to fail in old browsers,
                      in-app browsers, webviews, iframe embeds, or restricted
                      kiosk/managed-device environments.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Internet must stay connected for the exam session to
                      proceed smoothly.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      If the browser says fullscreen is not supported, the exam
                      cannot enter proctored start mode until this is resolved.
                    </p>
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
                  <label
                    htmlFor="agree"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I understand and agree to the exam rules and proctoring
                    conditions. I confirm that I will complete this exam
                    independently.
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Action */}
            <div className="flex gap-3">
              <Button
                onClick={handleProceedAfterChecks}
                disabled={!allChecksPassed || !agreed}
                className="flex-1 h-11 gap-2"
                size="lg"
              >
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
              <Button
                variant="outline"
                onClick={() =>
                  requiresDownload
                    ? setCurrentStep("download")
                    : navigate("/student")
                }
                className="h-11"
              >
                Back
              </Button>
            </div>
          </>
        )}

        {/* ==================== STEP 3: LOCKED — WAITING FOR LECTURER ==================== */}
        {currentStep === "locked" && (
          <Card className="mb-4">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                {/* Lock icon with pulse animation */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-950/30 animate-ping opacity-30" />
                  <div className="relative w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center">
                    <LockKeyhole className="h-8 w-8 text-amber-600" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Exam Not Yet Unlocked
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    The exam package has been downloaded and your system is
                    ready. However, the{" "}
                    <strong>lecturer has not unlocked the exam session</strong>{" "}
                    yet.
                  </p>
                </div>

                {/* Status info */}
                <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Package</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Downloaded
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">System Check</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Agreement</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Lecturer Unlock
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting
                      {pollingDots}
                    </span>
                  </div>
                </div>

                <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 max-w-md mx-auto text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                    Please stay on this page. The exam will automatically become
                    available once your lecturer activates the session. Do not
                    close or refresh this page.
                  </AlertDescription>
                </Alert>

                <p className="text-xs text-muted-foreground">
                  Checking server every 10 seconds · Session ID:{" "}
                  {examInfo.sessionId}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== STEP 4: READY TO START ==================== */}
        {currentStep === "ready" && (
          <>
            <Card className="mb-4">
              <CardContent className="pt-6 pb-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      Ready to Start!
                    </h2>
                    <p className="text-muted-foreground">
                      The exam has been unlocked. You may begin now.
                    </p>
                    {checkingAttempt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Checking attempt status...
                      </p>
                    )}
                    {blockedAttemptStatus && (
                      <p className="text-sm text-amber-700 mt-2">
                        You already have a {getStatusBadgeLabel(blockedAttemptStatus)}{" "}
                        attempt for this exam.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {blockedAttemptStatus ? (
                <Button
                  className="flex-1 h-12 gap-2 text-base"
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    examId
                      ? navigate(
                          `/student/grading?examId=${encodeURIComponent(examId)}`,
                        )
                      : navigate("/student")
                  }
                >
                  View Submission Status
                </Button>
              ) : (
                <Button
                  onClick={handleStartExam}
                  className="flex-1 h-12 gap-2 text-base"
                  size="lg"
                  disabled={checkingAttempt}
                >
                  <ArrowRight className="h-5 w-5" />
                  Start Exam Now
                </Button>
              )}
              <BackToDashboardButton
                to="/student"
                label="Return to Dashboard"
                variant="outline"
                size="default"
                className="h-12"
              />
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Session ID: {examInfo.sessionId} · SSL Encrypted · Proctoring Active
        </p>
      </div>
    </DashboardLayout>
  );
}
