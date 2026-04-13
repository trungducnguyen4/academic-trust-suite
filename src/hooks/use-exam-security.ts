import { useCallback, useEffect, useRef, useState } from "react";

export type ViolationType = "fullscreen_exit" | "tab_switch" | "blur" | "focus";

export interface ViolationLog {
  timestamp: number;
  type: ViolationType;
  detail?: string;
}

interface UseExamSecurityOptions {
  enabled?: boolean;
  maxViolations?: number;
  onViolation?: (log: ViolationLog, totalCount: number) => void;
  onEscalate?: (totalCount: number, logs: ViolationLog[]) => void;
}

interface UseExamSecurityResult {
  isFullscreen: boolean;
  isBlocked: boolean;
  isEscalated: boolean;
  violationCount: number;
  violationCounts: Record<ViolationType, number>;
  lastViolation: ViolationLog | null;
  maxViolations: number;
  canFullscreen: boolean;
  returnToExam: () => Promise<void>;
  getViolationLogs: () => ViolationLog[];
}

const emptyCounts: Record<ViolationType, number> = {
  fullscreen_exit: 0,
  tab_switch: 0,
  blur: 0,
  focus: 0,
};

export function useExamSecurity(options: UseExamSecurityOptions = {}): UseExamSecurityResult {
  const { enabled = true, maxViolations = 3, onViolation, onEscalate } = options;

  const canFullscreen =
    typeof document !== "undefined" &&
    typeof document.documentElement?.requestFullscreen === "function";

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return Boolean(document.fullscreenElement);
  });
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return !document.fullscreenElement;
  });
  const [isEscalated, setIsEscalated] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationCounts, setViolationCounts] = useState<Record<ViolationType, number>>(emptyCounts);
  const [lastViolation, setLastViolation] = useState<ViolationLog | null>(null);

  const logsRef = useRef<ViolationLog[]>([]);
  const escalatedRef = useRef(false);
  const focusArmedRef = useRef(false);
  const allowClearRef = useRef(false);

  const recordViolation = useCallback(
    (type: ViolationType, detail?: string) => {
      const entry: ViolationLog = {
        timestamp: Date.now(),
        type,
        detail,
      };

      allowClearRef.current = false;
      logsRef.current.push(entry);
      setLastViolation(entry);
      setViolationCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
      setViolationCount((prev) => {
        const next = prev + 1;
        if (!escalatedRef.current && next >= maxViolations) {
          escalatedRef.current = true;
          setIsEscalated(true);
          onEscalate?.(next, logsRef.current.slice());
        }
        return next;
      });
      setIsBlocked(true);
      onViolation?.(entry, logsRef.current.length);
    },
    [maxViolations, onEscalate, onViolation],
  );

  const requestFullscreen = useCallback(async (allowClear = false) => {
    if (!enabled || !canFullscreen) return;
    if (allowClear) {
      allowClearRef.current = true;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Keep blocked until the user successfully re-enters fullscreen.
    }
  }, [canFullscreen, enabled]);

  const returnToExam = useCallback(async () => {
    if (document.fullscreenElement) {
      setIsBlocked(false);
      allowClearRef.current = false;
      return;
    }
    await requestFullscreen(true);
  }, [requestFullscreen]);

  useEffect(() => {
    if (!enabled) return;
    const active = Boolean(document.fullscreenElement);
    setIsFullscreen(active);
    setIsBlocked(!active);
    if (!active) {
      requestFullscreen(true);
    }
  }, [enabled, requestFullscreen]);

  useEffect(() => {
    if (!enabled) return;
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (active) {
        if (allowClearRef.current) {
          setIsBlocked(false);
          allowClearRef.current = false;
        }
        return;
      }
      recordViolation("fullscreen_exit", "User exited fullscreen");
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [enabled, recordViolation]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden) {
        focusArmedRef.current = true;
        recordViolation("tab_switch", "Document hidden");
      }
    };

    const onBlur = () => {
      focusArmedRef.current = true;
      recordViolation("blur", "Window lost focus");
    };

    const onFocus = () => {
      if (!focusArmedRef.current) return;
      focusArmedRef.current = false;
      if (!document.fullscreenElement) {
        recordViolation("focus", "Window focused without fullscreen");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, recordViolation]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled]);

  const getViolationLogs = useCallback(() => logsRef.current.slice(), []);

  return {
    isFullscreen,
    isBlocked,
    isEscalated,
    violationCount,
    violationCounts,
    lastViolation,
    maxViolations,
    canFullscreen,
    returnToExam,
    getViolationLogs,
  };
}
