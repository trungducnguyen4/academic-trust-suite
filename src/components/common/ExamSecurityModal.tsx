"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ViolationLog, ViolationType } from "../../hooks/use-exam-security";

const violationLabels: Record<ViolationType, string> = {
  fullscreen_exit: "Đã thoát toàn màn hình",
  tab_switch: "Đã chuyển tab",
  blur: "Cửa sổ mất tiêu điểm",
  focus: "Cửa sổ được lấy lại tiêu điểm",
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
      aria-labelledby="exam-security-title"
    >
      <div className="bg-card rounded-xl p-8 max-w-sm text-center border shadow-xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 id="exam-security-title" className="text-xl font-semibold mb-2">Cần trở lại toàn màn hình</h2>
        <p className="text-muted-foreground mb-1">Phiên thi tạm dừng cho đến khi chế độ toàn màn hình được khôi phục.</p>
        <p className="text-sm mb-2">
          Trở lại toàn màn hình trong <strong>{countdownSeconds} giây</strong>, nếu không bài thi sẽ được tự động nộp.
        </p>
        {reason && (
          <p className="text-muted-foreground text-sm mb-2">
            Tín hiệu ghi nhận: <strong>{reason}</strong>
          </p>
        )}
        <p className="text-muted-foreground text-sm mb-4">
          Số tín hiệu cần xem xét: <strong>{violationCount}</strong> / {maxViolations}
        </p>
        {isEscalated && (
          <p className="text-red-600 text-sm mb-3">
            Đã đạt ngưỡng tín hiệu của phiên thi. Bài thi sẽ được nộp tự động.
          </p>
        )}
        {!canFullscreen && (
          <p className="text-red-600 text-sm mb-3">
            Trình duyệt này không hỗ trợ toàn màn hình. Vui lòng chuyển sang trình duyệt được hỗ trợ.
          </p>
        )}
        <Button onClick={onReturnToExam} disabled={!canFullscreen}>
          Trở lại bài thi
        </Button>
      </div>
    </div>
  );
}

