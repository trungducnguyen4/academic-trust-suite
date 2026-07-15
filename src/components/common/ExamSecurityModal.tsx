"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ViolationLog, ViolationType } from "../../hooks/use-exam-security";

const violationLabels: Record<ViolationType, string> = {
  fullscreen_exit: "Fullscreen exited",
  tab_switch: "Tab switched",
  blur: "Window lost focus",
  focus: "Window focused",
};

interface ExamSecurityModalProps {
  open: boolean;
  violationCount: number;
  maxViolations: number;
  isEscalated: boolean;
  countdownSeconds: number;
  lastViolation: ViolationLog | null;
  canFullscreen: boolean;
  onReturnToExam: () => void;
}

export function ExamSecurityModal({
  open,
  violationCount,
  maxViolations,
  isEscalated,
  countdownSeconds,
  lastViolation,
  canFullscreen,
  onReturnToExam,
}: ExamSecurityModalProps) {
  if (!open) return null;

  const reason = lastViolation ? violationLabels[lastViolation.type] : null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card rounded-xl p-8 max-w-sm text-center border shadow-xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Fullscreen Required</h2>
        <p className="text-muted-foreground mb-1">The exam is paused until fullscreen is restored.</p>
        <p className="text-sm mb-2">
          Return to fullscreen within <strong>{countdownSeconds}s</strong> or your exam will be submitted automatically.
        </p>
        {reason && (
          <p className="text-muted-foreground text-sm mb-2">
            Reason: <strong>{reason}</strong>
          </p>
        )}
        <p className="text-muted-foreground text-sm mb-4">
          Total violations: <strong>{violationCount}</strong> / {maxViolations}
        </p>
        {isEscalated && (
          <p className="text-red-600 text-sm mb-3">
            Maximum violations reached. Your exam will be submitted.
          </p>
        )}
        {!canFullscreen && (
          <p className="text-red-600 text-sm mb-3">
            Fullscreen is not supported in this browser. Please switch to a supported browser.
          </p>
        )}
        <Button onClick={onReturnToExam} disabled={!canFullscreen}>
          Return to Exam
        </Button>
      </div>
    </div>
  );
}

