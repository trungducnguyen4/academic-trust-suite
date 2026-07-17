"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  Volume2,
  Maximize,
  X,
  Shield,
  ArrowUp,
  ArrowDown,
  GripVertical,
  CheckCircle2,
} from "lucide-react";

import { api } from "@/lib/api";
import { ExamSecurityModal } from "../../components/common/ExamSecurityModal";
import {
  useExamSecurity,
  type ViolationLog,
} from "../../hooks/use-exam-security";

// ─── Question types ───────────────────────────────────────────────
type QType =
  | "single-choice"
  | "multi-choice"
  | "true-false"
  | "fill-blank"
  | "matching"
  | "find-error"
  | "ordering"
  | "short-answer";

interface BaseQ {
  id: number;
  type: QType;
  title: string;
  points: number;
  audioUrl?: string;
}

interface SingleChoiceQ extends BaseQ {
  type: "single-choice";
  content: string;
  options: string[];
}
interface MultiChoiceQ extends BaseQ {
  type: "multi-choice";
  content: string;
  options: string[];
}
interface TrueFalseQ extends BaseQ {
  type: "true-false";
  content: string;
}
interface FillBlankQ extends BaseQ {
  type: "fill-blank";
  template: string;
  blanks: number;
}
interface MatchingQ extends BaseQ {
  type: "matching";
  content: string;
  left: string[];
  right: string[];
}
interface FindErrorQ extends BaseQ {
  type: "find-error";
  content: string;
  segments: { label: string; code: string }[];
}
interface OrderingQ extends BaseQ {
  type: "ordering";
  content: string;
  items: string[];
}
interface ShortAnswerQ extends BaseQ {
  type: "short-answer";
  content: string;
  maxWords?: number;
}

type Question =
  | SingleChoiceQ
  | MultiChoiceQ
  | TrueFalseQ
  | FillBlankQ
  | MatchingQ
  | FindErrorQ
  | OrderingQ
  | ShortAnswerQ;

// ─── Mock questions (10 questions, 8 different types) ─────────────
const rawQuestions: Question[] = [
  {
    id: 1,
    type: "single-choice",
    title: "Algorithm Complexity",
    points: 2,
    content: "What is the worst-case time complexity of Merge Sort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
  },
  {
    id: 2,
    type: "multi-choice",
    title: "Data Structures",
    points: 3,
    content:
      "Which of the following are valid implementations of a priority queue? (Select ALL that apply)",
    options: [
      "Binary Heap",
      "Sorted Array",
      "Unsorted Linked List",
      "Fibonacci Heap",
      "Hash Table",
    ],
  },
  {
    id: 3,
    type: "true-false",
    title: "Graph Theory",
    points: 1,
    content:
      "Dijkstra's algorithm can correctly compute shortest paths in a graph that contains negative-weight edges.",
  },
  {
    id: 4,
    type: "fill-blank",
    title: "Database Concepts",
    points: 2,
    template:
      "A {{1}} key uniquely identifies each record in a table. A {{2}} key in one table references the {{3}} key of another table, establishing a relationship between the two tables.",
    blanks: 3,
  },
  {
    id: 5,
    type: "matching",
    title: "Concept Matching — Sorting Algorithms",
    points: 4,
    content:
      "Match each sorting algorithm (left column) to its average-case time complexity (right column).",
    left: ["Bubble Sort", "Quick Sort", "Heap Sort", "Counting Sort"],
    right: ["O(n log n)", "O(n²)", "O(n + k)", "O(n log n)"],
  },
  {
    id: 6,
    type: "find-error",
    title: "Find the Error — Python Code",
    points: 3,
    content:
      "The following Python function is supposed to return the factorial of n. Click the segment that contains a logical or syntax error:",
    segments: [
      { label: "A", code: "def factorial(n):" },
      { label: "B", code: "    if n == 0:" },
      { label: "C", code: "        return 0   # base case" },
      { label: "D", code: "    return n * factorial(n - 1)" },
    ],
  },
  {
    id: 7,
    type: "ordering",
    title: "Correct Order — TCP Handshake",
    points: 3,
    content:
      "Arrange the following steps of the TCP three-way handshake in their correct sequential order:",
    items: [
      "Client sends ACK to server",
      "Server sends SYN-ACK to client",
      "Client sends SYN to server",
      "Connection established",
    ],
  },
  {
    id: 8,
    type: "short-answer",
    title: "Short Answer — CAP Theorem",
    points: 5,
    content:
      "Explain the CAP theorem and describe a real-world distributed system that demonstrates the trade-off between consistency and availability. Provide specific examples.",
    maxWords: 200,
  },
  {
    id: 9,
    type: "single-choice",
    title: "Operating Systems",
    points: 2,
    content: "Which page replacement algorithm suffers from Bélády's anomaly?",
    options: [
      "LRU (Least Recently Used)",
      "FIFO (First In First Out)",
      "Optimal Page Replacement",
      "Clock Algorithm",
    ],
  },
  {
    id: 10,
    type: "fill-blank",
    title: "SQL Syntax",
    points: 2,
    template:
      "To retrieve unique values from a column, you use the {{1}} keyword. To filter grouped results you use the {{2}} clause instead of {{3}}.",
    blanks: 3,
  },
];

function parseOptions(options: any): string[] {
  if (Array.isArray(options)) {
    return options
      .map((v) => (typeof v === "string" ? v : String(v?.text ?? v)))
      .filter(Boolean);
  }
  if (options && typeof options === "object") {
    return Object.keys(options)
      .sort()
      .map((k) => String(options[k]))
      .filter(Boolean);
  }
  return ["Option A", "Option B", "Option C", "Option D"];
}

function resolveQuestionTitle(q: any, index: number): string {
  const candidates = [
    q?.title,
    q?.name,
    q?.stem,
    q?.content,
    q?.questionText,
    q?.prompt,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value && !/^Question\s+\d+$/i.test(value)) {
      return value;
    }
  }

  return `Question ${index + 1}`;
}

function mapBackendToUiQuestion(q: any, index: number): Question {
  const type = String(q?.type || "").toUpperCase();
  const base = {
    id: index + 1,
    title: resolveQuestionTitle(q, index),
    points: Number(q?.points ?? 1),
    content: String(q?.content || ""),
  };

  if (type === "TRUE_FALSE") {
    return { ...base, type: "true-false" } as TrueFalseQ;
  }
  if (type === "MULTI_SELECT") {
    return {
      ...base,
      type: "multi-choice",
      options: parseOptions(q?.options),
    } as MultiChoiceQ;
  }
  if (type === "MULTIPLE_CHOICE") {
    return {
      ...base,
      type: "single-choice",
      options: parseOptions(q?.options),
    } as SingleChoiceQ;
  }
  if (type === "FILL_IN_BLANK") {
    const text = String(q?.content || "Fill in the blank");
    return {
      ...base,
      type: "fill-blank",
      template: text.includes("{{1}}") ? text : `${text} {{1}}`,
      blanks: 1,
    } as FillBlankQ;
  }
  if (type === "ORDERING") {
    return {
      ...base,
      type: "ordering",
      content: String(q?.content || "Arrange in order"),
      items: parseOptions(q?.options),
    } as OrderingQ;
  }
  if (type === "MATCHING") {
    const options = parseOptions(q?.options);
    const half = Math.max(1, Math.floor(options.length / 2));
    return {
      ...base,
      type: "matching",
      content: String(q?.content || "Match the following"),
      left: options.slice(0, half),
      right: options.slice(half),
    } as MatchingQ;
  }

  return {
    ...base,
    type: "short-answer",
    content: String(q?.content || ""),
    maxWords: 200,
  } as ShortAnswerQ;
}

function normalizeSubmissionAnswer(
  question: Question | undefined,
  answer: unknown,
): unknown {
  if (!question) return answer;

  if (question.type === "single-choice" && typeof answer === "number") {
    return { answer: String.fromCharCode(65 + answer) };
  }

  if (question.type === "multi-choice" && Array.isArray(answer)) {
    const labels = answer
      .map((idx) => Number(idx))
      .filter((idx) => !Number.isNaN(idx))
      .sort((a, b) => a - b)
      .map((idx) => String.fromCharCode(65 + idx));
    return { answer: labels.join(",") };
  }

  if (question.type === "true-false" && typeof answer === "boolean") {
    return { answer };
  }

  return answer;
}

function shuffleArray<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

// ─── Answer helpers ───────────────────────────────────────────────
type AnswerMap = Record<number, unknown>;

function isAnswered(q: Question, answers: AnswerMap): boolean {
  const a = answers[q.id];
  if (q.type === "ordering") return true; // any arrangement counts
  if (a === undefined || a === null) return false;
  if (q.type === "multi-choice")
    return Array.isArray(a) && (a as number[]).length > 0;
  if (q.type === "fill-blank")
    return Array.isArray(a) && (a as string[]).some((v) => v.trim() !== "");
  if (q.type === "matching")
    return (
      typeof a === "object" && Object.values(a as object).some((v) => v !== "")
    );
  if (q.type === "short-answer")
    return typeof a === "string" && (a as string).trim().length > 0;
  return true;
}

const EXAM_DURATION = 90 * 60;
const MAX_VIOLATIONS = 3;
const MOUSE_IDLE_THRESHOLD_MS = 45000;

const typeBadgeColor: Record<QType, string> = {
  "single-choice": "bg-blue-100 text-blue-700",
  "multi-choice": "bg-violet-100 text-violet-700",
  "true-false": "bg-teal-100 text-teal-700",
  "fill-blank": "bg-orange-100 text-orange-700",
  matching: "bg-pink-100 text-pink-700",
  "find-error": "bg-red-100 text-red-700",
  ordering: "bg-amber-100 text-amber-700",
  "short-answer": "bg-green-100 text-green-700",
};

const typeLabel: Record<QType, string> = {
  "single-choice": "Một đáp án",
  "multi-choice": "Nhiều đáp án",
  "true-false": "Đúng / Sai",
  "fill-blank": "Điền vào chỗ trống",
  matching: "Ghép cặp",
  "find-error": "Tìm lỗi",
  ordering: "Sắp xếp",
  "short-answer": "Trả lời ngắn",
};

// ─── Main component ───────────────────────────────────────────────
export default function ExamTaking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId") || undefined;
  const isPreviewMode = searchParams.get("mode") === "preview";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState("Phiên thi");
  const [isLoadingExam, setIsLoadingExam] = useState(true);

  const [orderState, setOrderState] = useState<Record<number, string[]>>({});

  const total = questions.length;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(15);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef = useRef<{ type: string; ts: number; detail?: string }[]>([]);
  const lastMouseActivityRef = useRef<number>(Date.now());
  const mouseIdleLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const loadExam = async () => {
      setIsLoadingExam(true);
      try {
        if (!examId) {
          const fallback = shuffleArray(rawQuestions).map((q) => {
            if (q.type === "single-choice" || q.type === "multi-choice") {
              return { ...q, options: shuffleArray(q.options) };
            }
            if (q.type === "matching") {
              return { ...q, right: shuffleArray(q.right) };
            }
            return q;
          });
          if (!mounted) return;
          setExamTitle("Bài thi luyện tập");
          setQuestions(fallback);
          return;
        }

        const exam = await api.getExam(examId);
        const backendQuestions = Array.isArray(exam?.examQuestions)
          ? exam.examQuestions
          : [];
        const mapped = backendQuestions.map((eq: any, idx: number) => {
          const ui = mapBackendToUiQuestion(eq?.question, idx) as any;
          return {
            ...ui,
            questionId: eq?.questionId || eq?.question?.id,
          };
        });

        if (!mounted) return;
        setExamTitle(exam?.title || "Phiên thi");
        setQuestions(mapped.length > 0 ? mapped : []);
      } catch (err) {
        console.error("Failed to load exam questions:", err);
        if (!mounted) return;
        setQuestions([]);
      } finally {
        if (mounted) setIsLoadingExam(false);
      }
    };

    loadExam();
    return () => {
      mounted = false;
    };
  }, [examId]);

  useEffect(() => {
    const init: Record<number, string[]> = {};
    questions
      .filter((q): q is OrderingQ => q.type === "ordering")
      .forEach((q) => {
        init[q.id] = shuffleArray(q.items);
      });
    setOrderState(init);
  }, [questions]);

  const log = useCallback((type: string, detail?: string) => {
    logRef.current.push({ type, ts: Date.now(), detail });
  }, []);

  useEffect(() => {
    log("exam_start");
  }, [log]);

  // Timer with auto-submit
  const doSubmit = useCallback(async () => {
    setIsSubmitting(true);
    log("submit");
    // attempt to submit answers + logs if we have a submissionId stored
    try {
      let submissionId = localStorage.getItem("currentSubmissionId");
      const submissionExamId = localStorage.getItem("currentSubmissionExamId");

      // Drop stale submission ids from previous exams.
      if (examId && submissionExamId && submissionExamId !== examId) {
        submissionId = null;
      }

      // Create a submission now if missing.
      if (!submissionId && examId) {
        const started = await api.startExam(examId);
        if (started?.id) {
          submissionId = started.id;
          localStorage.setItem("currentSubmissionId", submissionId);
          localStorage.setItem("currentSubmissionExamId", examId);
        }
      }

      if (!submissionId) {
        throw new Error("No active submission found for this exam.");
      }

      // build answers payload from current answers map
      const payloadAnswers = Object.entries(answers)
        .map(([uiQId, ans]) => {
          const question = questions.find(
            (q: any) => q.id === Number(uiQId),
          ) as any;
          if (!question?.questionId) return null;
          return {
            questionId: String(question.questionId),
            answer: normalizeSubmissionAnswer(question as Question, ans),
            timeTaken: undefined,
          };
        })
        .filter(Boolean) as Array<{
        questionId: string;
        answer: any;
        timeTaken?: number;
      }>;

      // send logs
      const logs = logRef.current.map((l) => ({
        type: l.type,
        details: l.detail,
        ts: l.ts,
      }));
      await api.submitExam(submissionId, payloadAnswers, logs);

      // Clear active submission markers after successful submit.
      try {
        localStorage.removeItem("currentSubmissionId");
        localStorage.removeItem("currentSubmissionExamId");
      } catch {}
    } catch (err) {
      console.error("Failed to submit to server:", err);
      toast.error("Nộp bài không thành công. Vui lòng thử lại.");
      setIsSubmitting(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Navigate to grading for this exam if available
    if (examId)
      router.push(`/student/grading?examId=${encodeURIComponent(examId)}`);
    else router.push("/student/grading");
  }, [log, router, examId, answers, questions]);

  const handleViolation = useCallback(
    (entry: ViolationLog) => {
      log(entry.type, entry.detail);
      try {
        const submissionId = localStorage.getItem("currentSubmissionId");
        if (submissionId) {
          api
            .sendExamLogs(submissionId, [
              {
                type: entry.type,
                details: entry.detail ?? `Security violation: ${entry.type}`,
                ts: entry.timestamp,
              },
            ])
            .catch((e) => console.error("sendExamLogs failed", e));
        }
      } catch (e) {
        console.error("Failed to send violation log", e);
      }
    },
    [log],
  );

  const {
    isBlocked: isSecurityBlocked,
    violationCount,
    isEscalated,
    lastViolation,
    returnToExam,
    canFullscreen,
  } = useExamSecurity({
    enabled: !isSubmitting,
    maxViolations: MAX_VIOLATIONS,
    onViolation: handleViolation,
    onEscalate: () => {
      if (isSubmitting) return;
      log("violation_escalation", `Reached ${MAX_VIOLATIONS} violations`);
      doSubmit();
    },
  });

  useEffect(() => {
    if (!isSecurityBlocked || isSubmitting) {
      setFullscreenCountdown(15);
      return;
    }

    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setFullscreenCountdown(remaining);
      if (remaining === 0) {
        window.clearInterval(id);
        doSubmit();
      }
    }, 200);

    return () => window.clearInterval(id);
  }, [isSecurityBlocked, isSubmitting, doSubmit]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [doSubmit]);

  // Mouse idle tracking (silent for student): logs when no activity for a threshold period.
  useEffect(() => {
    const markActivity = () => {
      lastMouseActivityRef.current = Date.now();
      mouseIdleLoggedRef.current = false;
    };

    const onActivityEvents: Array<keyof DocumentEventMap> = [
      "mousemove",
      "mousedown",
      "wheel",
      "keydown",
      "touchstart",
    ];

    onActivityEvents.forEach((evt) =>
      document.addEventListener(evt, markActivity, { passive: true }),
    );

    const idleCheckId = window.setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastMouseActivityRef.current;
      if (idleMs < MOUSE_IDLE_THRESHOLD_MS) return;
      if (mouseIdleLoggedRef.current) return;

      mouseIdleLoggedRef.current = true;
      const idleSeconds = Math.floor(idleMs / 1000);
      const detail = `No mouse activity for ${idleSeconds}s`;

      log("mouse_idle", detail);

      try {
        const submissionId = localStorage.getItem("currentSubmissionId");
        if (submissionId) {
          api
            .sendExamLogs(submissionId, [
              { type: "mouse_idle", details: detail, ts: now },
            ])
            .catch((e) => console.error("sendExamLogs mouse_idle failed", e));
        }
      } catch (e) {
        console.error("Failed to send mouse idle log", e);
      }
    }, 5000);

    return () => {
      onActivityEvents.forEach((evt) =>
        document.removeEventListener(evt, markActivity),
      );
      window.clearInterval(idleCheckId);
    };
  }, [log]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60),
      sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isTimeLow = timeLeft < 300;
  const answeredCount = questions.filter((q) => isAnswered(q, answers)).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const q = questions[current];

  if (isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Đang tải bài thi...
      </div>
    );
  }

  if (total === 0 || !q) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">
            Không tìm thấy câu hỏi cho bài thi này.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Vui lòng liên hệ giảng viên hoặc thử lại sau.
          </p>
          <BackToDashboardButton
            to="/student"
            variant="default"
            size="default"
            className="mt-4"
          />
        </div>
      </div>
    );
  }

  const setAnswer = (qId: number, val: unknown) =>
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      log("answer", JSON.stringify({ questionId: qId, value: val }));
      return next;
    });

  const handleFlag = () =>
    setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  const handleClear = () =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });

  const goToPreview = () => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", "preview");
    router.push(`/student/exam-taking?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const leavePreview = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("mode");
    router.push(`/student/exam-taking?${params.toString()}`);
  };

  const renderAnswerPreview = (question: Question) => {
    const answer = answers[question.id];
    if (!isAnswered(question, answers)) {
      return <span className="font-medium text-red-600 dark:text-red-300">Chưa trả lời</span>;
    }

    if (question.type === "single-choice") {
      const idx = Number(answer);
      const opt = question.options[idx];
      return <span>{opt ? `${String.fromCharCode(65 + idx)}. ${opt}` : "Đã trả lời"}</span>;
    }

    if (question.type === "multi-choice") {
      const indices = Array.isArray(answer) ? (answer as number[]) : [];
      const labels = indices
        .map((idx) => {
          const opt = question.options[idx];
          return opt ? `${String.fromCharCode(65 + idx)}. ${opt}` : null;
        })
        .filter(Boolean);
      return <span>{labels.join("; ")}</span>;
    }

    if (question.type === "true-false") {
      return <span>{answer ? "Đúng" : "Sai"}</span>;
    }

    if (question.type === "fill-blank") {
      const blanks = Array.isArray(answer) ? (answer as string[]) : [];
      return <span>{blanks.filter((v) => v?.trim()).join(" | ")}</span>;
    }

    if (question.type === "short-answer") {
      return <span>{String(answer)}</span>;
    }

    return <span>Đã trả lời</span>;
  };

  // ─── Dispatch to sub-renderers ────────────────────────────────
  const renderQuestion = (q: Question) => {
    switch (q.type) {
      case "single-choice":
        return (
          <SingleChoiceRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "multi-choice":
        return (
          <MultiChoiceRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "true-false":
        return (
          <TrueFalseRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "fill-blank":
        return (
          <FillBlankRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "matching":
        return (
          <MatchingRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "find-error":
        return (
          <FindErrorRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
      case "ordering":
        return (
          <OrderingRenderer
            q={q}
            orderState={orderState}
            setOrderState={setOrderState}
          />
        );
      case "short-answer":
        return (
          <ShortAnswerRenderer q={q} answers={answers} setAnswer={setAnswer} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-card/95 px-3 shadow-sm backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="truncate text-sm font-semibold">{examTitle}</span>
          {violationCount > 0 && (
            <StatusBadge status="critical" domain="severity">
              {violationCount} tín hiệu cần xem xét
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            aria-label="Thời gian còn lại"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-sm font-semibold ${
              isTimeLow
                ? "bg-red-500/10 text-red-700 dark:text-red-300"
                : "bg-secondary text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={returnToExam}
            disabled={!canFullscreen}
            aria-label="Trở lại chế độ toàn màn hình"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ExamSecurityModal
        open={isSecurityBlocked}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
        isEscalated={isEscalated}
        countdownSeconds={fullscreenCountdown}
        lastViolation={lastViolation}
        canFullscreen={canFullscreen}
        onReturnToExam={returnToExam}
      />

      <div className="flex min-h-screen pt-16">
        {/* ── Navigator Sidebar ────────────────────────────────── */}
        <aside className={`fixed bottom-0 left-0 top-16 w-60 overflow-y-auto border-r bg-card p-4 ${isPreviewMode ? "hidden" : "hidden md:flex md:flex-col"}`}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Tiến độ
          </h3>
          <Progress
            value={(answeredCount / total) * 100}
            className="h-1.5 mb-1"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Đã trả lời {answeredCount}/{total}
          </p>

          <div className="grid grid-cols-4 md:grid-cols-5 gap-1 mb-4">
            {questions.map((qItem, idx) => {
              const ans = isAnswered(qItem, answers);
              const fl = flagged[qItem.id];
              const cur = current === idx;
              return (
                <button
                  key={qItem.id}
                  onClick={() => setCurrent(idx)}
                  title={`Câu ${idx + 1}: ${typeLabel[qItem.type]}`}
                  className={[
                    "h-8 w-8 rounded text-xs font-medium border transition-all",
                    cur ? "ring-2 ring-primary ring-offset-1" : "",
                    fl ? "bg-yellow-100 border-yellow-300 text-yellow-700" : "",
                    ans && !fl
                      ? "bg-green-100 border-green-300 text-green-700"
                      : "",
                    !ans && !fl
                      ? "bg-secondary border-border text-muted-foreground"
                      : "",
                  ].join(" ")}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3 mb-4">
            <div className="flex gap-2 items-center">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300 shrink-0" />{" "}
              Đã trả lời
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 shrink-0" />{" "}
              Đánh dấu xem lại
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-3 h-3 rounded bg-secondary border shrink-0" />{" "}
              Chưa trả lời
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
            <div className="rounded-md border bg-green-500/10 py-2 text-green-700 dark:text-green-300">
              <div className="font-semibold text-sm">{answeredCount}</div>
              <div>Đã trả lời</div>
            </div>
            <div className="rounded-md border bg-yellow-500/10 py-2 text-yellow-700 dark:text-yellow-300">
              <div className="font-semibold text-sm">{flaggedCount}</div>
              <div>Đánh dấu</div>
            </div>
            <div className="rounded-md border bg-red-500/10 py-2 text-red-700 dark:text-red-300">
              <div className="font-semibold text-sm">{total - answeredCount}</div>
              <div>Chưa trả lời</div>
            </div>
          </div>

          <div className="mt-auto">
            <Button
              className="w-full gap-2"
              onClick={isPreviewMode ? leavePreview : goToPreview}
            >
              <Send className="h-4 w-4" />
              {isPreviewMode ? "Quay lại câu hỏi" : "Kiểm tra trước khi nộp"}
            </Button>
          </div>
        </aside>

        {/* ── Main Question Area ────────────────────────────────── */}
        <main id="main-content" className={`${isPreviewMode ? "ml-0" : "md:ml-60"} flex min-w-0 flex-1 justify-center p-4 sm:p-6`}>
          <div className={`w-full ${isPreviewMode ? "max-w-7xl" : "max-w-3xl"}`}>
            {isPreviewMode ? (
              <Card className="overflow-hidden shadow-medium">
                <CardHeader className="border-b border-border bg-muted/30 pb-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">
                        Kiểm tra bài làm
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Xem lại các đáp án đã chọn trước khi nộp bài.
                      </p>
                    </div>
                    <Button variant="outline" onClick={leavePreview}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Quay lại câu hỏi
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5 sm:p-6">
                  {questions.map((item, idx) => {
                    const answered = isAnswered(item, answers);
                    const isFlagged = Boolean(flagged[item.id]);
                    const displayTitle = item.title.trim() || `Câu ${idx + 1}`;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-muted/25 p-5 transition-colors hover:border-primary/30 hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-base font-semibold text-foreground">
                            Câu {idx + 1}. {displayTitle}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeColor[item.type]}`}
                            >
                              {typeLabel[item.type]}
                            </span>
                            {isFlagged && (
                              <StatusBadge status="flagged" domain="submission">
                                Đánh dấu xem lại
                              </StatusBadge>
                            )}
                            {!answered && (
                              <StatusBadge tone="warning">Chưa trả lời</StatusBadge>
                            )}
                          </div>
                        </div>
                        {item.type === "multi-choice" && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Chọn tất cả đáp án phù hợp
                          </div>
                        )}
                        <div className="mt-4 rounded-lg border border-border bg-card p-4">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Câu trả lời của bạn
                          </p>
                          <p className="mt-2 text-base text-foreground">
                            {renderAnswerPreview(item)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                    Vui lòng kiểm tra kỹ tất cả câu trả lời trước khi nộp bài.
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" onClick={leavePreview}>
                      Tiếp tục chỉnh sửa
                    </Button>
                    <Button variant="destructive" onClick={doSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "Đang nộp bài..." : "Nộp bài"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">
                        Q{current + 1} / {total}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[q.type]}`}
                      >
                        {typeLabel[q.type]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {q.points} điểm
                      </span>
                    </div>
                    {flagged[q.id] && (
                      <StatusBadge status="flagged" domain="submission">
                        Đánh dấu xem lại
                      </StatusBadge>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold mt-2">
                    {q.title.trim() || `Câu ${current + 1}`}
                  </h2>
                </CardHeader>

                <CardContent>
                  {q.audioUrl && (
                    <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border">
                      <Volume2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm flex-1">
                        Có tệp âm thanh đính kèm
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAudioPlaying}
                        onClick={() => {
                          audioRef.current?.pause();
                          audioRef.current = new Audio(q.audioUrl);
                          audioRef.current.play();
                          setIsAudioPlaying(true);
                          audioRef.current.onended = () =>
                            setIsAudioPlaying(false);
                        }}
                      >
                        {isAudioPlaying ? "Đang phát..." : "Phát âm thanh"}
                      </Button>
                    </div>
                  )}

                  {renderQuestion(q)}

                  <div className="flex items-center gap-2 mt-5">
                    <Button
                      variant={flagged[q.id] ? "destructive" : "outline"}
                      size="sm"
                      onClick={handleFlag}
                      className="gap-1.5"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {flagged[q.id] ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                    </Button>
                    {q.type !== "ordering" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" /> Xóa câu trả lời
                      </Button>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrent((c) => c - 1)}
                      disabled={current === 0}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> Câu trước
                    </Button>
                    <Button
                      onClick={() =>
                        current === total - 1
                          ? goToPreview()
                          : setCurrent((c) => c + 1)
                      }
                      className="gap-2"
                    >
                      Câu tiếp <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Question sub-renderers ────────────────────────────────────────

/** 1. Single Choice (radio-style) */
function SingleChoiceRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: SingleChoiceQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const selected = answers[q.id] as number | undefined;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {q.content}
      </p>
      {q.options.map((opt, idx) => {
        const isSel = selected === idx;
        return (
          <button
            key={idx}
            onClick={() => setAnswer(q.id, idx)}
            className={`w-full text-left border rounded-lg px-4 py-3 flex items-center gap-3 transition-all
              ${
                isSel
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary/30"
              }`}
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                isSel
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="text-sm">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 2. Multiple Choice (checkboxes, select all that apply) */
function MultiChoiceRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: MultiChoiceQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const selected = (answers[q.id] as number[] | undefined) ?? [];
  const toggle = (idx: number) => {
    const next = selected.includes(idx)
      ? selected.filter((i) => i !== idx)
      : [...selected, idx];
    setAnswer(q.id, next);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {q.content}
      </p>
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Select all that apply
      </div>
      {q.options.map((opt, idx) => {
        const isSel = selected.includes(idx);
        return (
          <div
            key={idx}
            onClick={() => toggle(idx)}
            className={`cursor-pointer w-full flex items-center gap-3 border rounded-lg px-4 py-3 transition-all
              ${
                isSel
                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-300"
                  : "border-border bg-card hover:bg-secondary/30"
              }`}
          >
            <Checkbox
              checked={isSel}
              onCheckedChange={() => {}} // Controlled by div onClick
              className="pointer-events-none"
            />
            <span className="text-sm">{opt}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 3. True / False */
function TrueFalseRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: TrueFalseQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const selected = answers[q.id] as boolean | undefined;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {q.content}
      </p>
      <div className="flex gap-4">
        {([true, false] as const).map((val) => {
          const isSel = selected === val;
          return (
            <button
              key={String(val)}
              onClick={() => setAnswer(q.id, val)}
              className={`flex-1 py-5 rounded-xl border-2 font-semibold text-sm transition-all
                ${
                  isSel
                    ? val
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950"
                      : "border-red-500 bg-red-50 text-red-700 dark:bg-red-950"
                    : "border-border bg-card hover:bg-secondary/30"
                }`}
            >
              {val ? "✓  True" : "✗  False"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 4. Fill in the Blank */
function FillBlankRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: FillBlankQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const vals =
    (answers[q.id] as string[] | undefined) ?? Array<string>(q.blanks).fill("");
  const setVal = (i: number, v: string) => {
    const next = [...vals];
    next[i] = v;
    setAnswer(q.id, next);
  };

  // Split template on {{n}} markers and render inline inputs
  const parts = q.template.split(/(\{\{\d+\}\})/g);
  let blankIdx = 0;
  const elements = parts.map((part, i) => {
    if (/^\{\{\d+\}\}$/.test(part)) {
      const idx = blankIdx++;
      return (
        <input
          key={i}
          value={vals[idx] ?? ""}
          onChange={(e) => setVal(idx, e.target.value)}
          placeholder={`(${idx + 1})`}
          className="inline-block border-b-2 border-primary bg-transparent text-primary font-semibold text-sm focus:outline-none mx-1 w-28 text-center"
        />
      );
    }
    return (
      <span key={i} className="text-sm leading-relaxed text-foreground">
        {part}
      </span>
    );
  });

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Fill each blank with the appropriate term.
      </p>
      <div className="bg-muted/40 border rounded-lg p-4 leading-[2.5]">
        {elements}
      </div>
      <div
        className={`mt-4 grid gap-3 ${q.blanks <= 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {Array(q.blanks)
          .fill(null)
          .map((_, i) => (
            <div key={i}>
              <label className="text-xs text-muted-foreground mb-1 block">
                Blank {i + 1}
              </label>
              <Input
                value={vals[i] ?? ""}
                onChange={(e) => setVal(i, e.target.value)}
                placeholder={`Answer ${i + 1}…`}
                className="text-sm"
              />
            </div>
          ))}
      </div>
    </div>
  );
}

/** 5. Matching */
function MatchingRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: MatchingQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const val = (answers[q.id] as Record<number, string> | undefined) ?? {};
  const setMatch = (leftIdx: number, rightVal: string) =>
    setAnswer(q.id, { ...val, [leftIdx]: rightVal });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {q.content}
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Left column
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Match with
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {q.left.map((leftItem, i) => (
            <div
              key={`${leftItem}-${i}`}
              className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] sm:items-center"
            >
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {leftItem}
                </span>
              </div>
              <div className="min-w-0">
                <Select
                  value={val[i] ?? ""}
                  onValueChange={(v) => setMatch(i, v)}
                >
                  <SelectTrigger
                    className={`h-12 text-sm ${
                      val[i]
                        ? "border-violet-500 bg-violet-50 text-slate-900 ring-1 ring-violet-200"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <SelectValue placeholder="Select a match" />
                  </SelectTrigger>
                  <SelectContent>
                    {q.right.map((rightItem, j) => (
                      <SelectItem key={j} value={rightItem} className="text-sm">
                        {rightItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/** 6. Find the Error */
function FindErrorRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: FindErrorQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const selected = answers[q.id] as string | undefined;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {q.content}
      </p>
      <p className="text-xs font-medium text-primary mb-3">
        Click on the segment you believe contains the error:
      </p>
      <div className="bg-zinc-950 rounded-lg p-4 space-y-1 font-mono text-sm border border-zinc-800">
        {q.segments.map((seg) => {
          const isSel = selected === seg.label;
          return (
            <button
              key={seg.label}
              onClick={() => setAnswer(q.id, seg.label)}
              className={`w-full text-left flex items-start gap-3 rounded px-3 py-2 transition-all border
                ${
                  isSel
                    ? "bg-red-900/60 border-red-500 text-red-300"
                    : "border-transparent text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                }`}
            >
              <span
                className={`shrink-0 text-xs rounded px-1.5 py-0.5 font-bold mt-0.5
                ${isSel ? "bg-red-500 text-white" : "bg-zinc-700 text-zinc-300"}`}
              >
                {seg.label}
              </span>
              <code className="leading-relaxed">{seg.code}</code>
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-xs text-amber-600 mt-2 font-medium">
          Selected: Segment <strong>{selected}</strong>
        </p>
      )}
    </div>
  );
}

/** 7. Ordering / Sequencing */
function OrderingRenderer({
  q,
  orderState,
  setOrderState,
}: {
  q: OrderingQ;
  orderState: Record<number, string[]>;
  setOrderState: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
}) {
  const items = orderState[q.id] ?? q.items;
  const move = (idx: number, dir: "up" | "down") => {
    const next = [...items];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrderState((prev) => ({ ...prev, [q.id]: next }));
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {q.content}
      </p>
      <p className="text-xs font-medium text-primary mb-3">
        Use the arrow buttons to arrange items in the correct order:
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item}
            className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-card hover:bg-secondary/20 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm">{item}</span>
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => move(idx, "up")}
                disabled={idx === 0}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary disabled:opacity-25 transition-colors"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => move(idx, "down")}
                disabled={idx === items.length - 1}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary disabled:opacity-25 transition-colors"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground font-mono w-5 text-right">
              {idx + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 8. Short Answer / Essay */
function ShortAnswerRenderer({
  q,
  answers,
  setAnswer,
}: {
  q: ShortAnswerQ;
  answers: AnswerMap;
  setAnswer: (id: number, v: unknown) => void;
}) {
  const val = (answers[q.id] as string | undefined) ?? "";
  const wordCount = val.trim() === "" ? 0 : val.trim().split(/\s+/).length;
  const limit = q.maxWords ?? 500;
  const isOver = wordCount > limit;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {q.content}
      </p>
      <Textarea
        placeholder="Write your answer here…"
        value={val}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        className={`min-h-[180px] text-sm resize-y ${isOver ? "border-red-500 focus-visible:ring-red-500" : ""}`}
      />
      <div
        className={`flex justify-end items-center gap-1 mt-1 text-xs ${
          isOver ? "text-red-500 font-medium" : "text-muted-foreground"
        }`}
      >
        {!isOver && wordCount > 0 && (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        )}
        {wordCount} / {limit} words
        {isOver && " — over limit!"}
      </div>
    </div>
  );
}




