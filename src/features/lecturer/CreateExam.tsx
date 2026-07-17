"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import api, { unwrapPaginatedData } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Users,
  Shield,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Plus,
  FileText,
  Settings,
  Eye,
  Sparkles,
  Wand2,
  AlertCircle,
  Upload,
  FileCheck,
  FileSearch,
  Database,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import {
  getNumericInputError,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/lib/number-input";

// ─── Steps ───────────────────────────────────────────────────────
type Step = "info" | "settings" | "questions" | "preview";
const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "info", label: "Basic Info", icon: <FileText className="h-4 w-4" /> },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    key: "questions",
    label: "Questions",
    icon: <BookOpen className="h-4 w-4" />,
  },
  { key: "preview", label: "Preview", icon: <Eye className="h-4 w-4" /> },
];

interface ExamForm {
  title: string;
  course: string;
  description: string;
  duration: string;
  maxAttempts: string;
  gradingStrategy: "HIGHEST" | "AVERAGE" | "FIRST_ATTEMPT" | "LAST_ATTEMPT";
  passingScore: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  requiresProctoring: boolean;
  allowLateSubmission: boolean;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  questionType: string;
  bankDifficulty: string;
  questionCount: string;
  sourceMethod: "bank" | "import" | "ai";
  aiGenerationMode: boolean;
  aiPrompt: string;
  aiDifficulty: string;
  aiReviewRequired: boolean;
}

type ReviewPhaseKey = "during" | "after";

type ReviewPhaseConfig = {
  showScore: boolean;
  showAnswers: boolean;
  showFeedback: boolean;
};

type ReviewSettingsDraft = {
  enabled: boolean;
  phases: Record<ReviewPhaseKey, ReviewPhaseConfig>;
};

const REVIEW_PHASE_META: { key: ReviewPhaseKey; title: string; description: string }[] = [
  {
    key: "during",
    title: "During review window",
    description: "Optional partial review access while the exam is still active.",
  },
  {
    key: "after",
    title: "After submission",
    description: "What students can see once the attempt is submitted or graded.",
  },
];

const createDefaultReviewSettingsDraft = (): ReviewSettingsDraft => ({
  enabled: true,
  phases: {
    during: {
      showScore: false,
      showAnswers: false,
      showFeedback: false,
    },
    after: {
      showScore: true,
      showAnswers: true,
      showFeedback: true,
    },
  },
});

const buildReviewSettingsPayload = (draft: ReviewSettingsDraft) => ({
  type: "phase-based",
  enabled: draft.enabled,
  phases: draft.phases,
});

const reviewPhaseSummary = (phase: ReviewPhaseConfig) => {
  const items = [
    phase.showScore ? "Score" : null,
    phase.showAnswers ? "Answers" : null,
    phase.showFeedback ? "Feedback" : null,
  ].filter(Boolean);

  return items.length ? items.join(", ") : "Hidden";
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const toTimeInputValue = (date: Date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const getDefaultExamWindow = () => {
  const now = new Date();

  // Round forward to the next hour (e.g. 09:15 -> 10:00, 09:00 -> 10:00).
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  // End time defaults to one hour after the rounded start time.
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    startDate: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endDate: toDateInputValue(end),
    endTime: toTimeInputValue(end),
  };
};

const createDefaultForm = (): ExamForm => {
  const examWindow = getDefaultExamWindow();

  return {
    title: "",
    course: "",
    description: "",
    duration: "60",
    maxAttempts: "1",
    gradingStrategy: "HIGHEST",
    passingScore: "50",
    startDate: examWindow.startDate,
    startTime: examWindow.startTime,
    endDate: examWindow.endDate,
    endTime: examWindow.endTime,
    requiresProctoring: true,
    allowLateSubmission: false,
    shuffleQuestions: true,
    showResultImmediately: false,
    questionType: "mixed",
    bankDifficulty: "mixed",
    questionCount: "20",
    sourceMethod: "bank",
    aiGenerationMode: false,
    aiPrompt: "",
    aiDifficulty: "medium",
    aiReviewRequired: true,
  };
};

const MAX_ATTEMPT_OPTIONS = Array.from({ length: 10 }, (_, index) =>
  String(index + 1),
);

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface BankTopic {
  topicId: string;
  topic: string;
  count: number;
  selected: boolean;
  requestedCount: string;
  availableByType: Record<string, number>;
}

type QuestionSourceMode = "choose" | "manual" | "bank-select" | "bank-random";

interface BankQuestionOption {
  id: string;
  type: string;
  content: string;
  difficulty?: number;
}

interface ManualQuestionOption {
  id: string;
  text: string;
  match?: string;
  isCorrect: boolean;
}

const createDefaultManualOptions = (): ManualQuestionOption[] => [
  { id: "A", text: "", isCorrect: true },
  { id: "B", text: "", isCorrect: false },
  { id: "C", text: "", isCorrect: false },
  { id: "D", text: "", isCorrect: false },
];

const QUESTION_TYPE_OPTIONS = [
  { value: "mixed", label: "Mixed (all types)" },
  { value: "single-choice", label: "Single Choice only" },
  { value: "multiple-choice", label: "Multiple Choice only" },
  { value: "true-false", label: "True / False only" },
  { value: "fill-blank", label: "Fill in the Blank only" },
  { value: "matching", label: "Matching only" },
  { value: "ordering", label: "Ordering only" },
  { value: "short-answer", label: "Short Answer / Essay only" },
  { value: "custom", label: "Custom Selection (Other)" },
] as const;

const difficultyOptionToValue = (option: string): number => {
  if (option === "easy") return 0.3;
  if (option === "hard") return 0.7;
  return 0.5;
};

const difficultyOptionToBankValue = (option: string): string => {
  if (option === "mixed") return "mixed";
  return String(difficultyOptionToValue(option));
};

const difficultyLabelFromValue = (
  value: unknown,
): "Easy" | "Medium" | "Hard" => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Medium";
  if (n <= 0.3) return "Easy";
  if (n <= 0.5) return "Medium";
  return "Hard";
};

const mapQuestionTypeToAiApi = (value: string) => {
  const map: Record<string, string> = {
    mixed: "MIXED",
    custom: "MIXED",
    "single-choice": "MULTIPLE_CHOICE",
    "multiple-choice": "MULTIPLE_CHOICE",
    "true-false": "TRUE_FALSE",
    "fill-blank": "FILL_IN_BLANK",
    matching: "MATCHING",
    ordering: "ORDERING",
    "short-answer": "SHORT_ANSWER",
  };
  return map[value] || "MIXED";
};

const mapQuestionTypeToDb = (value: string) => {
  const map: Record<string, string> = {
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    MULTI_SELECT: "MULTI_SELECT",
    TRUE_FALSE: "TRUE_FALSE",
    SHORT_ANSWER: "SHORT_ANSWER",
    ESSAY: "ESSAY",
    FILL_IN_BLANK: "FILL_IN_BLANK",
    MATCHING: "MATCHING",
    ORDERING: "ORDERING",
    "single-choice": "MULTIPLE_CHOICE",
    "multiple-choice": "MULTIPLE_CHOICE",
    "true-false": "TRUE_FALSE",
    "short-answer": "SHORT_ANSWER",
    "fill-blank": "FILL_IN_BLANK",
    mixed: "MULTIPLE_CHOICE",
    custom: "MULTIPLE_CHOICE",
  };

  const normalized = String(value || "").trim();
  return map[normalized] || map[normalized.toUpperCase()] || "MULTIPLE_CHOICE";
};

// Tags removed from question model

const WHOLE_COURSE_LABEL = "All questions in course";

const normalizeDifficultyForQuestion = (value: unknown) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 5;
  if (n <= 1) return Math.max(1, Math.min(10, Math.round(n * 9 + 1)));
  return Math.max(1, Math.min(10, Math.round(n)));
};

export default function CreateExam() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState<ExamForm>(() => createDefaultForm());
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [bankTopics, setBankTopics] = useState<BankTopic[]>([]);
  const [isLoadingBankTopics, setIsLoadingBankTopics] = useState(false);
  const [numberErrors, setNumberErrors] = useState<Record<string, string>>({});
  const [reviewSettingsDraft, setReviewSettingsDraft] = useState<ReviewSettingsDraft>(() => createDefaultReviewSettingsDraft());
  const [questionSourceMode, setQuestionSourceMode] = useState<QuestionSourceMode>("manual");
  const [selectedBankTopicId, setSelectedBankTopicId] = useState("");
  const [bankQuestions, setBankQuestions] = useState<BankQuestionOption[]>([]);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<string[]>([]);
  const [isLoadingBankQuestions, setIsLoadingBankQuestions] = useState(false);
  const [manualQuestionContent, setManualQuestionContent] = useState("");
  const [manualQuestionType, setManualQuestionType] = useState("multiple_choice");
  const [manualOptions, setManualOptions] = useState<ManualQuestionOption[]>(createDefaultManualOptions);
  const [manualMultipleAnswers, setManualMultipleAnswers] = useState(false);
  const [manualTrueFalseAnswer, setManualTrueFalseAnswer] = useState<"true" | "false">("true");
  const [manualExplanation, setManualExplanation] = useState("");
  const [manualEssayRubric, setManualEssayRubric] = useState("");
  const [manualDifficulty, setManualDifficulty] = useState("medium");
  const [manualTopicId, setManualTopicId] = useState("");
  const [manualLearningObjective, setManualLearningObjective] = useState("");
  const [manualAiPrompt, setManualAiPrompt] = useState("");
  const [isManualAiGenerating, setIsManualAiGenerating] = useState(false);
  const isSingleAttempt = form.maxAttempts === "1";

  useEffect(() => {
    if (isSingleAttempt && form.allowLateSubmission) {
      setForm((current) =>
        current.allowLateSubmission
          ? { ...current, allowLateSubmission: false }
          : current,
      );
    }
  }, [form.allowLateSubmission, isSingleAttempt]);

  const set = (key: keyof ExamForm, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const bankSelectionWarning = useMemo(() => {
    const selectedTopics = bankTopics.filter((topic) => topic.selected);
    if (selectedTopics.length === 0) return "";

    const typeFilter =
      form.questionType === "mixed" || form.questionType === "custom"
        ? undefined
        : mapQuestionTypeToDb(form.questionType);

    for (const topic of selectedTopics) {
      const requested = Math.max(0, Number(topic.requestedCount || 0));
      const available = typeFilter
        ? Number(topic.availableByType?.[typeFilter] || 0)
        : Number(topic.count || 0);

      if (requested > available) {
        const label = typeFilter ? `for ${typeFilter}` : "in this topic";
        return `Topic "${topic.topic}" only has ${available} questions ${label}, but ${requested} were requested.`;
      }
    }

    return "";
  }, [bankTopics, form.questionType]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = unwrapPaginatedData(await api.getCourses());
        const mappedCourses = data.map((course: any) => ({
          id: course.id,
          code: course.code,
          name: course.name,
        }));
        setCourses(mappedCourses);

        const requestedCourseId = new URLSearchParams(
          window.location.search,
        ).get("courseId");
        if (
          requestedCourseId &&
          mappedCourses.some((course: CourseOption) => course.id === requestedCourseId)
        ) {
          setForm((current) =>
            current.course ? current : { ...current, course: requestedCourseId },
          );
        }
      } catch (error) {
        console.error("Failed to load courses for exam creation:", error);
      }
    };

    loadCourses();
  }, []);

  useEffect(() => {
    let active = true;

    const loadBankTopics = async () => {
      if (!form.course) {
        setBankTopics([]);
        return;
      }

      setBankTopics([]);
      setIsLoadingBankTopics(true);
      try {
        const normalizeType = (value: string) => String(value || "").trim().toUpperCase();
        const limit = 100;

        const loadQuestionsForTopic = async (topicId?: string) => {
          let page = 1;
          let totalPages = 1;
          const questions: any[] = [];

          while (page <= totalPages) {
            const response: any = await api.listQuestions({
              courseId: form.course,
              topicId,
              page,
              limit,
            });
            const items = Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response)
                ? response
                : [];

            totalPages = Number(response?.pagination?.totalPages || response?.totalPages || 1);
            questions.push(...items);
            page += 1;
          }

          return questions;
        };

        const topicsResponse = await api.listQuestionTopics({
          courseId: form.course,
          limit: 100,
        });
        const topicsData = Array.isArray(topicsResponse?.data)
          ? topicsResponse.data
          : Array.isArray(topicsResponse)
            ? topicsResponse
            : [];

        if (topicsData.length === 0) {
          const questions = await loadQuestionsForTopic();
          const typeCounts = questions.reduce((acc: Record<string, number>, question: any) => {
            const type = normalizeType(question.type);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});

          if (!active) return;

          setBankTopics([
            {
              topicId: "",
              topic: WHOLE_COURSE_LABEL,
              count: questions.length,
              selected: false,
              requestedCount: "0",
              availableByType: typeCounts,
            },
          ]);
          return;
        }

        const nextTopics = await Promise.all(
          topicsData.map(async (topic: any) => {
            const questions = await loadQuestionsForTopic(topic.id);
            const typeCounts = questions.reduce((acc: Record<string, number>, question: any) => {
              const type = normalizeType(question.type);
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {});

            return {
              topicId: topic.id,
              topic: topic.name,
              count: questions.length,
              selected: false,
              requestedCount: "0",
              availableByType: typeCounts,
            };
          }),
        );

        if (!active) return;

        setBankTopics(
          nextTopics.sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)),
        );
      } catch (error) {
        console.error("Failed to load question bank topics:", error);
        if (active) setBankTopics([]);
      } finally {
        if (active) setIsLoadingBankTopics(false);
      }
    };

    loadBankTopics();

    return () => {
      active = false;
    };
  }, [form.course]);

  useEffect(() => {
    let active = true;

    const loadSelectableQuestions = async () => {
      if (questionSourceMode !== "bank-select" || !form.course || !selectedBankTopicId) {
        setBankQuestions([]);
        return;
      }

      setIsLoadingBankQuestions(true);
      try {
        const response: any = await api.listQuestions({
          courseId: form.course,
          topicId: selectedBankTopicId === "__all__" ? undefined : selectedBankTopicId,
          page: 1,
          limit: 100,
        });
        const questions = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        if (active) {
          setBankQuestions(
            questions.map((question: any) => ({
              id: String(question.id),
              type: String(question.type || "UNKNOWN"),
              content: String(question.content || question.stem || "Untitled question"),
              difficulty: Number(question.difficulty || 0) || undefined,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load selectable questions:", error);
        if (active) setBankQuestions([]);
      } finally {
        if (active) setIsLoadingBankQuestions(false);
      }
    };

    loadSelectableQuestions();
    return () => {
      active = false;
    };
  }, [form.course, questionSourceMode, selectedBankTopicId]);

  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((question) => {
      const matchesType =
        form.questionType === "mixed" ||
        form.questionType === "custom" ||
        question.type === mapQuestionTypeToDb(form.questionType);
      const matchesDifficulty =
        form.bankDifficulty === "mixed" ||
        difficultyLabelFromValue(question.difficulty).toLowerCase() === form.bankDifficulty;
      return matchesType && matchesDifficulty;
    });
  }, [bankQuestions, form.bankDifficulty, form.questionType]);

  const randomQuestionCount = useMemo(
    () =>
      bankTopics.reduce(
        (total, topic) =>
          total + (topic.selected ? Math.max(0, Number(topic.requestedCount || 0)) : 0),
        0,
      ),
    [bankTopics],
  );
  const composedQuestionCount =
    aiGeneratedQuestions.length + selectedBankQuestionIds.length + randomQuestionCount;

  const addManualQuestion = () => {
    if (!manualQuestionContent.trim()) {
      toast.error("Question text is required.");
      return;
    }

    const filledOptions = manualOptions.filter((option) => option.text.trim());
    if (
      ["multiple_choice", "matching", "ordering"].includes(manualQuestionType) &&
      filledOptions.length < 2
    ) {
      toast.error("At least two options or items are required.");
      return;
    }
    if (
      manualQuestionType === "multiple_choice" &&
      !filledOptions.some((option) => option.isCorrect)
    ) {
      toast.error("Select at least one correct answer.");
      return;
    }
    if (manualQuestionType === "essay" && !manualEssayRubric.trim()) {
      toast.error("A grading rubric is required for essay questions.");
      return;
    }

    const backendType =
      manualQuestionType === "multiple_choice"
        ? manualMultipleAnswers
          ? "MULTI_SELECT"
          : "MULTIPLE_CHOICE"
        : manualQuestionType === "true_false"
          ? "TRUE_FALSE"
          : manualQuestionType === "fill_blank"
            ? "FILL_IN_BLANK"
            : manualQuestionType === "matching"
              ? "MATCHING"
              : manualQuestionType === "ordering"
                ? "ORDERING"
                : "ESSAY";
    const options =
      manualQuestionType === "matching"
        ? filledOptions.reduce<Record<string, string>>((result, option) => {
            result[option.text] = option.match || "";
            return result;
          }, {})
        : ["multiple_choice", "ordering"].includes(manualQuestionType)
          ? filledOptions.reduce<Record<string, string>>((result, option) => {
              result[option.id] = option.text;
              return result;
            }, {})
          : undefined;
    const correctAnswer =
      manualQuestionType === "multiple_choice"
        ? {
            answer: filledOptions
              .filter((option) => option.isCorrect)
              .map((option) => option.id)
              .join(","),
          }
        : manualQuestionType === "true_false"
          ? { answer: manualTrueFalseAnswer === "true" }
          : manualQuestionType === "fill_blank"
            ? {
                answers: Array.from(
                  manualQuestionContent.matchAll(/\[\[(.*?)\]\]/g),
                  (match) => match[1],
                ),
              }
            : manualQuestionType === "ordering"
              ? { order: filledOptions.map((option) => option.id) }
              : manualQuestionType === "matching"
                ? { pairs: options }
                : { rubric: manualEssayRubric.trim() };

    setAiGeneratedQuestions((questions) => [
      ...questions,
      {
        type: backendType,
        content: manualQuestionContent.trim(),
        options,
        correctAnswer,
        explanation: manualExplanation.trim() || undefined,
        difficulty: difficultyOptionToValue(manualDifficulty),
        points: 1,
        topicId: manualTopicId || undefined,
        learningObjective: manualLearningObjective.trim() || undefined,
      },
    ]);
    setManualQuestionContent("");
    setManualExplanation("");
    setManualEssayRubric("");
    setManualOptions(createDefaultManualOptions());
    setManualMultipleAnswers(false);
    setManualTrueFalseAnswer("true");
  };

  const applyGeneratedQuestionToManualForm = (question: any) => {
    const type = String(question?.type || "").toUpperCase();
    const nextType =
      type === "TRUE_FALSE"
        ? "true_false"
        : type === "FILL_IN_BLANK"
          ? "fill_blank"
          : type === "MATCHING"
            ? "matching"
            : type === "ORDERING"
              ? "ordering"
              : type === "ESSAY" || type === "SHORT_ANSWER"
                ? "essay"
                : "multiple_choice";

    setManualQuestionType(nextType);
    setManualQuestionContent(String(question?.content || ""));
    setManualExplanation(String(question?.explanation || ""));
    setManualDifficulty(difficultyLabelFromValue(question?.difficulty).toLowerCase());

    if (nextType === "true_false") {
      setManualTrueFalseAnswer(question?.correctAnswer?.answer === false ? "false" : "true");
    } else if (nextType === "essay") {
      setManualEssayRubric(String(question?.correctAnswer?.rubric || question?.explanation || ""));
    } else if (question?.options && typeof question.options === "object") {
      const answer = String(question?.correctAnswer?.answer || "");
      setManualOptions(
        Object.entries(question.options).map(([id, text]) => ({
          id,
          text: String(text || ""),
          isCorrect: answer.split(",").includes(id),
        })),
      );
      setManualMultipleAnswers(answer.includes(","));
    }
  };

  const handleManualAiGenerate = async () => {
    if (!manualAiPrompt.trim()) return;
    setIsManualAiGenerating(true);
    try {
      const result = await api.aiGenerateExamQuestions({
        prompt: manualAiPrompt,
        questionCount: 1,
        difficulty: difficultyOptionToValue(manualDifficulty),
        questionType: mapQuestionTypeToAiApi(
          manualQuestionType === "multiple_choice"
            ? "multiple-choice"
            : manualQuestionType === "true_false"
              ? "true-false"
              : manualQuestionType === "fill_blank"
                ? "fill-blank"
                : manualQuestionType === "essay"
                  ? "short-answer"
                  : manualQuestionType,
        ),
        language: "en",
        courseName: courses.find((course) => course.id === form.course)?.name,
        useCase: "exam",
        context: {
          courseId: form.course,
          courseName: courses.find((course) => course.id === form.course)?.name,
          courseCode: courses.find((course) => course.id === form.course)?.code,
          examTitle: form.title,
          source: "create_exam_manual_ai",
        },
      });
      const generated = Array.isArray(result?.questions) ? result.questions[0] : null;
      if (!generated) throw new Error("AI did not return a question.");
      applyGeneratedQuestionToManualForm(generated);
      toast.success("AI generated a draft question. Review it before adding.");
    } catch (error: any) {
      console.error("Manual AI generation failed:", error);
      toast.error(error.message || "AI generation failed.");
    } finally {
      setIsManualAiGenerating(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canNext = (): boolean => {
    if (step === "info") return form.title.trim() !== "" && form.course !== "";
    if (step === "settings")
      return (
        form.duration !== "" && form.startDate !== "" && form.endDate !== ""
      );
    return true;
  };

  const handleCreate = async () => {
    const startTime = form.startDate
      ? new Date(`${form.startDate}T${form.startTime || "00:00"}`).toISOString()
      : undefined;
    const endTime = form.endDate
      ? new Date(`${form.endDate}T${form.endTime || "23:59"}`).toISOString()
      : undefined;

    try {
      const durationError = getNumericInputError(form.duration, { min: 5, integer: true });
      const passingScoreError = getNumericInputError(form.passingScore, {
        min: 0,
        max: 100,
        integer: true,
      });
      const questionCountError = getNumericInputError(form.questionCount, {
        min: 1,
        integer: true,
      });

        if (randomQuestionCount > 0 && bankSelectionWarning) {
          setNumberErrors((prev) => ({ ...prev, questionCount: bankSelectionWarning }));
          toast.error(bankSelectionWarning);
          return;
        }

      if (composedQuestionCount === 0) {
        toast.error("Please add at least one question from any source.");
        return;
      }

      const nextErrors = {
        duration: durationError || "",
        passingScore: passingScoreError || "",
        questionCount: questionCountError || "",
      };
      setNumberErrors(nextErrors);

      const firstError = Object.values(nextErrors).find(Boolean);
      if (firstError) {
        toast.error(firstError);
        return;
      }

      const parsedReviewSettings = reviewSettingsDraft.enabled
        ? buildReviewSettingsPayload(reviewSettingsDraft)
        : null;
      const effectiveQuestionCount = composedQuestionCount;

      setIsCreating(true);
      let questionIds: string[] | undefined;

      if (aiGeneratedQuestions.length > 0) {
        const createdQuestions = await Promise.all(
          aiGeneratedQuestions.map((q) =>
            api.saveQuestion({
              type: mapQuestionTypeToDb(q.type),
              content: q.content,
              options: q.options || undefined,
              correctAnswer: q.correctAnswer || undefined,
              explanation: q.explanation || undefined,
              difficulty: normalizeDifficultyForQuestion(q.difficulty),
              points: Math.max(1, Number(q.points) || 1),
              defaultPoints: Math.max(1, Number(q.points) || 1),
              courseId: form.course,
              topicId: q.topicId || undefined,
              learningObjective: q.learningObjective || undefined,
            }),
          ),
        );

        questionIds = [
          ...selectedBankQuestionIds,
          ...createdQuestions
          .map((item: any) => item.id)
          .filter(Boolean),
        ];
      } else if (selectedBankQuestionIds.length > 0) {
        questionIds = selectedBankQuestionIds;
      }

      await api.createExam({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        courseId: form.course,
        duration: parseNumericInput(form.duration, { min: 5, integer: true })!,
        passingScore: parseNumericInput(form.passingScore, {
          min: 0,
          max: 100,
          integer: true,
        })!,
        startTime,
        endTime,
        maxAttempts:
          form.maxAttempts.trim() === ""
            ? null
            : parseNumericInput(form.maxAttempts, { min: 1, integer: true }),
        gradingStrategy: form.gradingStrategy,
        reviewSettings: parsedReviewSettings,
        questionSelectionConfig: {
          sourceMethod: "composite",
          selectionMode: "composite",
          sources: {
            manualCount: aiGeneratedQuestions.length,
            selectedBankCount: selectedBankQuestionIds.length,
            randomTopicCount: randomQuestionCount,
          },
          randomizePerStudent: randomQuestionCount > 0,
          shuffleQuestions: form.shuffleQuestions,
          questionType: form.questionType,
          requestedQuestionCount: randomQuestionCount,
          totalComposedQuestionCount: effectiveQuestionCount,
          bankDifficulty: difficultyOptionToBankValue(form.bankDifficulty),
          topicAllocations:
            randomQuestionCount > 0
              ? bankTopics
                  .filter((topic) => topic.selected && Number(topic.requestedCount || 0) > 0)
                  .filter((topic) => topic.topicId)
                  .map((topic) => ({
                    topicId: topic.topicId,
                    topic: topic.topic,
                    count: parseNumericInput(topic.requestedCount, { min: 1, integer: true }) || 0,
                  }))
              : undefined,
        },
        questionIds,
        settings: {
          maxAttempts: parseNumericInput(form.maxAttempts, {
            min: 1,
            integer: true,
          }) || 1,
          requiresProctoring: form.requiresProctoring,
          allowLateSubmission: form.allowLateSubmission,
          shuffleQuestions: form.shuffleQuestions,
          showResultImmediately: form.showResultImmediately,
          sourceMethod: randomQuestionCount > 0 ? "bank" : "composite",
          selectionMode: "composite",
          randomizePerStudent: randomQuestionCount > 0,
          questionType: form.questionType,
          bankDifficulty: difficultyOptionToBankValue(form.bankDifficulty),
          requestedQuestionCount: randomQuestionCount,
          totalComposedQuestionCount: effectiveQuestionCount,
          randomRequestedQuestionCount: randomQuestionCount,
          topicAllocations:
            randomQuestionCount > 0
              ? bankTopics
                  .filter((topic) => topic.selected && Number(topic.requestedCount || 0) > 0)
                  .filter((topic) => topic.topicId)
                  .map((topic) => ({
                    topicId: topic.topicId,
                    topic: topic.topic,
                    count: parseNumericInput(topic.requestedCount, { min: 1, integer: true }) || 0,
                  }))
              : undefined,
          aiGenerationMode: form.aiGenerationMode,
          aiPrompt: form.aiPrompt || undefined,
          aiDifficulty: difficultyOptionToValue(form.aiDifficulty),
          aiReviewRequired: form.aiReviewRequired,
        },
      });

      setCreated(true);
    } catch (error: any) {
      console.error("Failed to create exam:", error);
      toast.error(error.message || "Failed to create exam");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!form.aiPrompt.trim()) return;
    const questionCountError = getNumericInputError(form.questionCount, {
      min: 1,
      integer: true,
    });
    if (questionCountError) {
      setNumberErrors((prev) => ({ ...prev, questionCount: questionCountError }));
      toast.error(questionCountError);
      return;
    }

    setIsAiGenerating(true);
    try {
      const result = await api.aiGenerateExamQuestions({
        prompt: form.aiPrompt,
        questionCount:
          parseNumericInput(form.questionCount, {
            min: 1,
            integer: true,
          }) || 20,
        difficulty: difficultyOptionToValue(form.aiDifficulty),
        questionType: mapQuestionTypeToAiApi(form.questionType),
        language: "en",
        courseName: courses.find((course) => course.id === form.course)?.name,
        useCase: "exam",
        context: {
          courseId: form.course,
          courseName: courses.find((course) => course.id === form.course)?.name,
          courseCode: courses.find((course) => course.id === form.course)?.code,
          examTitle: form.title,
          source: "create_exam_bank_ai",
        },
      });
      setAiGeneratedQuestions(result.questions);
      toast.success(
        `Successfully generated ${result.questions.length} questions! Review them in the preview step.`,
      );
    } catch (error: any) {
      console.error("AI generation failed:", error);
      toast.error(
        "AI generation failed: " + (error.message || "Unknown error"),
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleImportExtract = async () => {
    if (!docFile) {
      toast.error("Please choose a document first.");
      return;
    }

    const fileName = docFile.name.toLowerCase();
    const isTextLike = /\.(txt|md|csv|json)$/i.test(fileName);
    const isDocx = /\.docx$/i.test(fileName);
    const isDoc = /\.doc$/i.test(fileName);

    try {
      setIsStandardizing(true);

      let rawText = "";

      if (isTextLike) {
        rawText = await docFile.text();
      } else if (isDocx) {
        const mammoth = await import("mammoth/mammoth.browser");
        const arrayBuffer = await docFile.arrayBuffer();
        const extracted = await mammoth.extractRawText({ arrayBuffer });
        rawText = extracted.value || "";
      } else if (isDoc) {
        throw new Error(
          "Legacy .doc is not supported yet. Please save as .docx and try again.",
        );
      } else {
        throw new Error(
          "Unsupported file type. Please use .txt, .md, .csv, .json, or .docx.",
        );
      }

      const normalized = rawText.replace(/\s+/g, " ").trim();

      if (!normalized) {
        throw new Error("The selected file is empty.");
      }

      const prompt = [
        `Extract key concepts from the following course material and generate exam questions.`,
        `Document: ${docFile.name}`,
        `Material:`,
        normalized.slice(0, 8000),
      ].join("\n\n");

      const result = await api.aiGenerateExamQuestions({
        prompt,
        questionCount:
          parseNumericInput(form.questionCount, {
            min: 1,
            integer: true,
          }) || 20,
        difficulty: difficultyOptionToValue(form.aiDifficulty),
        questionType: mapQuestionTypeToAiApi(form.questionType),
        language: "en",
        courseName: courses.find((course) => course.id === form.course)?.name,
        useCase: "exam",
        context: {
          courseId: form.course,
          courseName: courses.find((course) => course.id === form.course)?.name,
          courseCode: courses.find((course) => course.id === form.course)?.code,
          examTitle: form.title,
          source: "create_exam_doc_ai",
        },
      });

      setAiGeneratedQuestions(result.questions || []);
      toast.success(
        `Extracted and generated ${result.questions?.length || 0} questions from document.`,
      );
    } catch (error: any) {
      console.error("Import extraction failed:", error);
      toast.error("AI extract failed: " + (error.message || "Unknown error"));
    } finally {
      setIsStandardizing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Success screen ──────────────────────────────────────────────
  if (created) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">Exam Created!</h2>
            <p className="text-muted-foreground">
              <strong>"{form.title}"</strong> has been saved and is ready to be
              configured.
            </p>
          </div>
          <div className="flex gap-3">
            <BackToDashboardButton
              to="/lecturer"
              variant="outline"
              size="default"
            />
            <Button onClick={() => router.push("/lecturer/exams")}>
              <Plus className="h-4 w-4 mr-2" /> Add Questions
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        className={`mx-auto space-y-6 px-3 sm:px-0 transition-[max-width] duration-300 ${
          step === "questions" ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Create New Exam</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set up a new exam in 4 steps
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = s.key === step;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : done
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <Card>
          {step === "info" && (
            <>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the exam title, course, and a brief description.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    Exam Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Midterm Exam – Database Systems"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="course">
                    Course <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.course}
                    onValueChange={(v) => set("course", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a course…" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Briefly describe the scope and objectives of this exam…"
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === "settings" && (
            <>
              <CardHeader>
                <CardTitle>Exam Settings</CardTitle>
                <CardDescription>
                  Configure timing, scoring, and access control.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={form.duration}
                      onChange={(e) =>
                        set(
                          "duration",
                          sanitizeNumericInput(e.target.value, { min: 5 }),
                        )
                      }
                      min={5}
                      onBlur={(e) =>
                        setNumberErrors((prev) => ({
                          ...prev,
                          duration:
                            getNumericInputError(e.target.value, {
                              min: 5,
                              integer: true,
                            }) || "",
                        }))
                      }
                      className="mt-1"
                    />
                    {numberErrors.duration ? (
                      <p className="mt-1 text-xs text-destructive">
                        {numberErrors.duration}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      value={form.passingScore}
                      onChange={(e) =>
                        set(
                          "passingScore",
                          sanitizeNumericInput(e.target.value, {
                            min: 0,
                            max: 100,
                          }),
                        )
                      }
                      min={0}
                      max={100}
                      onBlur={(e) =>
                        setNumberErrors((prev) => ({
                          ...prev,
                          passingScore:
                            getNumericInputError(e.target.value, {
                              min: 0,
                              max: 100,
                              integer: true,
                            }) || "",
                        }))
                      }
                      className="mt-1"
                    />
                    {numberErrors.passingScore ? (
                      <p className="mt-1 text-xs text-destructive">
                        {numberErrors.passingScore}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label>Max Attempts</Label>
                    <Select
                      value={form.maxAttempts}
                      onValueChange={(v) => set("maxAttempts", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAX_ATTEMPT_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a value from 1 to 10. Choosing 1 locks late submission.
                    </p>
                  </div>
                  <div>
                    <Label>Grading Strategy</Label>
                    <Select
                      value={form.gradingStrategy}
                      onValueChange={(v) =>
                        set("gradingStrategy", v as ExamForm["gradingStrategy"])
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGHEST">Highest</SelectItem>
                        <SelectItem value="AVERAGE">Average</SelectItem>
                        <SelectItem value="FIRST_ATTEMPT">First Attempt</SelectItem>
                        <SelectItem value="LAST_ATTEMPT">Last Attempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Exam Window</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => set("startTime", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => set("endTime", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Options</p>
                <div className="space-y-4">
                  {(
                    [
                      {
                        key: "requiresProctoring",
                        label: "Enable AI Proctoring",
                        desc: "Monitor student activity during the exam",
                        icon: <Shield className="h-4 w-4 text-primary" />,
                      },
                      {
                        key: "allowLateSubmission",
                        label: "Allow Late Submission",
                        desc: "Students can submit after the end time",
                        icon: <FileCheck className="h-4 w-4 text-primary" />,
                      },
                      {
                        key: "shuffleQuestions",
                        label: "Shuffle Questions",
                        desc: "Randomize question order for each student",
                        icon: <Users className="h-4 w-4 text-primary" />,
                      },
                      {
                        key: "showResultImmediately",
                        label: "Show Results Immediately",
                        desc: "Students see scores right after submission",
                        icon: <Eye className="h-4 w-4 text-primary" />,
                      },
                    ] as const
                  ).map(({ key, label, desc, icon }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {desc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={form[key] as boolean}
                        onCheckedChange={(v) => set(key, v)}
                        disabled={key === "allowLateSubmission" && isSingleAttempt}
                      />
                    </div>
                  ))}
                </div>
                {isSingleAttempt ? (
                  <p className="text-xs text-muted-foreground">
                    Late submission is locked because max attempts is set to 1.
                  </p>
                ) : null}

                <Separator />
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Label className="text-base font-semibold">
                        Review / Feedback Settings
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Phase-based review controls are saved into the existing JSON field, so older review data stays intact.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Enable review config</p>
                        <p className="text-xs text-muted-foreground">
                          Save phase-based review rules for this exam.
                        </p>
                      </div>
                      <Switch
                        checked={reviewSettingsDraft.enabled}
                        onCheckedChange={(checked) =>
                          setReviewSettingsDraft((draft) => ({
                            ...draft,
                            enabled: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {REVIEW_PHASE_META.map((phase) => {
                      const config = reviewSettingsDraft.phases[phase.key];
                      const isActive = reviewSettingsDraft.enabled;

                      return (
                        <Card
                          key={phase.key}
                          className={!isActive ? "border-dashed bg-muted/30" : ""}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-base">{phase.title}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {phase.description}
                                </CardDescription>
                              </div>
                              <Badge variant={isActive ? "default" : "secondary"}>
                                {reviewPhaseSummary(config)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {([
                              {
                                key: "showScore",
                                label: "Show score",
                                desc: "Reveal numeric score to students.",
                              },
                              {
                                key: "showAnswers",
                                label: "Show answers",
                                desc: "Reveal the correct answers or key responses.",
                              },
                              {
                                key: "showFeedback",
                                label: "Show feedback",
                                desc: "Display lecturer feedback and explanations.",
                              },
                            ] as const).map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.desc}
                                  </p>
                                </div>
                                <Switch
                                  checked={Boolean(config[item.key])}
                                  disabled={!isActive}
                                  onCheckedChange={(checked) =>
                                    setReviewSettingsDraft((draft) => ({
                                      ...draft,
                                      phases: {
                                        ...draft.phases,
                                        [phase.key]: {
                                          ...draft.phases[phase.key],
                                          [item.key]: checked,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                </div>
              </CardContent>
            </>
          )}

          {step === "questions" && (
            <>
              <CardHeader>
                <CardTitle>Question Sourcing</CardTitle>
                <CardDescription>
                  Combine questions from any source. Switching tabs keeps everything already added.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!questionSourceMode ? (
                  <button
                    type="button"
                    onClick={() => setQuestionSourceMode("choose")}
                    className="group flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.03] transition hover:border-primary hover:bg-primary/[0.07]"
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:scale-105">
                      <Plus className="h-10 w-10" />
                    </span>
                    <span className="text-lg font-semibold">Add question source</span>
                    <span className="max-w-md text-sm text-muted-foreground">
                      Enter questions, select exact bank questions, or randomize from topic pools.
                    </span>
                  </button>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-1 rounded-xl bg-muted p-1 md:grid-cols-3">
                      {([
                        ["manual", "Enter directly", "Write fixed questions for this exam.", FileText],
                        ["bank-select", "Select from bank", "Choose topic, filter, then tick exact questions.", Database],
                        ["bank-random", "Random by topic", "Set topic quotas for randomized student instances.", Sparkles],
                      ] as const).map(([key, title, description, Icon]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setQuestionSourceMode(key);
                            set("sourceMethod", key === "manual" ? "import" : "bank");
                          }}
                          className={`rounded-lg px-4 py-3 text-left transition ${
                            questionSourceMode === key
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <Icon className="h-4 w-4" />
                            {title}
                            {key === "manual" && aiGeneratedQuestions.length > 0 && <Badge>{aiGeneratedQuestions.length}</Badge>}
                            {key === "bank-select" && selectedBankQuestionIds.length > 0 && <Badge>{selectedBankQuestionIds.length}</Badge>}
                            {key === "bank-random" && randomQuestionCount > 0 && <Badge>{randomQuestionCount}</Badge>}
                          </span>
                          <span className="mt-1 block text-xs">{description}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Exam total</p>
                        <p className="text-2xl font-bold">{composedQuestionCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Entered directly</p>
                        <p className="text-lg font-semibold">{aiGeneratedQuestions.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Selected from bank</p>
                        <p className="text-lg font-semibold">{selectedBankQuestionIds.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Random by topic</p>
                        <p className="text-lg font-semibold">{randomQuestionCount}</p>
                      </div>
                    </div>

                    {questionSourceMode === "manual" && (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base text-primary">AI Assistant</CardTitle>
                              </div>
                              <CardDescription>Generate a draft, then review and edit before adding it to the exam.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  value={manualAiPrompt}
                                  onChange={(event) => setManualAiPrompt(event.target.value)}
                                  placeholder="e.g. Database indexing, transaction isolation..."
                                  className="bg-background"
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") handleManualAiGenerate();
                                  }}
                                />
                                <Button
                                  type="button"
                                  onClick={handleManualAiGenerate}
                                  disabled={isManualAiGenerating || !manualAiPrompt.trim() || !form.course}
                                  className="gap-2"
                                >
                                  {isManualAiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                  Generate
                                </Button>
                              </div>
                              {!form.course && (
                                <p className="text-xs text-amber-600">Select a course in Basic Info to enable AI generation.</p>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Question Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Select
                                value={manualQuestionType}
                                onValueChange={(value) => {
                                  setManualQuestionType(value);
                                  setManualOptions(createDefaultManualOptions());
                                }}
                              >
                                <SelectTrigger className="w-full sm:w-[280px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                  <SelectItem value="true_false">True / False</SelectItem>
                                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                  <SelectItem value="matching">Matching</SelectItem>
                                  <SelectItem value="ordering">Ordering / Sequencing</SelectItem>
                                  <SelectItem value="essay">Short Answer / Essay</SelectItem>
                                </SelectContent>
                              </Select>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Question Content</CardTitle>
                              <CardDescription>Enter the text shown to students.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {manualQuestionType === "fill_blank" && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                                  Mark answers with double brackets, for example: The capital of France is [[Paris]].
                                </div>
                              )}
                              <Textarea
                                className="min-h-32 text-base"
                                value={manualQuestionContent}
                                onChange={(event) => setManualQuestionContent(event.target.value)}
                                placeholder="Enter your question here..."
                              />
                            </CardContent>
                          </Card>

                          {manualQuestionType !== "fill_blank" && (
                            <Card>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-3">
                                  <CardTitle className="text-base">
                                    {manualQuestionType === "multiple_choice" && "Answer Options"}
                                    {manualQuestionType === "true_false" && "Correct Answer"}
                                    {manualQuestionType === "matching" && "Matching Pairs"}
                                    {manualQuestionType === "ordering" && "Sequence Items"}
                                    {manualQuestionType === "essay" && "Grading Rubric"}
                                  </CardTitle>
                                  {["multiple_choice", "matching", "ordering"].includes(manualQuestionType) && manualOptions.length < 8 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setManualOptions((options) => [
                                          ...options,
                                          {
                                            id: String.fromCharCode(65 + options.length),
                                            text: "",
                                            isCorrect: false,
                                          },
                                        ])
                                      }
                                    >
                                      <Plus className="mr-1 h-4 w-4" /> Add
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {manualQuestionType === "multiple_choice" && (
                                  <div className="flex items-center gap-3">
                                    <Label>Allow multiple correct answers</Label>
                                    <Switch checked={manualMultipleAnswers} onCheckedChange={setManualMultipleAnswers} />
                                  </div>
                                )}

                                {["multiple_choice", "matching", "ordering"].includes(manualQuestionType) &&
                                  manualOptions.map((option, index) => (
                                    <div key={option.id} className="flex items-center gap-3">
                                      {manualQuestionType === "multiple_choice" ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setManualOptions((options) =>
                                              options.map((item) => ({
                                                ...item,
                                                isCorrect: manualMultipleAnswers
                                                  ? item.id === option.id
                                                    ? !item.isCorrect
                                                    : item.isCorrect
                                                  : item.id === option.id,
                                              })),
                                            )
                                          }
                                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium ${
                                            option.isCorrect ? "border-green-500 bg-green-100 text-green-700" : "border-border"
                                          }`}
                                        >
                                          {option.id}
                                        </button>
                                      ) : (
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                          {index + 1}
                                        </span>
                                      )}
                                      <Input
                                        value={option.text}
                                        placeholder={manualQuestionType === "matching" ? "Concept" : `Item ${option.id}`}
                                        onChange={(event) =>
                                          setManualOptions((options) =>
                                            options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item),
                                          )
                                        }
                                      />
                                      {manualQuestionType === "matching" && (
                                        <Input
                                          value={option.match || ""}
                                          placeholder="Matching value"
                                          onChange={(event) =>
                                            setManualOptions((options) =>
                                              options.map((item) => item.id === option.id ? { ...item, match: event.target.value } : item),
                                            )
                                          }
                                        />
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={manualOptions.length <= 2}
                                        onClick={() => setManualOptions((options) => options.filter((item) => item.id !== option.id))}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}

                                {manualQuestionType === "true_false" && (
                                  <div className="grid grid-cols-2 gap-3">
                                    {(["true", "false"] as const).map((value) => (
                                      <Button
                                        key={value}
                                        type="button"
                                        variant={manualTrueFalseAnswer === value ? "default" : "outline"}
                                        onClick={() => setManualTrueFalseAnswer(value)}
                                      >
                                        {value === "true" ? "True" : "False"}
                                      </Button>
                                    ))}
                                  </div>
                                )}

                                {manualQuestionType === "essay" && (
                                  <Textarea
                                    value={manualEssayRubric}
                                    onChange={(event) => setManualEssayRubric(event.target.value)}
                                    placeholder="Describe grading criteria and expected key points..."
                                  />
                                )}
                              </CardContent>
                            </Card>
                          )}

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Explanation (optional)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Textarea
                                value={manualExplanation}
                                onChange={(event) => setManualExplanation(event.target.value)}
                                placeholder="Explain why the answer is correct..."
                              />
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_1fr_auto]">
                          <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm">Course</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-sm font-medium">
                                {courses.find((course) => course.id === form.course)?.name || "Select a course in Basic Info"}
                              </p>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Topic</Label>
                                <Select value={manualTopicId || "__none__"} onValueChange={(value) => setManualTopicId(value === "__none__" ? "" : value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Untagged</SelectItem>
                                    {bankTopics.filter((topic) => topic.topicId).map((topic) => (
                                      <SelectItem key={topic.topicId} value={topic.topicId}>
                                        {topic.topic}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Learning Objective</Label>
                                <Input
                                  value={manualLearningObjective}
                                  onChange={(event) => setManualLearningObjective(event.target.value)}
                                  placeholder="e.g. Apply Dijkstra's algorithm"
                                />
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm">Difficulty</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-3 gap-2">
                              {(["easy", "medium", "hard"] as const).map((difficulty) => (
                                <Button
                                  key={difficulty}
                                  type="button"
                                  variant={manualDifficulty === difficulty ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setManualDifficulty(difficulty)}
                                  className="capitalize"
                                >
                                  {difficulty}
                                </Button>
                              ))}
                            </CardContent>
                          </Card>
                          <Button type="button" className="h-full min-h-20 px-8" onClick={addManualQuestion}>
                            <Plus className="mr-2 h-4 w-4" /> Add to exam
                          </Button>
                        </div>

                        {aiGeneratedQuestions.length > 0 && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Questions added ({aiGeneratedQuestions.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {aiGeneratedQuestions.map((question, index) => (
                                <div key={`${question.content}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                                  <div>
                                    <p className="text-sm font-medium">Q{index + 1}. {question.content}</p>
                                    <p className="text-xs text-muted-foreground">{question.type}</p>
                                  </div>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setAiGeneratedQuestions((questions) => questions.filter((_, itemIndex) => itemIndex !== index))}>
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {questionSourceMode === "bank-select" && (
                      <div className="space-y-4 rounded-xl border p-5">
                        <div>
                          <Label>Select topic first</Label>
                          <Select value={selectedBankTopicId} onValueChange={setSelectedBankTopicId}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a topic" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All course questions</SelectItem>
                              {bankTopics.filter((topic) => topic.topicId).map((topic) => (
                                <SelectItem key={topic.topicId} value={topic.topicId}>{topic.topic} ({topic.count})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedBankTopicId && (
                          <>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label>Question type</Label>
                                <Select value={form.questionType} onValueChange={(value) => set("questionType", value)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {QUESTION_TYPE_OPTIONS.filter((type) => type.value !== "custom").map((type) => (
                                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Difficulty</Label>
                                <Select value={form.bankDifficulty} onValueChange={(value) => set("bankDifficulty", value)}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mixed">Mixed (all levels)</SelectItem>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                              {isLoadingBankQuestions ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Loading questions...</p>
                              ) : filteredBankQuestions.map((question) => {
                                const checked = selectedBankQuestionIds.includes(question.id);
                                return (
                                  <label key={question.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${checked ? "border-primary bg-primary/5" : ""}`}>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => setSelectedBankQuestionIds((ids) => value ? [...new Set([...ids, question.id])] : ids.filter((id) => id !== question.id))}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium">{question.content}</p>
                                      <div className="mt-2 flex gap-2">
                                        <Badge variant="outline">{question.type}</Badge>
                                        <Badge variant="outline">{difficultyLabelFromValue(question.difficulty)}</Badge>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-sm font-medium">{selectedBankQuestionIds.length} questions selected</p>
                          </>
                        )}
                      </div>
                    )}

                    {questionSourceMode === "bank-random" && (
                      <div className="space-y-4 rounded-xl border p-5">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                          Topic quotas are saved as the randomization policy for student exam instances.
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Question type</Label>
                            <Select value={form.questionType} onValueChange={(value) => set("questionType", value)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>{QUESTION_TYPE_OPTIONS.filter((type) => type.value !== "custom").map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Difficulty</Label>
                            <Select value={form.bankDifficulty} onValueChange={(value) => set("bankDifficulty", value)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="mixed">Mixed (all levels)</SelectItem><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-sm font-medium">
                          Random pool contribution: {randomQuestionCount} questions
                        </p>
                        <div className="space-y-2">
                          {bankTopics.map((topic) => (
                            <label key={topic.topicId || topic.topic} className={`flex items-center gap-3 rounded-lg border p-3 ${topic.selected ? "border-primary bg-primary/5" : ""}`}>
                              <Checkbox checked={topic.selected} onCheckedChange={(value) => setBankTopics((topics) => topics.map((item) => item.topicId === topic.topicId ? { ...item, selected: Boolean(value), requestedCount: value ? (item.requestedCount === "0" ? "1" : item.requestedCount) : "0" } : item))} />
                              <div className="flex-1"><p className="text-sm font-medium">{topic.topic}</p><p className="text-xs text-muted-foreground">{topic.count} available</p></div>
                              <Input className="w-24" type="number" min={0} value={topic.requestedCount} onChange={(event) => setBankTopics((topics) => topics.map((item) => item.topicId === topic.topicId ? { ...item, requestedCount: sanitizeNumericInput(event.target.value, { min: 0 }), selected: Number(event.target.value || 0) > 0 } : item))} />
                            </label>
                          ))}
                        </div>
                        {bankSelectionWarning && <p className="text-xs font-medium text-amber-600">{bankSelectionWarning}</p>}
                      </div>
                    )}
                  </div>
                )}

                <Tabs
                  value={form.sourceMethod}
                  onValueChange={(v) => set("sourceMethod", v as any)}
                  className="hidden"
                >
                  <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                    <TabsTrigger value="bank" className="gap-2">
                      <Database className="h-4 w-4" /> Bank
                    </TabsTrigger>
                    <TabsTrigger value="import" className="gap-2">
                      <Upload className="h-4 w-4" /> Import
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2">
                      <Sparkles className="h-4 w-4" /> AI Gen
                    </TabsTrigger>
                  </TabsList>

                  {/* --- TAB: QUESTION BANK --- */}
                  <TabsContent
                    value="bank"
                    className="space-y-5 animate-in fade-in duration-300"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Number of Questions</Label>
                        <Input
                          type="number"
                          value={form.questionCount}
                          onChange={(e) =>
                            set(
                              "questionCount",
                              sanitizeNumericInput(e.target.value, { min: 1 }),
                            )
                          }
                          min={1}
                          onBlur={(e) =>
                            setNumberErrors((prev) => ({
                              ...prev,
                              questionCount:
                                getNumericInputError(e.target.value, {
                                  min: 1,
                                  integer: true,
                                }) || "",
                            }))
                          }
                          className="mt-1"
                        />
                        {numberErrors.questionCount ? (
                          <p className="mt-1 text-xs text-destructive">
                            {numberErrors.questionCount}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <Label>Question Type Mix</Label>
                        <Select
                          value={form.questionType}
                          onValueChange={(v) => set("questionType", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select
                          value={form.bankDifficulty}
                          onValueChange={(v) => set("bankDifficulty", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mixed">
                              Mixed (all levels)
                            </SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {form.questionType === "custom" && (
                      <div className="p-4 border rounded-lg bg-secondary/10 space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Select Types to Include
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            "Single Choice",
                            "Multiple Choice",
                            "True / False",
                            "Fill in the Blank",
                            "Matching",
                            "Ordering",
                            "Essay",
                          ].map((t) => (
                            <label
                              key={t}
                              className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-card cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                defaultChecked
                                className="accent-primary"
                              />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm font-medium text-muted-foreground pt-2">
                      Topics to include
                    </p>
                    {!form.course && (
                      <p className="text-sm text-muted-foreground">
                        Select a course to load available topics.
                      </p>
                    )}

                    {form.course && isLoadingBankTopics && (
                      <p className="text-sm text-muted-foreground">
                        Loading topics...
                      </p>
                    )}

                    {form.course &&
                      !isLoadingBankTopics &&
                      bankTopics.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No topics found for this course yet.
                        </p>
                      )}

                    {bankTopics.length > 0 && (
                      <div className="space-y-2">
                        {bankTopics.map((bank) => (
                          <label
                            key={bank.topicId}
                            className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all
                          ${bank.selected ? "border-primary bg-primary/5" : "border-border"}`}
                          >
                            <input
                              type="checkbox"
                              checked={bank.selected}
                              onChange={() =>
                                setBankTopics((prev) =>
                                  prev.map((item) =>
                                    item.topicId === bank.topicId
                                      ? {
                                          ...item,
                                          selected: !item.selected,
                                          requestedCount: !item.selected
                                            ? item.requestedCount === "0"
                                              ? "1"
                                              : item.requestedCount
                                            : "0",
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="accent-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{bank.topic}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {bank.count} available total
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col items-end gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={bank.requestedCount}
                                  onChange={(e) =>
                                    setBankTopics((prev) =>
                                      prev.map((item) =>
                                        item.topicId === bank.topicId
                                          ? {
                                              ...item,
                                              requestedCount: sanitizeNumericInput(e.target.value, { min: 0 }),
                                              selected: Number(e.target.value || 0) > 0 || item.selected,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                  className="w-20 h-9 text-sm text-right"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {form.questionType === "mixed" || form.questionType === "custom"
                                    ? `${bank.count} available`
                                    : `${Number(bank.availableByType?.[mapQuestionTypeToDb(form.questionType)] || 0)} available for this type`}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {bankSelectionWarning && (
                      <p className="text-xs text-amber-600 font-medium">
                        {bankSelectionWarning}
                      </p>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => router.push("/lecturer/question-bank")}
                    >
                      <Plus className="h-4 w-4" /> Go to Question Bank
                    </Button>
                  </TabsContent>

                  {/* --- TAB: IMPORT DOC --- */}
                  <TabsContent
                    value="import"
                    className="space-y-5 animate-in fade-in duration-300"
                  >
                    <input
                      ref={docFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        setDocFile(selected);
                      }}
                    />
                    <div className="p-8 border-2 border-dashed rounded-xl bg-secondary/5 flex flex-col items-center justify-center text-center space-y-4">
                      {!docFile ? (
                        <>
                          <div className="p-4 rounded-full bg-blue-100 text-blue-600">
                            <Upload className="h-10 w-10" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">
                              Upload your document
                            </p>
                            <p className="text-sm text-muted-foreground max-w-xs">
                              AI will extract questions from your Word, PDF, or
                              Plain Text files.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="bg-background cursor-pointer"
                            onClick={() => docFileInputRef.current?.click()}
                          >
                            <FileSearch className="h-4 w-4 mr-2" /> Browse Files
                          </Button>
                        </>
                      ) : (
                        <div className="w-full space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/50 border-blue-200 w-full">
                            <div className="flex items-center gap-4 text-left">
                              <div className="h-12 w-12 rounded bg-blue-600 flex items-center justify-center text-white">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-bold text-base text-blue-700">
                                  {docFile.name}
                                </p>
                                <p className="text-xs text-blue-600 opacity-80">
                                  Selected file • {formatFileSize(docFile.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDocFile(null);
                                if (docFileInputRef.current)
                                  docFileInputRef.current.value = "";
                              }}
                            >
                              <Plus className="h-5 w-5 rotate-45" />
                            </Button>
                          </div>
                          <Button
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 py-6 text-base"
                            onClick={handleImportExtract}
                            disabled={isStandardizing}
                          >
                            {isStandardizing ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Wand2 className="h-5 w-5" />
                            )}
                            Start AI Extraction
                          </Button>
                        </div>
                      )}
                    </div>

                    {isStandardizing && (
                      <div className="space-y-2 p-4 border rounded-lg bg-blue-50/30 animate-in slide-in-from-top-4">
                        <div className="flex justify-between text-[11px] text-blue-700 font-bold uppercase tracking-wider">
                          <span>AI Agent: Extracting and generating...</span>
                          <span>Processing</span>
                        </div>
                        <Progress value={65} className="h-2 bg-blue-100" />
                      </div>
                    )}

                    {aiGeneratedQuestions.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800 mb-2">
                          ✓ {aiGeneratedQuestions.length} questions extracted
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {aiGeneratedQuestions.map((q, i) => (
                            <div
                              key={i}
                              className="text-xs bg-white p-2 rounded border"
                            >
                              <span className="font-medium text-muted-foreground">
                                Q{i + 1}.
                              </span>{" "}
                              <span className="line-clamp-2">{q.content}</span>
                              <div className="flex gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4"
                                >
                                  {q.type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4"
                                >
                                  Difficulty:{" "}
                                  {difficultyLabelFromValue(q.difficulty)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* --- TAB: AI GENERATION --- */}
                  <TabsContent
                    value="ai"
                    className="space-y-5 animate-in fade-in duration-300"
                  >
                    <div className="p-6 border-2 border-primary/20 rounded-xl bg-primary/5 space-y-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="ai-prompt"
                          className="text-base font-bold"
                        >
                          What is the focus of this exam?
                        </Label>
                        <Textarea
                          id="ai-prompt"
                          placeholder="Example: Midterm for Computer Networks. Focus on OSI layers, TCP/UDP differences, and subnetting."
                          value={form.aiPrompt}
                          onChange={(e) => set("aiPrompt", e.target.value)}
                          rows={4}
                          className="bg-background text-base"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Question Count</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.questionCount}
                            onChange={(e) =>
                              set(
                                "questionCount",
                                sanitizeNumericInput(e.target.value, { min: 1 }),
                              )
                            }
                            onBlur={(e) =>
                              setNumberErrors((prev) => ({
                                ...prev,
                                questionCount:
                                  getNumericInputError(e.target.value, {
                                    min: 1,
                                    integer: true,
                                  }) || "",
                              }))
                            }
                          />
                          {numberErrors.questionCount ? (
                            <p className="mt-1 text-xs text-destructive">
                              {numberErrors.questionCount}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>Question Type Mix</Label>
                          <Select
                            value={form.questionType}
                            onValueChange={(v) => set("questionType", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPE_OPTIONS.filter(
                                (type) => type.value !== "custom",
                              ).map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Difficulty</Label>
                          <Select
                            value={form.aiDifficulty}
                            onValueChange={(v) => set("aiDifficulty", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-amber-900">
                            Mandatory Teacher Review
                          </p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Questions generated by AI will be placed in a
                            pending state until you approve each one for
                            accuracy and integrity.
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full py-6 text-base gap-2 shadow-lg shadow-primary/20"
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !form.aiPrompt.trim()}
                      >
                        {isAiGenerating ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />{" "}
                            Generating Questions...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5" /> Generate Complete
                            Exam
                          </>
                        )}
                      </Button>

                      {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">
                            ✓ {aiGeneratedQuestions.length} questions generated
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {aiGeneratedQuestions.map((q, i) => (
                              <div
                                key={i}
                                className="text-xs bg-white p-2 rounded border"
                              >
                                <span className="font-medium text-muted-foreground">
                                  Q{i + 1}.
                                </span>{" "}
                                <span className="line-clamp-2">
                                  {q.content}
                                </span>
                                <div className="flex gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4"
                                  >
                                    {q.type}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4"
                                  >
                                    Difficulty:{" "}
                                    {difficultyLabelFromValue(q.difficulty)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}

          {step === "preview" && (
            <>
              <CardHeader>
                <CardTitle>Exam Preview</CardTitle>
                <CardDescription>
                  Review all settings before creating the exam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { label: "Title", value: form.title || "—" },
                  {
                    label: "Course",
                    value: courses.find((course) => course.id === form.course)
                      ?.code
                      ? `${courses.find((course) => course.id === form.course)?.code} - ${courses.find((course) => course.id === form.course)?.name}`
                      : "—",
                  },
                  { label: "Description", value: form.description || "—" },
                  { label: "Duration", value: `${form.duration} minutes` },
                  {
                    label: "Max Attempts (1-10)",
                    value: form.maxAttempts || "1",
                  },
                  {
                    label: "Grading Strategy",
                    value: form.gradingStrategy,
                  },
                  { label: "Passing Score", value: `${form.passingScore}%` },
                  {
                    label: "Exam Window",
                    value: `${form.startDate} ${form.startTime} → ${form.endDate} ${form.endTime}`,
                  },
                  {
                    label: "Questions",
                    value: `${composedQuestionCount} total (${aiGeneratedQuestions.length} direct + ${selectedBankQuestionIds.length} selected + ${randomQuestionCount} random)`,
                  },
                  {
                    label: "AI Proctoring",
                    value: form.requiresProctoring ? "Enabled" : "Disabled",
                  },
                  {
                    label: "Late Submission",
                    value: isSingleAttempt
                      ? "Locked when Max Attempts = 1"
                      : form.allowLateSubmission
                        ? "Allowed"
                        : "Blocked",
                  },
                  {
                    label: "Shuffle",
                    value: form.shuffleQuestions ? "Yes" : "No",
                  },
                  {
                    label: "Review Settings",
                    value: reviewSettingsDraft.enabled ? "Phase-based" : "Default",
                  },
                  {
                    label: "Show Results",
                    value: form.showResultImmediately
                      ? "Immediately"
                      : "After review",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-muted-foreground w-36 shrink-0">
                      {label}
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between pb-8">
          <Button
            variant="outline"
            onClick={() => {
              if (stepIdx === 0) router.push("/lecturer/exams");
              else setStep(STEPS[stepIdx - 1].key);
            }}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {stepIdx === 0 ? "Cancel" : "Back"}
          </Button>

          {step !== "preview" ? (
            <Button
              onClick={() => setStep(STEPS[stepIdx + 1].key)}
              disabled={!canNext()}
              className="gap-2"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="gap-2"
            >
              {isCreating ? (
                "Creating…"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Create Exam
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}



