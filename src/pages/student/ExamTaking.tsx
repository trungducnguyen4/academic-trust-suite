import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Volume2,
  Maximize,
  X,
  Shield,
  ArrowUp,
  ArrowDown,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';

import { api } from '@/lib/api';

// ─── Question types ───────────────────────────────────────────────
type QType =
  | 'single-choice'
  | 'multi-choice'
  | 'true-false'
  | 'fill-blank'
  | 'matching'
  | 'find-error'
  | 'ordering'
  | 'short-answer';

interface BaseQ { id: number; type: QType; title: string; points: number; audioUrl?: string; }

interface SingleChoiceQ extends BaseQ { type: 'single-choice'; content: string; options: string[]; }
interface MultiChoiceQ  extends BaseQ { type: 'multi-choice';  content: string; options: string[]; }
interface TrueFalseQ    extends BaseQ { type: 'true-false';    content: string; }
interface FillBlankQ    extends BaseQ { type: 'fill-blank';    template: string; blanks: number; }
interface MatchingQ     extends BaseQ { type: 'matching';      content: string; left: string[]; right: string[]; }
interface FindErrorQ    extends BaseQ { type: 'find-error';    content: string; segments: { label: string; code: string }[]; }
interface OrderingQ     extends BaseQ { type: 'ordering';      content: string; items: string[]; }
interface ShortAnswerQ  extends BaseQ { type: 'short-answer';  content: string; maxWords?: number; }

type Question =
  | SingleChoiceQ | MultiChoiceQ | TrueFalseQ | FillBlankQ
  | MatchingQ | FindErrorQ | OrderingQ | ShortAnswerQ;

// ─── Mock questions (10 questions, 8 different types) ─────────────
const rawQuestions: Question[] = [
  {
    id: 1, type: 'single-choice', title: 'Algorithm Complexity', points: 2,
    content: 'What is the worst-case time complexity of Merge Sort?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
  },
  {
    id: 2, type: 'multi-choice', title: 'Data Structures', points: 3,
    content: 'Which of the following are valid implementations of a priority queue? (Select ALL that apply)',
    options: ['Binary Heap', 'Sorted Array', 'Unsorted Linked List', 'Fibonacci Heap', 'Hash Table'],
  },
  {
    id: 3, type: 'true-false', title: 'Graph Theory', points: 1,
    content: "Dijkstra's algorithm can correctly compute shortest paths in a graph that contains negative-weight edges.",
  },
  {
    id: 4, type: 'fill-blank', title: 'Database Concepts', points: 2,
    template: 'A {{1}} key uniquely identifies each record in a table. A {{2}} key in one table references the {{3}} key of another table, establishing a relationship between the two tables.',
    blanks: 3,
  },
  {
    id: 5, type: 'matching', title: 'Concept Matching — Sorting Algorithms', points: 4,
    content: 'Match each sorting algorithm (left column) to its average-case time complexity (right column).',
    left:  ['Bubble Sort', 'Quick Sort', 'Heap Sort', 'Counting Sort'],
    right: ['O(n log n)', 'O(n²)', 'O(n + k)', 'O(n log n)'],
  },
  {
    id: 6, type: 'find-error', title: 'Find the Error — Python Code', points: 3,
    content: 'The following Python function is supposed to return the factorial of n. Click the segment that contains a logical or syntax error:',
    segments: [
      { label: 'A', code: 'def factorial(n):' },
      { label: 'B', code: '    if n == 0:' },
      { label: 'C', code: '        return 0   # base case' },
      { label: 'D', code: '    return n * factorial(n - 1)' },
    ],
  },
  {
    id: 7, type: 'ordering', title: 'Correct Order — TCP Handshake', points: 3,
    content: 'Arrange the following steps of the TCP three-way handshake in their correct sequential order:',
    items: [
      'Client sends ACK to server',
      'Server sends SYN-ACK to client',
      'Client sends SYN to server',
      'Connection established',
    ],
  },
  {
    id: 8, type: 'short-answer', title: 'Short Answer — CAP Theorem', points: 5,
    content: 'Explain the CAP theorem and describe a real-world distributed system that demonstrates the trade-off between consistency and availability. Provide specific examples.',
    maxWords: 200,
  },
  {
    id: 9, type: 'single-choice', title: 'Operating Systems', points: 2,
    content: "Which page replacement algorithm suffers from Bélády's anomaly?",
    options: ['LRU (Least Recently Used)', 'FIFO (First In First Out)', 'Optimal Page Replacement', 'Clock Algorithm'],
  },
  {
    id: 10, type: 'fill-blank', title: 'SQL Syntax', points: 2,
    template: 'To retrieve unique values from a column, you use the {{1}} keyword. To filter grouped results you use the {{2}} clause instead of {{3}}.',
    blanks: 3,
  },
];

function parseOptions(options: any): string[] {
  if (Array.isArray(options)) {
    return options.map((v) => (typeof v === 'string' ? v : String(v?.text ?? v))).filter(Boolean);
  }
  if (options && typeof options === 'object') {
    return Object.keys(options)
      .sort()
      .map((k) => String(options[k]))
      .filter(Boolean);
  }
  return ['Option A', 'Option B', 'Option C', 'Option D'];
}

function mapBackendToUiQuestion(q: any, index: number): Question {
  const type = String(q?.type || '').toUpperCase();
  const base = {
    id: index + 1,
    title: `Question ${index + 1}`,
    points: Number(q?.points ?? 1),
    content: String(q?.content || ''),
  };

  if (type === 'TRUE_FALSE') {
    return { ...base, type: 'true-false' } as TrueFalseQ;
  }
  if (type === 'MULTI_SELECT') {
    return {
      ...base,
      type: 'multi-choice',
      options: parseOptions(q?.options),
    } as MultiChoiceQ;
  }
  if (type === 'MULTIPLE_CHOICE') {
    return {
      ...base,
      type: 'single-choice',
      options: parseOptions(q?.options),
    } as SingleChoiceQ;
  }
  if (type === 'FILL_IN_BLANK') {
    const text = String(q?.content || 'Fill in the blank');
    return {
      ...base,
      type: 'fill-blank',
      template: text.includes('{{1}}') ? text : `${text} {{1}}`,
      blanks: 1,
    } as FillBlankQ;
  }
  if (type === 'ORDERING') {
    return {
      ...base,
      type: 'ordering',
      content: String(q?.content || 'Arrange in order'),
      items: parseOptions(q?.options),
    } as OrderingQ;
  }
  if (type === 'MATCHING') {
    const options = parseOptions(q?.options);
    const half = Math.max(1, Math.floor(options.length / 2));
    return {
      ...base,
      type: 'matching',
      content: String(q?.content || 'Match the following'),
      left: options.slice(0, half),
      right: options.slice(half),
    } as MatchingQ;
  }

  return {
    ...base,
    type: 'short-answer',
    content: String(q?.content || ''),
    maxWords: 200,
  } as ShortAnswerQ;
}

function normalizeSubmissionAnswer(question: Question | undefined, answer: unknown): unknown {
  if (!question) return answer;

  if (question.type === 'single-choice' && typeof answer === 'number') {
    return { answer: String.fromCharCode(65 + answer) };
  }

  if (question.type === 'multi-choice' && Array.isArray(answer)) {
    const labels = answer
      .map((idx) => Number(idx))
      .filter((idx) => !Number.isNaN(idx))
      .sort((a, b) => a - b)
      .map((idx) => String.fromCharCode(65 + idx));
    return { answer: labels.join(',') };
  }

  if (question.type === 'true-false' && typeof answer === 'boolean') {
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
  if (q.type === 'ordering') return true; // any arrangement counts
  if (a === undefined || a === null) return false;
  if (q.type === 'multi-choice') return Array.isArray(a) && (a as number[]).length > 0;
  if (q.type === 'fill-blank')   return Array.isArray(a) && (a as string[]).some((v) => v.trim() !== '');
  if (q.type === 'matching')     return typeof a === 'object' && Object.values(a as object).some((v) => v !== '');
  if (q.type === 'short-answer') return typeof a === 'string' && (a as string).trim().length > 0;
  return true;
}

const EXAM_DURATION = 90 * 60;
const MOUSE_IDLE_THRESHOLD_MS = 45000;

const typeBadgeColor: Record<QType, string> = {
  'single-choice': 'bg-blue-100 text-blue-700',
  'multi-choice':  'bg-violet-100 text-violet-700',
  'true-false':    'bg-teal-100 text-teal-700',
  'fill-blank':    'bg-orange-100 text-orange-700',
  'matching':      'bg-pink-100 text-pink-700',
  'find-error':    'bg-red-100 text-red-700',
  'ordering':      'bg-amber-100 text-amber-700',
  'short-answer':  'bg-green-100 text-green-700',
};

const typeLabel: Record<QType, string> = {
  'single-choice': 'Single Choice',
  'multi-choice':  'Multiple Choice',
  'true-false':    'True / False',
  'fill-blank':    'Fill in the Blank',
  'matching':      'Matching',
  'find-error':    'Find the Error',
  'ordering':      'Ordering',
  'short-answer':  'Short Answer',
};

// ─── Main component ───────────────────────────────────────────────
export default function ExamTaking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId') || undefined;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState('Exam Session');
  const [isLoadingExam, setIsLoadingExam] = useState(true);

  const [orderState, setOrderState] = useState<Record<number, string[]>>({});

  const total = questions.length;
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState<AnswerMap>({});
  const [flagged, setFlagged]       = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft]     = useState(EXAM_DURATION);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logRef   = useRef<{ type: string; ts: number; detail?: string }[]>([]);
  const lastMouseActivityRef = useRef<number>(Date.now());
  const mouseIdleLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const loadExam = async () => {
      setIsLoadingExam(true);
      try {
        if (!examId) {
          const fallback = shuffleArray(rawQuestions).map((q) => {
            if (q.type === 'single-choice' || q.type === 'multi-choice') {
              return { ...q, options: shuffleArray(q.options) };
            }
            if (q.type === 'matching') {
              return { ...q, right: shuffleArray(q.right) };
            }
            return q;
          });
          if (!mounted) return;
          setExamTitle('Practice Exam');
          setQuestions(fallback);
          return;
        }

        const exam = await api.getExam(examId);
        const backendQuestions = Array.isArray(exam?.examQuestions) ? exam.examQuestions : [];
        const mapped = backendQuestions.map((eq: any, idx: number) => {
          const ui = mapBackendToUiQuestion(eq?.question, idx) as any;
          return {
            ...ui,
            questionId: eq?.questionId || eq?.question?.id,
          };
        });

        if (!mounted) return;
        setExamTitle(exam?.title || 'Exam Session');
        setQuestions(mapped.length > 0 ? mapped : []);
      } catch (err) {
        console.error('Failed to load exam questions:', err);
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
      .filter((q): q is OrderingQ => q.type === 'ordering')
      .forEach((q) => {
        init[q.id] = shuffleArray(q.items);
      });
    setOrderState(init);
  }, [questions]);

  const log = useCallback((type: string, detail?: string) => {
    logRef.current.push({ type, ts: Date.now(), detail });
  }, []);

  // Fullscreen: enter on mount, watch for exits
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    log('exam_start');

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExits((n) => n + 1);
        setShowFullscreenWarning(true);
        log('fullscreen_exit', 'User exited fullscreen');

        // send immediate log to server (fire-and-forget)
        try {
          const submissionId = localStorage.getItem('currentSubmissionId');
          if (submissionId) {
            api.sendExamLogs(submissionId, [{ type: 'fullscreen_exit', details: 'User exited fullscreen', ts: Date.now() }])
              .catch((e) => console.error('sendExamLogs failed', e));
          }
        } catch (e) {
          console.error('Failed to send fullscreen log', e);
        }

        setTimeout(() => setShowFullscreenWarning(false), 5000);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [log]);

  // Timer with auto-submit
  const doSubmit = useCallback(async () => {
    setIsSubmitting(true);
    log('submit');
    // attempt to submit answers + logs if we have a submissionId stored
    try {
      let submissionId = localStorage.getItem('currentSubmissionId');
      const submissionExamId = localStorage.getItem('currentSubmissionExamId');

      // Drop stale submission ids from previous exams.
      if (examId && submissionExamId && submissionExamId !== examId) {
        submissionId = null;
      }

      // Create a submission now if missing.
      if (!submissionId && examId) {
        const started = await api.startExam(examId);
        if (started?.id) {
          submissionId = started.id;
          localStorage.setItem('currentSubmissionId', submissionId);
          localStorage.setItem('currentSubmissionExamId', examId);
        }
      }

      if (!submissionId) {
        throw new Error('No active submission found for this exam.');
      }

      // build answers payload from current answers map
      const payloadAnswers = Object.entries(answers)
        .map(([uiQId, ans]) => {
          const question = questions.find((q: any) => q.id === Number(uiQId)) as any;
          if (!question?.questionId) return null;
          return {
            questionId: String(question.questionId),
            answer: normalizeSubmissionAnswer(question as Question, ans),
            timeTaken: undefined,
          };
        })
        .filter(Boolean) as Array<{ questionId: string; answer: any; timeTaken?: number }>;

      // send logs
      const logs = logRef.current.map((l) => ({ type: l.type, details: l.detail, ts: l.ts }));
      await api.submitExam(submissionId, payloadAnswers, logs);

      // Clear active submission markers after successful submit.
      try {
        localStorage.removeItem('currentSubmissionId');
        localStorage.removeItem('currentSubmissionExamId');
      } catch {}
    } catch (err) {
      console.error('Failed to submit to server:', err);
      alert('Submit failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Navigate to grading for this exam if available
    if (examId) navigate(`/student/grading?examId=${encodeURIComponent(examId)}`);
    else navigate('/student/grading');
  }, [log, navigate, examId, answers, questions]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { doSubmit(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [doSubmit]);

  // Tab switch detection
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setTabSwitches((n) => n + 1);
        setShowTabWarning(true);
        log('tab_switch');
        setTimeout(() => setShowTabWarning(false), 5000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [log]);

  // Mouse idle tracking (silent for student): logs when no activity for a threshold period.
  useEffect(() => {
    const markActivity = () => {
      lastMouseActivityRef.current = Date.now();
      mouseIdleLoggedRef.current = false;
    };

    const onActivityEvents: Array<keyof DocumentEventMap> = [
      'mousemove',
      'mousedown',
      'wheel',
      'keydown',
      'touchstart',
    ];

    onActivityEvents.forEach((evt) => document.addEventListener(evt, markActivity, { passive: true }));

    const idleCheckId = window.setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastMouseActivityRef.current;
      if (idleMs < MOUSE_IDLE_THRESHOLD_MS) return;
      if (mouseIdleLoggedRef.current) return;

      mouseIdleLoggedRef.current = true;
      const idleSeconds = Math.floor(idleMs / 1000);
      const detail = `No mouse activity for ${idleSeconds}s`;

      log('mouse_idle', detail);

      try {
        const submissionId = localStorage.getItem('currentSubmissionId');
        if (submissionId) {
          api.sendExamLogs(submissionId, [{ type: 'mouse_idle', details: detail, ts: now }])
            .catch((e) => console.error('sendExamLogs mouse_idle failed', e));
        }
      } catch (e) {
        console.error('Failed to send mouse idle log', e);
      }
    }, 5000);

    return () => {
      onActivityEvents.forEach((evt) => document.removeEventListener(evt, markActivity));
      window.clearInterval(idleCheckId);
    };
  }, [log]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isTimeLow      = timeLeft < 300;
  const answeredCount  = questions.filter((q) => isAnswered(q, answers)).length;
  const flaggedCount   = Object.values(flagged).filter(Boolean).length;
  const q              = questions[current];

  if (isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading exam...
      </div>
    );
  }

  if (total === 0 || !q) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">No questions found for this exam.</p>
          <p className="text-sm text-muted-foreground mt-1">Please contact your instructor or try again later.</p>
          <Button className="mt-4" onClick={() => navigate('/student')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const setAnswer = (qId: number, val: unknown) =>
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      log('answer', JSON.stringify({ questionId: qId, value: val }));
      return next;
    });

  const handleFlag  = () => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  const handleClear = () =>
    setAnswers((prev) => { const next = { ...prev }; delete next[q.id]; return next; });

  // ─── Dispatch to sub-renderers ────────────────────────────────
  const renderQuestion = (q: Question) => {
    switch (q.type) {
      case 'single-choice': return <SingleChoiceRenderer q={q} answers={answers} setAnswer={setAnswer} />;
      case 'multi-choice':  return <MultiChoiceRenderer  q={q} answers={answers} setAnswer={setAnswer} />;
      case 'true-false':    return <TrueFalseRenderer    q={q} answers={answers} setAnswer={setAnswer} />;
      case 'fill-blank':    return <FillBlankRenderer    q={q} answers={answers} setAnswer={setAnswer} />;
      case 'matching':      return <MatchingRenderer     q={q} answers={answers} setAnswer={setAnswer} />;
      case 'find-error':    return <FindErrorRenderer    q={q} answers={answers} setAnswer={setAnswer} />;
      case 'ordering':      return <OrderingRenderer     q={q} orderState={orderState} setOrderState={setOrderState} />;
      case 'short-answer':  return <ShortAnswerRenderer  q={q} answers={answers} setAnswer={setAnswer} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Database Systems Quiz</span>
                    <span className="font-semibold text-sm">{examTitle}</span>
          {tabSwitches > 0 && (
            <StatusBadge variant="destructive">
              {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-semibold ${
            isTimeLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-secondary text-foreground'
          }`}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
          <Button variant="ghost" size="sm" onClick={() => document.documentElement.requestFullscreen?.()}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Tab switch overlay ───────────────────────────────────── */}
      {showTabWarning && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 max-w-sm text-center border shadow-xl">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tab Switch Detected!</h2>
            <p className="text-muted-foreground mb-1">This incident has been recorded.</p>
            <p className="text-muted-foreground text-sm mb-5">Total violations: <strong>{tabSwitches}</strong></p>
            <Button onClick={() => setShowTabWarning(false)}>Return to Exam</Button>
          </div>
        </div>
      )}

      {/* Fullscreen exit overlay */}
      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 max-w-sm text-center border shadow-xl">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Fullscreen Exited!</h2>
            <p className="text-muted-foreground mb-1">This incident has been recorded and reported to your instructor.</p>
            <p className="text-muted-foreground text-sm mb-5">Total violations: <strong>{fullscreenExits}</strong></p>
            <Button
              onClick={async () => {
                try {
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                    log('fullscreen_resume', 'User returned to fullscreen via warning dialog');
                  }
                } catch (e) {
                  console.error('Failed to re-enter fullscreen', e);
                } finally {
                  setShowFullscreenWarning(false);
                }
              }}
            >
              Return to Exam
            </Button>
          </div>
        </div>
      )}

      <div className="flex pt-14 min-h-screen">
        {/* ── Navigator Sidebar ────────────────────────────────── */}
        <aside className="fixed left-0 top-14 bottom-0 w-60 bg-card border-r flex flex-col p-4 overflow-y-auto hidden md:flex">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Progress</h3>
          <Progress value={(answeredCount / total) * 100} className="h-1.5 mb-1" />
          <p className="text-xs text-muted-foreground mb-3">{answeredCount}/{total} answered</p>

          <div className="grid grid-cols-4 md:grid-cols-5 gap-1 mb-4">
            {questions.map((qItem, idx) => {
              const ans = isAnswered(qItem, answers);
              const fl  = flagged[qItem.id];
              const cur = current === idx;
              return (
                <button
                  key={qItem.id}
                  onClick={() => setCurrent(idx)}
                  title={`Q${idx + 1}: ${typeLabel[qItem.type]}`}
                  className={[
                    'h-8 w-8 rounded text-xs font-medium border transition-all',
                    cur ? 'ring-2 ring-primary ring-offset-1' : '',
                    fl  ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : '',
                    ans && !fl ? 'bg-green-100 border-green-300 text-green-700' : '',
                    !ans && !fl ? 'bg-secondary border-border text-muted-foreground' : '',
                  ].join(' ')}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3 mb-4">
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 shrink-0" /> Answered</div>
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 shrink-0" /> Flagged</div>
            <div className="flex gap-2 items-center"><span className="w-3 h-3 rounded bg-secondary border shrink-0" /> Unanswered</div>
          </div>

          <div className="mt-auto">
            <Button className="w-full gap-2" variant="destructive" onClick={() => setShowSubmitDialog(true)}>
              <Send className="h-4 w-4" /> Finish & Submit
            </Button>
          </div>
        </aside>

        {/* ── Main Question Area ────────────────────────────────── */}
        <main className="md:ml-60 ml-0 flex-1 p-6 flex justify-center">
          <div className="w-full max-w-3xl">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">Q{current + 1} / {total}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[q.type]}`}>
                      {typeLabel[q.type]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{q.points} pts</span>
                  </div>
                  {flagged[q.id] && <StatusBadge variant="warning">Flagged</StatusBadge>}
                </div>
                <h2 className="text-lg font-semibold mt-2">{q.title}</h2>
              </CardHeader>

              <CardContent>
                {q.audioUrl && (
                  <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border">
                    <Volume2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm flex-1">Audio resource attached</span>
                    <Button size="sm" variant="outline" disabled={isAudioPlaying}
                      onClick={() => {
                        audioRef.current?.pause();
                        audioRef.current = new Audio(q.audioUrl);
                        audioRef.current.play();
                        setIsAudioPlaying(true);
                        audioRef.current.onended = () => setIsAudioPlaying(false);
                      }}>
                      {isAudioPlaying ? 'Playing…' : 'Play Audio'}
                    </Button>
                  </div>
                )}

                {renderQuestion(q)}

                {/* Per-question actions */}
                <div className="flex items-center gap-2 mt-5">
                  <Button
                    variant={flagged[q.id] ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={handleFlag}
                    className="gap-1.5"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {flagged[q.id] ? 'Unflag' : 'Flag for Review'}
                  </Button>
                  {q.type !== 'ordering' && (
                    <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> Clear Answer
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
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  {current === total - 1 ? (
                    <Button onClick={() => setShowSubmitDialog(true)} className="gap-2">
                      <Send className="h-4 w-4" /> Finish Exam
                    </Button>
                  ) : (
                    <Button onClick={() => setCurrent((c) => c + 1)} className="gap-2">
                      Save & Continue <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* ── Submit Dialog ────────────────────────────────────────── */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-xl font-bold text-green-700">{answeredCount}</p>
                    <p className="text-xs text-green-600">Answered</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <p className="text-xl font-bold text-yellow-700">{flaggedCount}</p>
                    <p className="text-xs text-yellow-600">Flagged</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <p className="text-xl font-bold text-red-700">{total - answeredCount}</p>
                    <p className="text-xs text-red-600">Unanswered</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Time remaining: <strong className="text-foreground">{formatTime(timeLeft)}</strong>
                </p>
                <p className="text-muted-foreground text-xs">
                  Once submitted, your exam cannot be modified.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={doSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Exam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Question sub-renderers ────────────────────────────────────────

/** 1. Single Choice (radio-style) */
function SingleChoiceRenderer({
  q, answers, setAnswer
}: { q: SingleChoiceQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const selected = answers[q.id] as number | undefined;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">{q.content}</p>
      {q.options.map((opt, idx) => {
        const isSel = selected === idx;
        return (
          <button
            key={idx}
            onClick={() => setAnswer(q.id, idx)}
            className={`w-full text-left border rounded-lg px-4 py-3 flex items-center gap-3 transition-all
              ${isSel
                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/30'}`}
          >
            <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              isSel ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
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
  q, answers, setAnswer
}: { q: MultiChoiceQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const selected = (answers[q.id] as number[] | undefined) ?? [];
  const toggle = (idx: number) => {
    const next = selected.includes(idx)
      ? selected.filter((i) => i !== idx)
      : [...selected, idx];
    setAnswer(q.id, next);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">{q.content}</p>
      <p className="text-xs font-medium text-primary">Select all that apply.</p>
      {q.options.map((opt, idx) => {
        const isSel = selected.includes(idx);
        return (
          <div
            key={idx}
            onClick={() => toggle(idx)}
            className={`cursor-pointer w-full flex items-center gap-3 border rounded-lg px-4 py-3 transition-all
              ${isSel
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/30'}`}
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
  q, answers, setAnswer
}: { q: TrueFalseQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const selected = answers[q.id] as boolean | undefined;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{q.content}</p>
      <div className="flex gap-4">
        {([true, false] as const).map((val) => {
          const isSel = selected === val;
          return (
            <button
              key={String(val)}
              onClick={() => setAnswer(q.id, val)}
              className={`flex-1 py-5 rounded-xl border-2 font-semibold text-sm transition-all
                ${isSel
                  ? val
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950'
                  : 'border-border bg-card hover:bg-secondary/30'}`}
            >
              {val ? '✓  True' : '✗  False'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 4. Fill in the Blank */
function FillBlankRenderer({
  q, answers, setAnswer
}: { q: FillBlankQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const vals = (answers[q.id] as string[] | undefined) ?? Array<string>(q.blanks).fill('');
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
          value={vals[idx] ?? ''}
          onChange={(e) => setVal(idx, e.target.value)}
          placeholder={`(${idx + 1})`}
          className="inline-block border-b-2 border-primary bg-transparent text-primary font-semibold text-sm focus:outline-none mx-1 w-28 text-center"
        />
      );
    }
    return <span key={i} className="text-sm leading-relaxed text-foreground">{part}</span>;
  });

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Fill each blank with the appropriate term.</p>
      <div className="bg-muted/40 border rounded-lg p-4 leading-[2.5]">{elements}</div>
      <div className={`mt-4 grid gap-3 ${q.blanks <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {Array(q.blanks).fill(null).map((_, i) => (
          <div key={i}>
            <label className="text-xs text-muted-foreground mb-1 block">Blank {i + 1}</label>
            <Input
              value={vals[i] ?? ''}
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
  q, answers, setAnswer
}: { q: MatchingQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const val = (answers[q.id] as Record<number, string> | undefined) ?? {};
  const setMatch = (leftIdx: number, rightVal: string) =>
    setAnswer(q.id, { ...val, [leftIdx]: rightVal });

  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{q.content}</p>
      <div className="space-y-3">
        {q.left.map((leftItem, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Left concept */}
            <div className="flex-1 min-w-0 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 text-sm font-medium text-blue-800 dark:text-blue-200">
              {leftItem}
            </div>
            {/* Arrow */}
            <div className="flex items-center gap-1 text-muted-foreground shrink-0 text-xs">
              <div className="w-4 border-t-2 border-dashed border-muted-foreground/40" />
              →
              <div className="w-4 border-t-2 border-dashed border-muted-foreground/40" />
            </div>
            {/* Right dropdown */}
            <div className="flex-1 min-w-0">
              <Select value={val[i] ?? ''} onValueChange={(v) => setMatch(i, v)}>
                <SelectTrigger className={`text-sm ${val[i] ? 'border-green-500 text-green-700' : ''}`}>
                  <SelectValue placeholder="Select match…" />
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
  );
}

/** 6. Find the Error */
function FindErrorRenderer({
  q, answers, setAnswer
}: { q: FindErrorQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const selected = answers[q.id] as string | undefined;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{q.content}</p>
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
                ${isSel
                  ? 'bg-red-900/60 border-red-500 text-red-300'
                  : 'border-transparent text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}
            >
              <span className={`shrink-0 text-xs rounded px-1.5 py-0.5 font-bold mt-0.5
                ${isSel ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
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
  q, orderState, setOrderState
}: {
  q: OrderingQ;
  orderState: Record<number, string[]>;
  setOrderState: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
}) {
  const items = orderState[q.id] ?? q.items;
  const move = (idx: number, dir: 'up' | 'down') => {
    const next = [...items];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrderState((prev) => ({ ...prev, [q.id]: next }));
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{q.content}</p>
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
                onClick={() => move(idx, 'up')}
                disabled={idx === 0}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary disabled:opacity-25 transition-colors"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => move(idx, 'down')}
                disabled={idx === items.length - 1}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-secondary disabled:opacity-25 transition-colors"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground font-mono w-5 text-right">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 8. Short Answer / Essay */
function ShortAnswerRenderer({
  q, answers, setAnswer
}: { q: ShortAnswerQ; answers: AnswerMap; setAnswer: (id: number, v: unknown) => void }) {
  const val = (answers[q.id] as string | undefined) ?? '';
  const wordCount = val.trim() === '' ? 0 : val.trim().split(/\s+/).length;
  const limit = q.maxWords ?? 500;
  const isOver = wordCount > limit;
  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{q.content}</p>
      <Textarea
        placeholder="Write your answer here…"
        value={val}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        className={`min-h-[180px] text-sm resize-y ${isOver ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
      />
      <div className={`flex justify-end items-center gap-1 mt-1 text-xs ${
        isOver ? 'text-red-500 font-medium' : 'text-muted-foreground'
      }`}>
        {!isOver && wordCount > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        {wordCount} / {limit} words
        {isOver && ' — over limit!'}
      </div>
    </div>
  );
}
