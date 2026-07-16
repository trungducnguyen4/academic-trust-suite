"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, unwrapPaginatedData } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Tag,
  GripVertical,
  Image,
  Music,
  Loader2,
  Sparkles,
  Wand2,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { getNumericInputError, sanitizeNumericInput } from "@/lib/number-input";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: string;
  content: string;
  options?: any;
  correctAnswer?: any;
  explanation?: string;
  difficulty: number;
  points: number;
  course?: { id: string; code: string; name: string };
  topic?: { id: string; code: string; name: string } | null;
  learningObjectives?: string;
}

export default function QuestionEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const questionBankPath = `${basePath}/question-bank`;
  const searchParams = useSearchParams();
  const questionId = searchParams.get("id");
  const courseCodeParam = searchParams.get("courseCode");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [courses, setCourses] = useState<
    { id: string; code: string; name: string }[]
  >([]);

  // Question form state
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [multipleAnswers, setMultipleAnswers] = useState(false);
  const [content, setContent] = useState("");
  const [explanation, setExplanation] = useState("");
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState([0.5]);
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "audio">("image");
  const [learningObjective, setLearningObjective] = useState("");

  // Topic management
  const [availableTopics, setAvailableTopics] = useState<
    { id: string; code: string; name: string }[]
  >([]);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSuggestions, setTopicSuggestions] = useState<
    { id: string; code: string; name: string; score: number; reason?: string }[]
  >([]);
  const [checkingTopicSimilarity, setCheckingTopicSimilarity] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSimilarityWarning, setAiSimilarityWarning] = useState("");

  // Multiple choice options
  const [options, setOptions] = useState<Option[]>([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);

  // Track pinned options to prevent shuffling
  const [pinnedOptions, setPinnedOptions] = useState<Set<string>>(new Set());

  // True/False answer
  const [tfAnswer, setTfAnswer] = useState<"true" | "false">("true");

  // Essay rubric
  const [essayRubric, setEssayRubric] = useState("");
  const [essayMaxScore, setEssayMaxScore] = useState("10");
  const [essayMaxScoreError, setEssayMaxScoreError] = useState("");

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Autosave draft
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const insertBlankAtCursor = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const insert = "[[]]";
    const newContent = before + insert + after;
    setContent(newContent);
    // focus and place cursor between the inner brackets
    const cursorPos = start + 2;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };
  const DRAFT_STORAGE_KEY = "question-draft";
  const saveDraft = (state: any) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        ...state,
        savedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error("Failed to save draft:", err);
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        // Only restore if no existing question being edited
        if (!questionId && !question) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
    }
    return null;
  };

  // Load courses from API
  const snapDifficulty = (value: number) => {
    const levels = [0.3, 0.5, 0.7];
    return levels.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
    );
  };

  // Validation by question type
  const validateQuestion = (): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!content.trim()) {
      errors.push("Question text is required");
    }

    if (!course) {
      errors.push("Course is required");
    }

    if (questionType === "multiple_choice") {
      // Check minimum options
      const filledOptions = options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        errors.push("At least 2 answer options are required");
      }
      // Check for correct answer(s)
      const correctOptions = filledOptions.filter(o => o.isCorrect);
      if (correctOptions.length === 0) {
        errors.push("Please select at least one correct answer");
      }
      // If not allowing multiple answers, ensure only one is correct
      if (!multipleAnswers && correctOptions.length > 1) {
        errors.push("Only one answer can be correct when 'Allow Multiple Answers' is disabled");
      }
    }

    if (questionType === "true_false") {
      // True/False is always valid (either True or False is set)
    }

    if (questionType === "essay") {
      if (!essayRubric.trim()) {
        errors.push("Grading rubric is required for essay questions");
      }
    }

    if (questionType === "matching") {
      const filledPairs = options.filter(o => o.text.trim());
      if (filledPairs.length < 2) {
        errors.push("At least 2 matching pairs are required");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = unwrapPaginatedData(await api.getCourses());
        const mapped = data.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
        }));
        setCourses(mapped);
        // Pre-select course from URL param
        if (courseCodeParam && !course) {
          const found = mapped.find((c: any) => c.code === courseCodeParam);
          if (found) setCourse(found.id);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch only topics that belong to the selected course
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        if (!course) {
          setAvailableTopics([]);
          return;
        }

        const response = await api.listQuestionTopics({ courseId: course });
        const topicsData = response?.data || [];
        setAvailableTopics(topicsData);
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setAvailableTopics([]);
      }
    };
    fetchTopics();
  }, [course]);

  // Load question data if editing existing question
  useEffect(() => {
    if (questionId) {
      loadQuestion();
    } else {
      // Try to restore draft if not editing
      const draft = loadDraft();
      if (draft) {
        // Ask user if they want to restore
        const shouldRestore = window.confirm(
          "You have an unsaved draft. Do you want to restore it?"
        );
        if (shouldRestore) {
          // Restore all form state from draft
          if (draft.content) setContent(draft.content);
          if (draft.explanation) setExplanation(draft.explanation);
          if (draft.course) setCourse(draft.course);
          if (draft.topic) setTopic(draft.topic);
          if (draft.difficulty) setDifficulty(draft.difficulty);
          if (draft.questionType) setQuestionType(draft.questionType);
          if (draft.options) setOptions(draft.options);
          if (draft.multipleAnswers !== undefined) setMultipleAnswers(draft.multipleAnswers);
          if (draft.tfAnswer) setTfAnswer(draft.tfAnswer);
          if (draft.essayRubric) setEssayRubric(draft.essayRubric);
          if (draft.essayMaxScore) setEssayMaxScore(draft.essayMaxScore);
          if (draft.learningObjective) setLearningObjective(draft.learningObjective);
          if (draft.hasMedia !== undefined) setHasMedia(draft.hasMedia);
          if (draft.mediaType) setMediaType(draft.mediaType);
        } else {
          // Clear draft if user declines
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    }
  }, [questionId]);

  // Autosave draft on every form change
  useEffect(() => {
    if (!questionId) {
      const timer = setTimeout(() => {
        saveDraft({
          content,
          explanation,
          course,
          topic,
          difficulty,
          questionType,
          options,
          multipleAnswers,
          tfAnswer,
          essayRubric,
          essayMaxScore,
          learningObjective,
          hasMedia,
          mediaType,
        });
      }, 1000); // Save 1 second after last change
      return () => clearTimeout(timer);
    }
  }, [
    content,
    explanation,
    course,
    topic,
    difficulty,
    questionType,
    options,
    multipleAnswers,
    tfAnswer,
    essayRubric,
    essayMaxScore,
    learningObjective,
    hasMedia,
    mediaType,
    questionId,
  ]);

  // Load question data if editing existing question
  useEffect(() => {
    if (questionId) {
      loadQuestion();
    }
  }, [questionId]);

  const loadQuestion = async () => {
    if (!questionId) return;

    try {
      setLoading(true);
      const questionData = await api.getQuestionById(questionId);
      setQuestion(questionData);
      populateForm(questionData);
    } catch (error) {
      console.error("Failed to load question:", error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (questionData: Question) => {
    // Map backend question type to frontend format
    const typeMapping: { [key: string]: string } = {
      MULTIPLE_CHOICE: "multiple_choice",
      MULTI_SELECT: "multiple_choice",
      SINGLE_CHOICE: "multiple_choice",
      TRUE_FALSE: "true_false",
      SHORT_ANSWER: "essay",
      ESSAY: "essay",
      FILL_IN_BLANK: "fill_blank",
      MATCHING: "matching",
      ORDERING: "ordering",
    };

    const frontendType =
      typeMapping[questionData.type] || questionData.type.toLowerCase();
    setQuestionType(frontendType);

    setContent(questionData.content);
    setExplanation(questionData.explanation || "");
    setCourse(questionData.course?.id || "");
    setTopic(questionData.topic?.id || "");
    // Backend stores difficulty as 1..10, editor UI uses 0..1 slider.
    const uiDifficulty =
      typeof questionData.difficulty === "number"
        ? questionData.difficulty > 1
          ? Math.max(0, Math.min(1, questionData.difficulty / 10))
          : Math.max(0, Math.min(1, questionData.difficulty))
        : 0.5;
    setDifficulty([snapDifficulty(uiDifficulty)]);

    // Handle different question types
    if (
      questionData.type === "MULTIPLE_CHOICE" ||
      questionData.type === "MULTI_SELECT" ||
      questionData.type === "SINGLE_CHOICE"
    ) {
      console.log("Question options from backend:", questionData.options);
      console.log(
        "Question correctAnswer from backend:",
        questionData.correctAnswer,
      );

      if (questionData.options) {
        let formattedOptions: {
          id: string;
          text: string;
          isCorrect: boolean;
        }[] = [];

        if (Array.isArray(questionData.options)) {
          // Handle array format: ["Stack", "Queue", "Array", "List"]
          formattedOptions = questionData.options.map(
            (opt: any, index: number) => ({
              id: String.fromCharCode(65 + index),
              text: opt.text || opt,
              isCorrect: false, // Will set correct answers below
            }),
          );
        } else if (typeof questionData.options === "object") {
          // Handle object format: {A: "Stack", B: "Queue", C: "Array", D: "List"}
          formattedOptions = Object.entries(questionData.options).map(
            ([key, value]) => ({
              id: key,
              text: value as string,
              isCorrect: false, // Will set correct answers below
            }),
          );
        }

        // Set correct answers
        if (questionData.correctAnswer) {
          console.log("Processing correctAnswer:", questionData.correctAnswer);

          if (typeof questionData.correctAnswer === "object") {
            if ("answer" in questionData.correctAnswer) {
              // Format: {answer: "B"} - mark that option as correct
              const correctId = questionData.correctAnswer.answer;
              const optionIndex = formattedOptions.findIndex(
                (opt) => opt.id === correctId,
              );
              if (optionIndex !== -1) {
                formattedOptions[optionIndex].isCorrect = true;
              }
            } else {
              // Handle other object formats if needed
              Object.keys(questionData.correctAnswer).forEach((correctKey) => {
                const optionIndex = formattedOptions.findIndex(
                  (opt) => opt.id === correctKey,
                );
                if (optionIndex !== -1) {
                  formattedOptions[optionIndex].isCorrect = true;
                }
              });
            }
          } else if (typeof questionData.correctAnswer === "number") {
            // Handle index format
            if (formattedOptions[questionData.correctAnswer]) {
              formattedOptions[questionData.correctAnswer].isCorrect = true;
            }
          }
        }

        setOptions(formattedOptions);
      }
      setMultipleAnswers(questionData.type === "MULTI_SELECT");
    } else if (questionData.type === "TRUE_FALSE") {
      console.log(
        "True/False correctAnswer from backend:",
        questionData.correctAnswer,
      );

      if (
        questionData.correctAnswer &&
        typeof questionData.correctAnswer === "object" &&
        "answer" in questionData.correctAnswer
      ) {
        const answerValue = questionData.correctAnswer.answer;
        if (answerValue === true || answerValue === "A") {
          setTfAnswer("true");
        } else if (answerValue === false || answerValue === "B") {
          setTfAnswer("false");
        } else {
          setTfAnswer(String(answerValue).toLowerCase() === "true" ? "true" : "false");
        }
      } else {
        // Fallback for other formats
        setTfAnswer(questionData.correctAnswer ? "true" : "false");
      }
    }

    setLearningObjective(questionData.learningObjectives || "");
  };

  const addOption = () => {
    const nextId = String.fromCharCode(65 + options.length);
    setOptions([...options, { id: nextId, text: "", isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const setCorrectOption = (id: string) => {
    if (multipleAnswers) {
      setOptions(
        options.map((o) =>
          o.id === id ? { ...o, isCorrect: !o.isCorrect } : o,
        ),
      );
    } else {
      setOptions(options.map((o) => ({ ...o, isCorrect: o.id === id })));
    }
  };

  const getDefaultOptions = (): Option[] => [
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ];

  const resetFormForNextQuestion = () => {
    setContent("");
    setExplanation("");
    setDifficulty([0.5]);
    setHasMedia(false);
    setMediaType("image");
    setLearningObjective("");
    setMultipleAnswers(questionType === "multiple_choice" ? multipleAnswers : false);
    setTfAnswer("true");
    setEssayRubric("");
    setEssayMaxScore("10");
    setEssayMaxScoreError("");
    setValidationErrors([]);
    setPinnedOptions(new Set());
    setOptions(
      questionType === "multiple_choice" || questionType === "ordering" || questionType === "matching"
        ? getDefaultOptions()
        : getDefaultOptions(),
    );
    setAiPrompt("");
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleSave = async (addAnother = false) => {
    let questionData;
    try {
      // Validate before saving
      if (!validateQuestion()) {
        toast.error("Please fix the validation errors below");
        return;
      }

      setSaving(true);

      // Backend accepts difficulty as integer 1..10.
      const backendDifficulty = Math.max(
        1,
        Math.min(
          10,
          Math.round(difficulty[0] <= 1 ? difficulty[0] * 10 : difficulty[0]),
        ),
      );

      // Map frontend question type to backend enum accepted by DTO.
      let backendType: string;
      if (questionType === "multiple_choice") {
        backendType = multipleAnswers ? "MULTI_SELECT" : "MULTIPLE_CHOICE";
      } else if (questionType === "true_false") {
        backendType = "TRUE_FALSE";
      } else if (questionType === "essay") {
        backendType = "ESSAY";
      } else if (questionType === "fill_blank") {
        backendType = "FILL_IN_BLANK";
      } else if (questionType === "matching") {
        backendType = "MATCHING";
      } else if (questionType === "ordering") {
        backendType = "ORDERING";
      } else {
        backendType = "MULTIPLE_CHOICE";
      }

      questionData = {
        type: backendType,
        content,
        explanation,
        difficulty: backendDifficulty,
        points: 10, // Default points
        options:
          questionType === "multiple_choice"
            ? options
                .filter((opt) => opt.text.trim())
                .reduce((acc, opt, idx) => {
                  acc[opt.id] = opt.text;
                  return acc;
                }, {} as any) // Send as object {A: "text", B: "text"}
            : questionType === "true_false"
              ? {
                  A: "True",
                  B: "False",
                }
              : {},
        correctAnswer:
          questionType === "multiple_choice"
            ? {
                  answer: options
                    .filter((opt) => opt.isCorrect)
                    .map((opt) => opt.id)
                    .join(","),
                } // Format: {answer: "A,C"}
              : questionType === "true_false"
                ? { answer: tfAnswer === "true" ? "A" : "B" }
                : {},
      };

      if (questionId) {
        // Update by creating a V2 draft from existing question and publishing it.
        console.log("Updating question with data:", questionData);
        await api.saveQuestion({
          sourceQuestionId: questionId,
          courseId: course || undefined,
          topicId: topic,
          ...questionData,
        });
      } else {
        // Create via V2 draft flow.
        (questionData as any).courseId = course || undefined;
        (questionData as any).topicId = topic || undefined;
        console.log("Creating question with data:", questionData);
        await api.saveQuestion(questionData);
      }

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      if (addAnother && !questionId) {
        window.alert("Thêm câu hỏi thành công!");
        resetFormForNextQuestion();
        return;
      }

      router.push(questionBankPath);
    } catch (error) {
      console.error("Failed to save question:", error);
      console.error("Question data that failed:", questionData);
      // Show user-friendly error message
      toast.error(
        "Failed to save question. Please check the console for details.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (isGenerating) return; // Prevent double clicks
    setIsGenerating(true);
    setAiError(null);
    setAiSimilarityWarning("");

    try {
      // Validate course before proceeding
      if (!course) {
        throw new Error("Please select a course before generating a question.");
      }

      // Map frontend type to backend type for the AI prompt
      const backendTypeMap: Record<string, string> = {
        multiple_choice: "MULTIPLE_CHOICE",
        true_false: "TRUE_FALSE",
        essay: "ESSAY",
        fill_blank: "FILL_IN_BLANK",
        matching: "MATCHING",
        ordering: "ORDERING",
      };
      const mappedType = backendTypeMap[questionType] || "MULTIPLE_CHOICE";

      console.log("[AI] Starting generation with prompt:", aiPrompt);
      const result = await api.aiGenerateQuestion({
        prompt: aiPrompt,
        questionType: mappedType,
        difficulty: snapDifficulty(Math.max(0, Math.min(1, difficulty[0]))),
        language: "en",
        useCase: "question_bank",
        context: {
          courseId: course || undefined,
          courseName: courses.find((item) => item.id === course)?.name,
          courseCode: courses.find((item) => item.id === course)?.code,
          questionType: mappedType,
          source: "question_editor",
        },
      });
      console.log("[AI] Generation result received:", result);

      const similarityCheck = await findSimilarExistingQuestion(
        result,
        backendTypeMap[questionType] || "MULTIPLE_CHOICE",
      );

      if (similarityCheck && similarityCheck.similarity >= 0.8) {
        const warningMessage =
          `AI generated content is too similar to an existing question (${Math.round(
            similarityCheck.similarity * 100,
          )}%). Please rewrite the prompt or regenerate a different question.`;
        setAiSimilarityWarning(warningMessage);
        toast.error(warningMessage);
        return;
      }

      // Fill in the form with AI-generated content
      setContent(result.content);
      if (result.explanation) setExplanation(result.explanation);
      if (result.difficulty !== undefined && result.difficulty !== null) {
        setDifficulty([
          snapDifficulty(Math.max(0, Math.min(1, result.difficulty))),
        ]);
      }
      if (result.topic) setTopic(result.topic);
      if (result.learningObjective)
        setLearningObjective(result.learningObjective);

      // Fill in options if it's a choice-based question
      if (
        result.options &&
        (questionType === "multiple_choice" ||
          questionType === "true_false")
      ) {
        const newOptions = Object.entries(result.options).map(
          ([key, text]) => ({
            id: key,
            text: text as string,
            isCorrect: result.correctAnswer?.answer === key,
          }),
        );
        if (newOptions.length > 0) setOptions(newOptions);
      }

      setAiPrompt("");
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      console.error("[AI] Generation failed:", error);
      setAiError(message);
      toast.error("AI generation failed: " + message);
    } finally {
      setIsGenerating(false);
    }
  };

  const normalizeQuestionText = (value: string) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const calculateQuestionSimilarity = (left: string, right: string) => {
    const normalizedLeft = normalizeQuestionText(left);
    const normalizedRight = normalizeQuestionText(right);

    if (!normalizedLeft || !normalizedRight) return 0;
    if (normalizedLeft === normalizedRight) return 1;
    if (
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft)
    ) {
      return 0.95;
    }

    const leftTokens = new Set(normalizedLeft.split(" ").filter(Boolean));
    const rightTokens = new Set(normalizedRight.split(" ").filter(Boolean));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

    let sharedTokens = 0;
    leftTokens.forEach((token) => {
      if (rightTokens.has(token)) sharedTokens += 1;
    });

    return sharedTokens / Math.max(leftTokens.size, rightTokens.size);
  };

  const buildQuestionSignature = (questionItem: any) => {
    const contentText = String(questionItem?.content || questionItem?.question || "");
    const optionValues = questionItem?.options
      ? Array.isArray(questionItem.options)
        ? questionItem.options.map((opt: any) => String(opt?.text ?? opt ?? "")).join(" ")
        : Object.values(questionItem.options).map((value) => String(value ?? "")).join(" ")
      : "";
    return `${contentText} ${optionValues}`.trim();
  };

  const findSimilarExistingQuestion = async (
    generatedQuestion: { content: string; options?: Record<string, string> | null },
    backendType: string,
  ) => {
    const existing = unwrapPaginatedData(
      await api.listQuestions({
        courseId: course || undefined,
        type: backendType,
        limit: 200,
      }),
    );

    const generatedSignature = `${generatedQuestion.content} ${
      generatedQuestion.options ? Object.values(generatedQuestion.options).join(" ") : ""
    }`;

    let bestMatch: { similarity: number; question: any } | null = null;

    for (const item of existing || []) {
      const similarity = calculateQuestionSimilarity(
        generatedSignature,
        buildQuestionSignature(item),
      );

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { similarity, question: item };
      }
    }

    return bestMatch;
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !course) return;
    
    try {
      setCreatingTopic(true);
      const newTopic = await api.createQuestionTopic({
        name: newTopicName.trim(),
        code: newTopicName.trim().toUpperCase().replace(/\s+/g, "_"),
        courseId: course,
      });
      
      setAvailableTopics([...availableTopics, newTopic]);
      setTopic(newTopic.id);
      setNewTopicName("");
      setTopicSearch("");
      setTopicSuggestions([]);
      setShowTopicDialog(false);
      toast.success("Topic created successfully!");
    } catch (error) {
      console.error("Failed to create topic:", error);
      toast.error("Failed to create topic. Please try again.");
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleCheckSimilarTopics = async () => {
    const query = newTopicName.trim();
    if (!query) {
      setTopicSuggestions([]);
      return;
    }

    try {
      setCheckingTopicSimilarity(true);
      const response = await api.suggestSimilarTopics({
        topicName: query,
        existingTopics: availableTopics.map((item) => item.name),
        courseName: courses.find((item) => item.id === course)?.name,
        language: "vi",
      });
      const rankedTopics = (response?.matches || [])
        .map((item: any) => {
          const match = availableTopics.find(
            (topic) => topic.name.toLowerCase() === String(item.name || '').toLowerCase() ||
              topic.code.toLowerCase() === String(item.name || '').toLowerCase(),
          );
          return {
            id: match?.id || String(item.name || item.code || Math.random()),
            code: match?.code || String(item.code || item.name || ""),
            name: match?.name || String(item.name || item.code || ""),
            score: Number(item.score ?? 0),
            reason: String(item.reason || ""),
          };
        })
        .filter((item: any) => item.name)
        .slice(0, 5);

      setTopicSuggestions(rankedTopics);
    } catch (error) {
      console.error("Failed to check similar topics:", error);
      setTopicSuggestions([]);
    } finally {
      setCheckingTopicSimilarity(false);
    }
  };

  useEffect(() => {
    const query = newTopicName.trim();

    if (!query) {
      setTopicSuggestions([]);
      return;
    }

    const suggestionTimer = window.setTimeout(() => {
      if (query.length >= 2) {
        handleCheckSimilarTopics();
      } else {
        setTopicSuggestions([]);
      }
    }, 450);

    return () => window.clearTimeout(suggestionTimer);
  }, [newTopicName]);

  const filteredTopics = availableTopics.filter((item) => {
    const query = topicSearch
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!query) return true;
    const name = item.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const code = item.code
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return name.includes(query) || code.includes(query);
  });

  // Deduplicate topics case-insensitively (so 'SQL' and 'sql' are treated the same)
  const dedupedFilteredTopics = (() => {
    const seen = new Set<string>();
    const out: { id: string; code: string; name: string }[] = [];
    for (const t of filteredTopics) {
      const key = String(t.name || t.code || '').toLowerCase().trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
  })();

  const handleCloseTopicDialog = () => {
    setShowTopicDialog(false);
    setNewTopicName("");
    setTopicSearch("");
    setTopicSuggestions([]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-0">
        {/* <BackToDashboardButton to={basePath} className="mb-2 -ml-2" /> */}

        <Button
          variant="ghost"
          size="sm"
          className="mb-3 sm:mb-4 gap-2 text-muted-foreground -ml-2"
          onClick={() => router.push(questionBankPath)}
        >
          <ArrowLeft className="h-4 w-4" />{" "}
          <span className="hidden sm:inline">Back to Question Bank</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
              {loading
                ? "Loading..."
                : questionId
                  ? "Edit Question"
                  : "New Question"}
            </h1>
            <p className="text-sm text-muted-foreground break-words">
              {(() => {
                const currentCourse = courses.find((c) => c.id === course);
                if (currentCourse)
                  return (
                    <span>
                      Course:{" "}
                      <span className="font-semibold text-foreground">
                        {currentCourse.code} — {currentCourse.name}
                      </span>
                    </span>
                  );
                if (courseCodeParam)
                  return (
                    <span>
                      Course:{" "}
                      <span className="font-semibold text-foreground">
                        {courseCodeParam}
                      </span>
                    </span>
                  );
                return questionId
                  ? "Edit an existing question"
                  : "Create a new question";
              })()}
            </p>
          </div>
          <div className="flex gap-2 sm:flex-shrink-0">
            {!loading && (
              <>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-1 sm:flex-initial"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden xs:inline">Save</span>
                  <span className="xs:hidden">Save</span>
                </Button>
                {!questionId && (
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    size="sm"
                    variant="default"
                    className="gap-1.5 flex-1 sm:flex-initial"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="hidden xs:inline">Save and Add Another</span>
                    <span className="xs:hidden">Save and Add Another</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm font-semibold text-destructive mb-2">
              ⚠️ Please fix these errors before saving:
            </p>
            <ul className="space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-destructive flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Loading question data...
            </span>
          </div>
        ) : (
          <div>
            {/* === EDIT MODE === */}
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
                {/* ── LEFT: Question Editor ── */}
                <div className="space-y-4 sm:space-y-6">
                  {/* AI Generator Section */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <CardTitle className="text-sm sm:text-base font-semibold text-primary">
                          AI Assistant
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs sm:text-sm">
                        Generate content using AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="e.g. Distributed systems, Raft vs Paxos..."
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="flex-1 bg-background text-sm"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAiGenerate()
                          }
                        />
                        <Button
                          onClick={handleAiGenerate}
                          disabled={isGenerating || !aiPrompt.trim() || !course}
                          className="gap-2 w-full sm:w-auto"
                          size="sm"
                          title={!course ? "Select a course to use AI generation" : ""}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          Generate
                        </Button>
                      </div>
                      {!course && (
                        <p className="text-[10px] text-amber-600 font-medium px-1">
                          ⚠️ Select a course from the right panel to enable AI generation.
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground italic px-1">
                        * Generated content will be inserted into the editor for you to review before saving.
                      </p>
                      {aiSimilarityWarning && (
                        <p className="text-[10px] text-red-600 font-medium px-1">
                          {aiSimilarityWarning}
                        </p>
                      )}
                      {aiError && (
                        <p className="text-[10px] text-red-600 font-medium px-1">
                          ❌ {aiError}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Question Type */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <CardTitle className="text-sm sm:text-base">
                        Question Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <Select
                        value={questionType}
                        onValueChange={(val) => {
                          setQuestionType(val);
                          setPinnedOptions(new Set());
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">
                            Multiple Choice
                          </SelectItem>
                          <SelectItem value="true_false">
                            True / False
                          </SelectItem>
                          <SelectItem value="fill_blank">
                            Fill in the Blank
                          </SelectItem>
                          <SelectItem value="matching">Matching</SelectItem>
                          <SelectItem value="find_error">
                            Find the Error
                          </SelectItem>
                          <SelectItem value="ordering">
                            Ordering / Sequencing
                          </SelectItem>
                          <SelectItem value="essay">
                            Short Answer / Essay
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Question Content */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <CardTitle className="text-sm sm:text-base">
                        Question Content
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Enter your question text
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                      {questionType === "multiple_choice" && (
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-blue-800 font-medium mb-0.5 sm:mb-1">
                            💡 How to select correct answers:
                          </p>
                          <p className="text-[11px] sm:text-xs text-blue-700">
                            {multipleAnswers
                              ? "Click the circles (A, B, C, D) to mark multiple correct answers"
                              : "Click the circles (A, B, C, D) to select the single correct answer"}
                          </p>
                        </div>
                      )}
                      {questionType === "true_false" && (
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-green-800 font-medium mb-0.5 sm:mb-1">
                            💡 How to select correct answer:
                          </p>
                          <p className="text-[11px] sm:text-xs text-green-700">
                            Click either "True" or "False" button below to set
                            the correct answer
                          </p>
                        </div>
                      )}
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="content" className="text-sm">
                          Question Text
                        </Label>

                        {/* Insert fill-in-the-blank helper into Question Content for better discoverability */}
                        {questionType === "fill_blank" && (
                          <div className="mb-3 p-3 rounded-md border border-muted/30 bg-muted/3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">How to create blanks</p>
                                <p className="text-xs text-muted-foreground mt-1">Use double square brackets to mark blanks in the question text.</p>
                                <div className="mt-2 text-sm text-muted-foreground">Example: <span className="font-medium">The capital of France is [[Paris]].</span></div>
                                <div className="text-xs text-muted-foreground mt-1">When students answer, they'll fill in the bracketed part.</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <Textarea
                          id="content"
                          placeholder="Enter your question here..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={3}
                          className="text-sm sm:text-base resize-none"
                          ref={contentRef}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={insertBlankAtCursor}
                            className="gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Blank
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={hasMedia}
                            onCheckedChange={setHasMedia}
                          />
                          <Label>Include media</Label>
                        </div>
                        {hasMedia && (
                          <div className="flex gap-2">
                            <Button
                              variant={
                                mediaType === "image" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMediaType("image")}
                              className="gap-1"
                            >
                              <Image className="h-3.5 w-3.5" /> Image
                            </Button>
                            <Button
                              variant={
                                mediaType === "audio" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMediaType("audio")}
                              className="gap-1"
                            >
                              <Music className="h-3.5 w-3.5" /> Audio
                            </Button>
                          </div>
                        )}
                      </div>

                      {hasMedia && (
                        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            Drag & drop{" "}
                            {mediaType === "image"
                              ? "an image"
                              : "an audio file"}{" "}
                            here, or click to browse
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Choose File
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Answer Options - hide entirely for Fill-in-the-Blank (helper moved above) */}
                  {questionType !== "fill_blank" && (
                    <Card>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base">
                          {questionType === "multiple_choice" &&
                            "Answer Options"}
                          {questionType === "true_false" && "Correct Answer"}
                          {questionType === "essay" && "Grading Rubric"}
                          {/* Removed Blank Configurations label for fill_blank as helper now lives in Question Content */}
                          {questionType === "matching" && "Matching Pairs"}
                          {questionType === "find_error" && "Code Segments"}
                          {questionType === "ordering" && "Sequence Items"}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {(questionType === "multiple_choice" ||
                            questionType === "ordering" ||
                            questionType === "matching") &&
                            options.length < 8 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={addOption}
                                className="gap-1 text-xs"
                              >
                                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{" "}
                                <span className="hidden sm:inline">Add</span>
                              </Button>
                            )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
                      {/* Moved fill-in-the-blank helper into Question Content per UX request */}
                      {questionType === "multiple_choice" && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Label className="text-sm">Allow multiple correct answers</Label>
                              <Switch
                                checked={multipleAnswers}
                                onCheckedChange={setMultipleAnswers}
                              />
                            </div>
                          </div>
                          {multipleAnswers && (
                            <p className="text-xs text-muted-foreground italic mt-2">
                              Students can select multiple answers. Check all that are correct.
                            </p>
                          )}
                        </div>
                      )}

                      {(questionType === "multiple_choice" ||
                        questionType === "ordering" ||
                        questionType === "matching") &&
                        options.map((opt, idx) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 sm:gap-3"
                          >
                            {/* Drag handle - only for draggable types */}
                            {(questionType === "ordering" ||
                              questionType === "matching") && (
                              <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground cursor-move flex-shrink-0" />
                            )}

                            {/* Correct/Incorrect toggle - only for multiple choice */}
                            {questionType === "multiple_choice" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setCorrectOption(opt.id)}
                                      className={`flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                                        opt.isCorrect
                                          ? "border-green-500 bg-green-100 text-green-700 shadow-lg scale-110"
                                          : "border-gray-300 hover:border-green-400 text-muted-foreground hover:bg-green-50 hover:scale-105"
                                      }`}
                                      title={
                                        opt.isCorrect
                                          ? "Correct answer"
                                          : "Click to mark as correct"
                                      }
                                    >
                                      {opt.isCorrect ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        opt.id
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {opt.isCorrect
                                        ? "✅ Correct answer"
                                        : "⭕ Click to mark as correct"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Sequence number - only for ordering */}
                            {questionType === "ordering" && (
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {idx + 1}
                              </div>
                            )}

                            {/* Option text input */}
                            <Input
                              placeholder={
                                questionType === "matching"
                                  ? "Concept..."
                                  : `Option ${opt.id}`
                              }
                              value={opt.text}
                              onChange={(e) =>
                                updateOption(opt.id, e.target.value)
                              }
                              className="flex-1 text-sm min-w-0"
                            />

                            {/* Matching pair input */}
                            {questionType === "matching" && (
                              <>
                                <span className="text-muted-foreground text-sm flex-shrink-0">
                                  →
                                </span>
                                <Input
                                  placeholder="Match..."
                                  className="flex-1 text-sm min-w-0"
                                />
                              </>
                            )}

                            {/* Pin button - only for multiple choice */}
                            {questionType === "multiple_choice" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={pinnedOptions.has(opt.id) ? "text-amber-600" : "text-muted-foreground"}
                                      onClick={() => {
                                        const newPinned = new Set(pinnedOptions);
                                        if (newPinned.has(opt.id)) {
                                          newPinned.delete(opt.id);
                                        } else {
                                          newPinned.add(opt.id);
                                        }
                                        setPinnedOptions(newPinned);
                                      }}
                                    >
                                      {pinnedOptions.has(opt.id) ? (
                                        <Pin className="h-4 w-4" />
                                      ) : (
                                        <PinOff className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {pinnedOptions.has(opt.id)
                                        ? "📌 Pinned - won't be shuffled"
                                        : "📍 Click to pin - prevent shuffling"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeOption(opt.id)}
                              disabled={options.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                      {questionType === "true_false" && (
                        <div className="flex gap-2 sm:gap-4">
                          <Button
                            variant={
                              tfAnswer === "true" ? "default" : "outline"
                            }
                            onClick={() => setTfAnswer("true")}
                            size="sm"
                            className={`flex-1 text-sm ${tfAnswer === "true" ? "bg-green-600 hover:bg-green-700" : "border-green-300 hover:border-green-500 hover:bg-green-50"}`}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />{" "}
                            True
                          </Button>
                          <Button
                            variant={
                              tfAnswer === "false" ? "default" : "outline"
                            }
                            onClick={() => setTfAnswer("false")}
                            size="sm"
                            className={`flex-1 text-sm ${tfAnswer === "false" ? "bg-green-600 hover:bg-green-700" : "border-green-300 hover:border-green-500 hover:bg-green-50"}`}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />{" "}
                            False
                          </Button>
                        </div>
                      )}

                      {/* Removed duplicate Blank Configuration box — helper now lives in Question Content above */}

                      {questionType === "find_error" && (
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg bg-secondary/20 font-mono text-sm">
                            <p className="text-muted-foreground mb-2">
                              Select the line or phrase that contains the error.
                            </p>
                            <div className="p-3 bg-card border rounded space-y-1">
                              <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">
                                1. function calculate(a, b) {"{"}{" "}
                              </div>
                              <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">
                                2. return a + c; // Click to mark as error{" "}
                              </div>
                              <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">
                                3. {"}"}{" "}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {questionType === "essay" && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-sm">
                              Rubric / Grading Criteria
                            </Label>
                            <Textarea
                              placeholder="Describe grading criteria, expected key points..."
                              value={essayRubric}
                              onChange={(e) => setEssayRubric(e.target.value)}
                              rows={3}
                              className="text-sm resize-none"
                            />
                          </div>
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-sm">Max Score</Label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={essayMaxScore}
                              onChange={(e) =>
                                setEssayMaxScore(
                                  sanitizeNumericInput(e.target.value),
                                )
                              }
                              onBlur={(e) =>
                                setEssayMaxScoreError(
                                  getNumericInputError(e.target.value, {
                                    min: 1,
                                    max: 100,
                                    integer: true,
                                  }) || "",
                                )
                              }
                              className="w-20 sm:w-24 text-sm"
                            />
                            {essayMaxScoreError ? (
                              <p className="text-xs text-destructive">
                                {essayMaxScoreError}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Explanation */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <CardTitle className="text-sm sm:text-base">
                        Explanation (optional)
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Shown to students after they answer
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <Textarea
                        placeholder="Explain why the correct answer is correct..."
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>
                {/* end left column */}

                {/* ── RIGHT: Metadata Sidebar ── */}
                <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-[4.5rem]">
                  {/* Course - Required */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-sm">
                        Course <span className="text-red-500">*</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Required to organize questions and enable AI generation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <Select value={course} onValueChange={setCourse}>
                        <SelectTrigger className={`text-sm ${!course ? "border-red-300 bg-red-50" : ""}`}>
                          <SelectValue placeholder="Select a course..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem
                              key={c.id}
                              value={c.id}
                              className="text-sm"
                            >
                              {c.code} - {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!course && (
                        <p className="text-[10px] text-red-600 font-medium">
                          ⚠️ Course selection is required to save a question.
                        </p>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Topic
                        </Label>
                        <Button
                          variant="outline"
                          onClick={() => setShowTopicDialog(true)}
                          disabled={!course}
                          className="w-full justify-start text-left font-normal"
                        >
                          {topic
                            ? availableTopics.find((t: any) => t.id === topic)?.name || "Unknown Topic"
                            : "Select or create a topic..."}
                        </Button>
                        {!course && (
                          <p className="text-[10px] text-amber-600">
                            Select a course first to choose a topic.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Difficulty - Button Group */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-sm">Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex gap-2">
                        <Button
                          variant={difficulty[0] <= 0.4 ? "default" : "outline"}
                          className="flex-1 text-sm"
                          onClick={() => setDifficulty([0.3])}
                        >
                          Easy
                        </Button>
                        <Button
                          variant={difficulty[0] > 0.4 && difficulty[0] < 0.6 ? "default" : "outline"}
                          className="flex-1 text-sm"
                          onClick={() => setDifficulty([0.5])}
                        >
                          Medium
                        </Button>
                        <Button
                          variant={difficulty[0] >= 0.6 ? "default" : "outline"}
                          className="flex-1 text-sm"
                          onClick={() => setDifficulty([0.7])}
                        >
                          Hard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Difficulty card remains above. The Allow multiple answers toggle
                      should always appear inside the Answer Options card below; removed
                      the separate card here. */}
                </div>
                {/* end metadata sidebar */}
              </div>
              {/* end grid */}
            
            </div>
          </div>
        )}

        {/* Topic Selection Dialog */}
        {showTopicDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[min(96vw,1100px)] max-w-none mx-4 overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-background to-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Select or Create Topic</CardTitle>
                    <CardDescription>
                      Search existing topics, check for similar ones, or create a new topic.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCloseTopicDialog} className="text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr] p-5 sm:p-7 lg:p-8">
                <div className="space-y-4 rounded-2xl border bg-muted/20 p-5 shadow-sm min-h-[420px]">
                  <div>
                    <Label
                      htmlFor="topic-name"
                      className="text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      New Topic
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a new topic if it doesn't already exist.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="topic-name"
                      placeholder="e.g., Graph Algorithms"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateTopic();
                        }
                      }}
                      className="text-sm flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCheckSimilarTopics}
                      disabled={!newTopicName.trim() || checkingTopicSimilarity}
                      className="gap-2 shrink-0"
                    >
                      {checkingTopicSimilarity ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      AI Check
                    </Button>
                    <Button
                      onClick={handleCreateTopic}
                      disabled={!newTopicName.trim() || creatingTopic}
                      className="gap-2 shrink-0"
                    >
                      {creatingTopic ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Create
                    </Button>
                  </div>

                  {topicSuggestions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Similar existing topics
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          AI ranked
                        </span>
                      </div>
                      <div className="space-y-2">
                        {topicSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                            onClick={() => {
                              if (item.id) {
                                setTopic(item.id);
                                handleCloseTopicDialog();
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-medium">
                                {item.name}
                              </span>
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {Math.round(item.score * 100)}%
                              </span>
                            </div>
                            {item.reason && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {item.reason}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border bg-background p-5 shadow-sm min-h-[420px]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Search Topics
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {dedupedFilteredTopics.length} result(s)
                      </span>
                    </div>
                    <Input
                      placeholder="Search by topic name or code..."
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Available Topics
                    </Label>
                    <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                      {dedupedFilteredTopics.length > 0 ? (
                        dedupedFilteredTopics.map((t: any) => (
                          <Button
                            key={t.id}
                            variant={topic === t.id ? "default" : "outline"}
                            className="w-full justify-start text-left h-auto py-2.5 rounded-xl"
                            size="sm"
                            onClick={() => {
                              setTopic(t.id);
                              handleCloseTopicDialog();
                            }}
                          >
                            <span className="truncate">{t.name}</span>
                          </Button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          No topics match your search.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-3 border-t bg-muted/20 p-5 sm:p-6 lg:p-7">
                <Button
                  variant="outline"
                  onClick={handleCloseTopicDialog}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTopic}
                  disabled={!newTopicName.trim() || creatingTopic}
                  className="flex-1 gap-2"
                >
                  {creatingTopic ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create & Select"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}




