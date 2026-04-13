import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { api, unwrapPaginatedData } from "@/lib/api";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Eye,
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
} from "lucide-react";
import { toast } from "sonner";
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

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
  tags: string;
  course?: { id: string; code: string; name: string };
  learningObjectives?: string;
}

export default function QuestionEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin"
    : "/lecturer";
  const questionBankPath = `${basePath}/question-bank`;
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get("id");
  const courseCodeParam = searchParams.get("courseCode");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [tab, setTab] = useState("edit");
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "audio">("image");
  const [learningObjective, setLearningObjective] = useState("");

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Multiple choice options
  const [options, setOptions] = useState<Option[]>([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);

  // True/False answer
  const [tfAnswer, setTfAnswer] = useState<"true" | "false">("true");

  // Essay rubric
  const [essayRubric, setEssayRubric] = useState("");
  const [essayMaxScore, setEssayMaxScore] = useState(10);

  // Load courses from API
  const snapDifficulty = (value: number) => {
    const levels = [0.3, 0.5, 0.7];
    return levels.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
    );
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
      const questionData = await api.getQuestion(questionId);
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
      SINGLE_CHOICE: "single_choice",
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
    // Backend stores difficulty as 1..10, editor UI uses 0..1 slider.
    const uiDifficulty =
      typeof questionData.difficulty === "number"
        ? questionData.difficulty > 1
          ? Math.max(0, Math.min(1, questionData.difficulty / 10))
          : Math.max(0, Math.min(1, questionData.difficulty))
        : 0.5;
    setDifficulty([snapDifficulty(uiDifficulty)]);

    // Parse tags
    if (questionData.tags) {
      try {
        const tagsArray = Array.isArray(questionData.tags)
          ? questionData.tags
          : typeof questionData.tags === "string"
            ? questionData.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];
        setTags(tagsArray);
      } catch {
        setTags([]);
      }
    }

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
        setTfAnswer(
          questionData.correctAnswer.answer === true ? "true" : "false",
        );
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

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

  const handleSave = async () => {
    let questionData;
    try {
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
      } else if (questionType === "single_choice") {
        backendType = "MULTIPLE_CHOICE";
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
        tags: tags, // Backend expects array
        options:
          questionType === "multiple_choice" || questionType === "single_choice"
            ? options
                .filter((opt) => opt.text.trim())
                .reduce((acc, opt, idx) => {
                  acc[opt.id] = opt.text;
                  return acc;
                }, {} as any) // Send as object {A: "text", B: "text"}
            : {},
        correctAnswer:
          questionType === "single_choice"
            ? { answer: options.find((opt) => opt.isCorrect)?.id || "A" } // Format: {answer: "B"}
            : questionType === "multiple_choice"
              ? {
                  answer: options
                    .filter((opt) => opt.isCorrect)
                    .map((opt) => opt.id)
                    .join(","),
                } // Format: {answer: "A,C"}
              : questionType === "true_false"
                ? { answer: tfAnswer === "true" }
                : {},
      };

      if (questionId) {
        // Update DTO does not allow courseId.
        delete (questionData as any).courseId;
        // Update existing question
        console.log("Updating question with data:", questionData);
        await api.updateQuestion(questionId, questionData);
      } else {
        // Create DTO accepts courseId.
        (questionData as any).courseId = course || undefined;
        // Create new question
        console.log("Creating question with data:", questionData);
        await api.createQuestion(questionData);
      }

      navigate(questionBankPath);
    } catch (error) {
      console.error("Failed to save question:", error);
      console.error("Question data that failed:", questionData);
      // Show user-friendly error message
      toast.error("Failed to save question. Please check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);

    try {
      // Map frontend type to backend type for the AI prompt
      const backendTypeMap: Record<string, string> = {
        multiple_choice: "MULTIPLE_CHOICE",
        single_choice: "MULTIPLE_CHOICE",
        true_false: "TRUE_FALSE",
        essay: "ESSAY",
        fill_blank: "FILL_IN_BLANK",
        matching: "MATCHING",
        ordering: "ORDERING",
      };

      const result = await api.aiGenerateQuestion({
        prompt: aiPrompt,
        questionType: backendTypeMap[questionType] || "MULTIPLE_CHOICE",
        difficulty: snapDifficulty(Math.max(0, Math.min(1, difficulty[0]))),
        language: "en",
        useCase: "question_bank",
      });

      // Fill in the form with AI-generated content
      setContent(result.content);
      if (result.explanation) setExplanation(result.explanation);
      if (result.tags && result.tags.length > 0) setTags(result.tags);
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
          questionType === "single_choice" ||
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
      console.error("AI generation failed:", error);
      toast.error("AI generation failed: " + (error.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyLabel =
    difficulty[0] <= 0.3 ? "Easy" : difficulty[0] <= 0.5 ? "Medium" : "Hard";
  const difficultyColor =
    difficulty[0] <= 0.3
      ? "text-green-600"
      : difficulty[0] <= 0.5
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-0">
        {/* <BackToDashboardButton to={basePath} className="mb-2 -ml-2" /> */}

        <Button
          variant="ghost"
          size="sm"
          className="mb-3 sm:mb-4 gap-2 text-muted-foreground -ml-2"
          onClick={() => navigate(questionBankPath)}
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
                  variant="outline"
                  onClick={() => setTab("preview")}
                  size="sm"
                  className="gap-1.5 hidden sm:flex"
                >
                  <Eye className="h-4 w-4" /> Preview
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !content}
                  size="sm"
                  className="gap-1.5 flex-1 sm:flex-initial"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden xs:inline">Save Question</span>
                  <span className="xs:hidden">Save</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Loading question data...
            </span>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-3 sm:mb-4 grid grid-cols-2 w-[160px]">
              <TabsTrigger value="edit" className="text-xs sm:text-sm">
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs sm:text-sm">
                Preview
              </TabsTrigger>
            </TabsList>

            {/* === EDIT TAB === */}
            <TabsContent value="edit">
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
                        <p className="text-[10px] text-destructive font-medium px-1">
                          Select a course from the right panel before using AI.
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground italic px-1">
                        * Generated content will overwrite current question text
                        and options.
                      </p>
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
                          if (val === "single_choice") {
                            setMultipleAnswers(false);
                            // Keep only the first correct option if switching to single choice
                            const firstCorrectIndex = options.findIndex(
                              (o) => o.isCorrect,
                            );
                            setOptions(
                              options.map((o, idx) => ({
                                ...o,
                                isCorrect:
                                  idx ===
                                  (firstCorrectIndex !== -1
                                    ? firstCorrectIndex
                                    : 0),
                              })),
                            );
                          } else if (val === "multiple_choice") {
                            setMultipleAnswers(true);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_choice">
                            Single Choice
                          </SelectItem>
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
                      {(questionType === "multiple_choice" ||
                        questionType === "single_choice") && (
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-blue-800 font-medium mb-0.5 sm:mb-1">
                            💡 How to select correct answers:
                          </p>
                          <p className="text-[11px] sm:text-xs text-blue-700">
                            {questionType === "multiple_choice"
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
                        <Textarea
                          id="content"
                          placeholder="Enter your question here..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={3}
                          className="text-sm sm:text-base resize-none"
                        />
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

                  {/* Answer Options */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base">
                          {(questionType === "multiple_choice" ||
                            questionType === "single_choice") &&
                            "Answer Options"}
                          {questionType === "true_false" && "Correct Answer"}
                          {questionType === "essay" && "Grading Rubric"}
                          {questionType === "fill_blank" &&
                            "Blank Configurations"}
                          {questionType === "matching" && "Matching Pairs"}
                          {questionType === "find_error" && "Code Segments"}
                          {questionType === "ordering" && "Sequence Items"}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {(questionType === "multiple_choice" ||
                            questionType === "single_choice" ||
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
                      {(questionType === "multiple_choice" ||
                        questionType === "single_choice" ||
                        questionType === "ordering" ||
                        questionType === "matching") &&
                        options.map((opt, idx) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 sm:gap-3"
                          >
                            <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground cursor-move flex-shrink-0" />
                            {(questionType === "multiple_choice" ||
                              questionType === "single_choice") && (
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
                            {questionType === "ordering" && (
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {idx + 1}
                              </div>
                            )}
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

                      {questionType === "fill_blank" && (
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg bg-secondary/20">
                            <p className="text-sm text-muted-foreground mb-2 italic">
                              Tip: Use double brackets like [[answer]] in the
                              question text above to create blanks.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" /> Add Blank Manually
                            </Button>
                          </div>
                        </div>
                      )}

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
                                setEssayMaxScore(Number(e.target.value))
                              }
                              className="w-20 sm:w-24 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
                  {/* Course - required */}
                  <Card className={!course ? "border-destructive/50" : ""}>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-sm flex items-center gap-1">
                        Course <span className="text-destructive">*</span>
                      </CardTitle>
                      {!course && (
                        <CardDescription className="text-xs text-destructive">
                          Required for AI generation
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <Select value={course} onValueChange={setCourse}>
                        <SelectTrigger className="text-sm">
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
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Topic
                        </Label>
                        <Input
                          placeholder="e.g., Graph Algorithms"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Learning Objective
                        </Label>
                        <Input
                          placeholder="e.g., Apply Dijkstra's algorithm"
                          value={learningObjective}
                          onChange={(e) => setLearningObjective(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Difficulty */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Difficulty
                        <span
                          className={`text-xs font-semibold ${difficultyColor}`}
                        >
                          {difficultyLabel}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <Slider
                        value={difficulty}
                        onValueChange={(value) =>
                          setDifficulty([snapDifficulty(value[0] ?? 0.5)])
                        }
                        min={0.3}
                        max={0.7}
                        step={0.2}
                        className="py-1"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Easy</span>
                        <span>Medium</span>
                        <span>Hard</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-4">
                      <CardTitle className="text-sm">Tags</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Add a tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addTag())
                          }
                          className="flex-1 text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={addTag}
                          size="sm"
                          className="text-sm"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {t}
                            <button
                              onClick={() => removeTag(t)}
                              className="ml-0.5 hover:text-destructive"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {tags.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No tags added yet
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* end metadata sidebar */}
              </div>
              {/* end grid */}
            </TabsContent>

            {/* === PREVIEW TAB === */}
            <TabsContent value="preview">
              <Card>
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm sm:text-base">
                      Question Preview
                    </CardTitle>
                    <StatusBadge
                      variant={
                        difficulty[0] <= 0.3
                          ? "success"
                          : difficulty[0] <= 0.5
                            ? "warning"
                            : "destructive"
                      }
                      className="text-[10px] sm:text-xs"
                    >
                      {difficultyLabel}
                    </StatusBadge>
                    <StatusBadge
                      variant="info"
                      className="text-[10px] sm:text-xs"
                    >
                      {questionType.replace("_", " ")}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  {!content ? (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                      Enter question content to see preview
                    </p>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <p className="text-sm sm:text-base font-medium leading-relaxed">
                        {content}
                      </p>
                      <Separator />

                      {(questionType === "multiple_choice" ||
                        questionType === "single_choice" ||
                        questionType === "ordering" ||
                        questionType === "matching") && (
                        <div className="space-y-2">
                          {options.map((opt, idx) => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border text-sm ${
                                opt.isCorrect &&
                                (questionType === "multiple_choice" ||
                                  questionType === "single_choice")
                                  ? "border-green-500 bg-green-50"
                                  : "border-muted"
                              }`}
                            >
                              <span className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                                {questionType === "ordering" ? idx + 1 : opt.id}
                              </span>
                              <span className="text-xs sm:text-sm flex-1 min-w-0 break-words">
                                {opt.text || "(empty)"}
                              </span>
                              {questionType === "matching" && (
                                <>
                                  <span className="text-muted-foreground text-sm flex-shrink-0">
                                    →
                                  </span>
                                  <span className="text-xs sm:text-sm font-medium text-primary">
                                    Match
                                  </span>
                                </>
                              )}
                              {opt.isCorrect &&
                                (questionType === "multiple_choice" ||
                                  questionType === "single_choice") && (
                                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 ml-auto flex-shrink-0" />
                                )}
                            </div>
                          ))}
                        </div>
                      )}

                      {questionType === "fill_blank" && (
                        <div className="p-4 rounded-lg bg-secondary/10 border border-dashed text-center">
                          <p className="text-sm text-muted-foreground">
                            Fill in the blank preview will appear here
                          </p>
                        </div>
                      )}

                      {questionType === "find_error" && (
                        <div className="p-4 rounded-lg bg-secondary/10 border border-dashed text-center">
                          <p className="text-sm text-muted-foreground">
                            Find the error code block preview will appear here
                          </p>
                        </div>
                      )}

                      {questionType === "true_false" && (
                        <div className="flex gap-2 sm:gap-4">
                          <div
                            className={`flex-1 p-2 sm:p-3 rounded-lg border text-center text-xs sm:text-sm ${tfAnswer === "true" ? "border-green-500 bg-green-50 text-green-700 font-medium" : "border-muted text-muted-foreground"}`}
                          >
                            True
                          </div>
                          <div
                            className={`flex-1 p-2 sm:p-3 rounded-lg border text-center text-xs sm:text-sm ${tfAnswer === "false" ? "border-green-500 bg-green-50 text-green-700 font-medium" : "border-muted text-muted-foreground"}`}
                          >
                            False
                          </div>
                        </div>
                      )}

                      {questionType === "essay" && (
                        <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                            Rubric
                          </p>
                          <p className="text-xs sm:text-sm">
                            {essayRubric || "(no rubric)"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                            Max Score: {essayMaxScore}
                          </p>
                        </div>
                      )}

                      {explanation && (
                        <>
                          <Separator />
                          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                            <p className="text-[10px] sm:text-xs font-medium text-blue-700 mb-1">
                              Explanation
                            </p>
                            <p className="text-xs sm:text-sm text-blue-600 leading-relaxed">
                              {explanation}
                            </p>
                          </div>
                        </>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-2">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs bg-muted text-muted-foreground"
                            >
                              <Tag className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
