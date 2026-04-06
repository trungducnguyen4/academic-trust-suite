import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import api, { unwrapPaginatedData } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BookOpen,
  Clock,
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
} from 'lucide-react';

// ─── Steps ───────────────────────────────────────────────────────
type Step = 'info' | 'settings' | 'questions' | 'preview';
const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'info',      label: 'Basic Info',   icon: <FileText className="h-4 w-4" /> },
  { key: 'settings',  label: 'Settings',     icon: <Settings className="h-4 w-4" /> },
  { key: 'questions', label: 'Questions',    icon: <BookOpen className="h-4 w-4" /> },
  { key: 'preview',   label: 'Preview',      icon: <Eye className="h-4 w-4" /> },
];

interface ExamForm {
  title: string;
  course: string;
  description: string;
  duration: string;
  maxAttempts: string;
  passingScore: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  requiresProctoring: boolean;
  requiresDownload: boolean;
  shuffleQuestions: boolean;
  showResultImmediately: boolean;
  questionType: string;
  bankDifficulty: string;
  questionCount: string;
  sourceMethod: 'bank' | 'import' | 'ai';
  aiGenerationMode: boolean;
  aiPrompt: string;
  aiDifficulty: string;
  aiReviewRequired: boolean;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const toTimeInputValue = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

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
    title: '',
    course: '',
    description: '',
    duration: '60',
    maxAttempts: '1',
    passingScore: '50',
    startDate: examWindow.startDate,
    startTime: examWindow.startTime,
    endDate: examWindow.endDate,
    endTime: examWindow.endTime,
    requiresProctoring: true,
    requiresDownload: false,
    shuffleQuestions: true,
    showResultImmediately: false,
    questionType: 'mixed',
    bankDifficulty: 'mixed',
    questionCount: '20',
    sourceMethod: 'bank',
    aiGenerationMode: false,
    aiPrompt: '',
    aiDifficulty: 'medium',
    aiReviewRequired: true,
  };
};

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

const QUESTION_TYPE_OPTIONS = [
  { value: 'mixed', label: 'Mixed (all types)' },
  { value: 'single-choice', label: 'Single Choice only' },
  { value: 'multiple-choice', label: 'Multiple Choice only' },
  { value: 'true-false', label: 'True / False only' },
  { value: 'fill-blank', label: 'Fill in the Blank only' },
  { value: 'matching', label: 'Matching only' },
  { value: 'ordering', label: 'Ordering only' },
  { value: 'short-answer', label: 'Short Answer / Essay only' },
  { value: 'custom', label: 'Custom Selection (Other)' },
] as const;

const difficultyOptionToValue = (option: string): number => {
  if (option === 'easy') return 0.3;
  if (option === 'hard') return 0.7;
  return 0.5;
};

const difficultyOptionToBankValue = (option: string): string => {
  if (option === 'mixed') return 'mixed';
  return String(difficultyOptionToValue(option));
};

const difficultyLabelFromValue = (value: unknown): 'Easy' | 'Medium' | 'Hard' => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Medium';
  if (n <= 0.3) return 'Easy';
  if (n <= 0.5) return 'Medium';
  return 'Hard';
};

const mapQuestionTypeToAiApi = (value: string) => {
  const map: Record<string, string> = {
    mixed: 'MIXED',
    custom: 'MIXED',
    'single-choice': 'MULTIPLE_CHOICE',
    'multiple-choice': 'MULTIPLE_CHOICE',
    'true-false': 'TRUE_FALSE',
    'fill-blank': 'FILL_IN_BLANK',
    matching: 'MATCHING',
    ordering: 'ORDERING',
    'short-answer': 'SHORT_ANSWER',
  };
  return map[value] || 'MIXED';
};

const mapQuestionTypeToDb = (value: string) => {
  const map: Record<string, string> = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    MULTI_SELECT: 'MULTI_SELECT',
    TRUE_FALSE: 'TRUE_FALSE',
    SHORT_ANSWER: 'SHORT_ANSWER',
    ESSAY: 'ESSAY',
    FILL_IN_BLANK: 'FILL_IN_BLANK',
    MATCHING: 'MATCHING',
    ORDERING: 'ORDERING',
    'single-choice': 'MULTIPLE_CHOICE',
    'multiple-choice': 'MULTIPLE_CHOICE',
    'true-false': 'TRUE_FALSE',
    'short-answer': 'SHORT_ANSWER',
    'fill-blank': 'FILL_IN_BLANK',
    mixed: 'MULTIPLE_CHOICE',
    custom: 'MULTIPLE_CHOICE',
  };

  const normalized = String(value || '').trim();
  return map[normalized] || map[normalized.toUpperCase()] || 'MULTIPLE_CHOICE';
};

const normalizeDifficultyForQuestion = (value: unknown) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 5;
  if (n <= 1) return Math.max(1, Math.min(10, Math.round(n * 9 + 1)));
  return Math.max(1, Math.min(10, Math.round(n)));
};

export default function CreateExam() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('info');
  const [form, setForm] = useState<ExamForm>(() => createDefaultForm());
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  const set = (key: keyof ExamForm, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = unwrapPaginatedData(await api.getCourses());
        setCourses(data.map((course: any) => ({
          id: course.id,
          code: course.code,
          name: course.name,
        })));
      } catch (error) {
        console.error('Failed to load courses for exam creation:', error);
      }
    };

    loadCourses();
  }, []);

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canNext = (): boolean => {
    if (step === 'info') return form.title.trim() !== '' && form.course !== '';
    if (step === 'settings') return form.duration !== '' && form.startDate !== '' && form.endDate !== '';
    return true;
  };

  const handleCreate = async () => {
    const startTime = form.startDate
      ? new Date(`${form.startDate}T${form.startTime || '00:00'}`).toISOString()
      : undefined;
    const endTime = form.endDate
      ? new Date(`${form.endDate}T${form.endTime || '23:59'}`).toISOString()
      : undefined;

    try {
      setIsCreating(true);
      let questionIds: string[] | undefined;

      if (form.sourceMethod === 'ai' || form.sourceMethod === 'import') {
        if (aiGeneratedQuestions.length === 0) {
          throw new Error('Please extract/generate questions before creating the exam.');
        }

        const createdQuestions = await Promise.all(
          aiGeneratedQuestions.map((q) =>
            api.createQuestion({
              type: mapQuestionTypeToDb(q.type),
              content: q.content,
              options: q.options || undefined,
              correctAnswer: q.correctAnswer || undefined,
              explanation: q.explanation || undefined,
              difficulty: normalizeDifficultyForQuestion(q.difficulty),
              points: Math.max(1, Number(q.points) || 1),
              tags: Array.isArray(q.tags) ? q.tags : [],
              courseId: form.course,
            }),
          ),
        );

        questionIds = createdQuestions.map((item: any) => item.id).filter(Boolean);
      }

      await api.createExam({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        courseId: form.course,
        duration: Number(form.duration),
        passingScore: Number(form.passingScore),
        startTime,
        endTime,
        questionIds,
        settings: {
          maxAttempts: Number(form.maxAttempts || 1),
          requiresProctoring: form.requiresProctoring,
          requiresDownload: form.requiresDownload,
          shuffleQuestions: form.shuffleQuestions,
          showResultImmediately: form.showResultImmediately,
          sourceMethod: form.sourceMethod,
          questionType: form.questionType,
          bankDifficulty: difficultyOptionToBankValue(form.bankDifficulty),
          requestedQuestionCount: Number(form.questionCount || 0),
          aiGenerationMode: form.aiGenerationMode,
          aiPrompt: form.aiPrompt || undefined,
          aiDifficulty: difficultyOptionToValue(form.aiDifficulty),
          aiReviewRequired: form.aiReviewRequired,
        },
      });

      setCreated(true);
    } catch (error: any) {
      console.error('Failed to create exam:', error);
      alert(error.message || 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!form.aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const result = await api.aiGenerateExamQuestions({
        prompt: form.aiPrompt,
        questionCount: parseInt(form.questionCount) || 20,
        difficulty: difficultyOptionToValue(form.aiDifficulty),
        questionType: mapQuestionTypeToAiApi(form.questionType),
        language: 'en',
        courseName: courses.find((course) => course.id === form.course)?.name,
        useCase: 'exam',
      });
      setAiGeneratedQuestions(result.questions);
      alert(`Successfully generated ${result.questions.length} questions! Review them in the preview step.`);
    } catch (error: any) {
      console.error('AI generation failed:', error);
      alert('AI generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleImportExtract = async () => {
    if (!docFile) {
      alert('Please choose a document first.');
      return;
    }

    const fileName = docFile.name.toLowerCase();
    const isTextLike = /\.(txt|md|csv|json)$/i.test(fileName);
    const isDocx = /\.docx$/i.test(fileName);
    const isDoc = /\.doc$/i.test(fileName);

    try {
      setIsStandardizing(true);

      let rawText = '';

      if (isTextLike) {
        rawText = await docFile.text();
      } else if (isDocx) {
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await docFile.arrayBuffer();
        const extracted = await mammoth.extractRawText({ arrayBuffer });
        rawText = extracted.value || '';
      } else if (isDoc) {
        throw new Error('Legacy .doc is not supported yet. Please save as .docx and try again.');
      } else {
        throw new Error('Unsupported file type. Please use .txt, .md, .csv, .json, or .docx.');
      }

      const normalized = rawText.replace(/\s+/g, ' ').trim();

      if (!normalized) {
        throw new Error('The selected file is empty.');
      }

      const prompt = [
        `Extract key concepts from the following course material and generate exam questions.`,
        `Document: ${docFile.name}`,
        `Material:`,
        normalized.slice(0, 8000),
      ].join('\n\n');

      const result = await api.aiGenerateExamQuestions({
        prompt,
        questionCount: parseInt(form.questionCount) || 20,
        difficulty: difficultyOptionToValue(form.aiDifficulty),
        questionType: mapQuestionTypeToAiApi(form.questionType),
        language: 'en',
        courseName: courses.find((course) => course.id === form.course)?.name,
        useCase: 'exam',
      });

      setAiGeneratedQuestions(result.questions || []);
      alert(`Extracted and generated ${result.questions?.length || 0} questions from document.`);
    } catch (error: any) {
      console.error('Import extraction failed:', error);
      alert('AI extract failed: ' + (error.message || 'Unknown error'));
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
              <strong>"{form.title}"</strong> has been saved and is ready to be configured.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/lecturer/exams')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/lecturer/exams')}>
              <Plus className="h-4 w-4 mr-2" /> Add Questions
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
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
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  active ? 'bg-primary text-primary-foreground border-primary'
                  : done  ? 'bg-green-100 text-green-700 border-green-200'
                  :         'bg-secondary text-muted-foreground border-border'
                }`}>
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
          {step === 'info' && (
            <>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the exam title, course, and a brief description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Exam Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g. Midterm Exam – Database Systems"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="course">Course <span className="text-red-500">*</span></Label>
                  <Select value={form.course} onValueChange={(v) => set('course', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a course…" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Briefly describe the scope and objectives of this exam…"
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 'settings' && (
            <>
              <CardHeader>
                <CardTitle>Exam Settings</CardTitle>
                <CardDescription>Configure timing, scoring, and access control.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={form.duration}
                      onChange={(e) => set('duration', e.target.value)}
                      min={5}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Passing Score (%)</Label>
                    <Input
                      type="number"
                      value={form.passingScore}
                      onChange={(e) => set('passingScore', e.target.value)}
                      min={0} max={100}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Exam Window</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>End Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="mt-1" />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium">Options</p>
                <div className="space-y-4">
                  {([
                    { key: 'requiresProctoring',      label: 'Enable AI Proctoring',         desc: 'Monitor student activity during the exam', icon: <Shield className="h-4 w-4 text-primary" /> },
                    { key: 'requiresDownload',         label: 'Require Offline Download',     desc: 'Students must download the exam package first', icon: <Clock className="h-4 w-4 text-primary" /> },
                    { key: 'shuffleQuestions',         label: 'Shuffle Questions',            desc: 'Randomize question order for each student', icon: <Users className="h-4 w-4 text-primary" /> },
                    { key: 'showResultImmediately',    label: 'Show Results Immediately',     desc: 'Students see scores right after submission', icon: <Eye className="h-4 w-4 text-primary" /> },
                  ] as const).map(({ key, label, desc, icon }) => (
                    <div key={key} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {icon}
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={form[key] as boolean}
                        onCheckedChange={(v) => set(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {step === 'questions' && (
            <>
              <CardHeader>
                <CardTitle>Question Sourcing</CardTitle>
                <CardDescription>Select one primary method to source questions for this exam.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={form.sourceMethod} onValueChange={(v) => set('sourceMethod', v as any)}>
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
                  <TabsContent value="bank" className="space-y-5 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Number of Questions</Label>
                        <Input
                          type="number"
                          value={form.questionCount}
                          onChange={(e) => set('questionCount', e.target.value)}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Question Type Mix</Label>
                        <Select value={form.questionType} onValueChange={(v) => set('questionType', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select value={form.bankDifficulty} onValueChange={(v) => set('bankDifficulty', v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mixed">Mixed (all levels)</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {form.questionType === 'custom' && (
                      <div className="p-4 border rounded-lg bg-secondary/10 space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select Types to Include</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {['Single Choice', 'Multiple Choice', 'True / False', 'Fill in the Blank', 'Matching', 'Ordering', 'Essay'].map((t) => (
                            <label key={t} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-card cursor-pointer">
                              <input type="checkbox" defaultChecked className="accent-primary" />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm font-medium text-muted-foreground pt-2">Topics to include</p>
                    <div className="space-y-2">
                      {[
                        { topic: 'Relational Algebra',     count: 24, selected: true  },
                        { topic: 'SQL Queries',            count: 38, selected: true  },
                        { topic: 'Normalization',          count: 17, selected: false },
                        { topic: 'Transaction Management', count: 12, selected: true  },
                      ].map((bank) => (
                        <label key={bank.topic} className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all
                          ${bank.selected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <input type="checkbox" defaultChecked={bank.selected} className="accent-primary" />
                          <span className="flex-1 text-sm">{bank.topic}</span>
                          <Badge variant="secondary">{bank.count} questions</Badge>
                        </label>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/lecturer/question-bank')}>
                      <Plus className="h-4 w-4" /> Go to Question Bank
                    </Button>
                  </TabsContent>

                  {/* --- TAB: IMPORT DOC --- */}
                  <TabsContent value="import" className="space-y-5 animate-in fade-in duration-300">
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
                            <p className="font-bold text-lg">Upload your document</p>
                            <p className="text-sm text-muted-foreground max-w-xs">AI will extract questions from your Word, PDF, or Plain Text files.</p>
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
                                <p className="font-bold text-base text-blue-700">{docFile.name}</p>
                                <p className="text-xs text-blue-600 opacity-80">Selected file • {formatFileSize(docFile.size)}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDocFile(null);
                                if (docFileInputRef.current) docFileInputRef.current.value = '';
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
                            {isStandardizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
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
                            <div key={i} className="text-xs bg-white p-2 rounded border">
                              <span className="font-medium text-muted-foreground">Q{i+1}.</span>{' '}
                              <span className="line-clamp-2">{q.content}</span>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] h-4">{q.type}</Badge>
                                <Badge variant="outline" className="text-[10px] h-4">Difficulty: {difficultyLabelFromValue(q.difficulty)}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* --- TAB: AI GENERATION --- */}
                  <TabsContent value="ai" className="space-y-5 animate-in fade-in duration-300">
                    <div className="p-6 border-2 border-primary/20 rounded-xl bg-primary/5 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="ai-prompt" className="text-base font-bold">What is the focus of this exam?</Label>
                        <Textarea
                          id="ai-prompt"
                          placeholder="Example: Midterm for Computer Networks. Focus on OSI layers, TCP/UDP differences, and subnetting."
                          value={form.aiPrompt}
                          onChange={(e) => set('aiPrompt', e.target.value)}
                          rows={4}
                          className="bg-background text-base"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Question Count</Label>
                          <Input type="number" value={form.questionCount} onChange={(e) => set('questionCount', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Question Type Mix</Label>
                          <Select value={form.questionType} onValueChange={(v) => set('questionType', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPE_OPTIONS
                                .filter((type) => type.value !== 'custom')
                                .map((type) => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Difficulty</Label>
                          <Select value={form.aiDifficulty} onValueChange={(v) => set('aiDifficulty', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <p className="text-sm font-bold text-amber-900">Mandatory Teacher Review</p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Questions generated by AI will be placed in a pending state until you approve each one for accuracy and integrity.
                          </p>
                        </div>
                      </div>

                      <Button 
                        className="w-full py-6 text-base gap-2 shadow-lg shadow-primary/20"
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !form.aiPrompt.trim()}
                      >
                        {isAiGenerating ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> Generating Questions...</>
                        ) : (
                          <><Sparkles className="h-5 w-5" /> Generate Complete Exam</>
                        )}
                      </Button>

                      {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">
                            ✓ {aiGeneratedQuestions.length} questions generated
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {aiGeneratedQuestions.map((q, i) => (
                              <div key={i} className="text-xs bg-white p-2 rounded border">
                                <span className="font-medium text-muted-foreground">Q{i+1}.</span>{' '}
                                <span className="line-clamp-2">{q.content}</span>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-4">{q.type}</Badge>
                                  <Badge variant="outline" className="text-[10px] h-4">Difficulty: {difficultyLabelFromValue(q.difficulty)}</Badge>
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

          {step === 'preview' && (
            <>
              <CardHeader>
                <CardTitle>Exam Preview</CardTitle>
                <CardDescription>Review all settings before creating the exam.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { label: 'Title',           value: form.title || '—' },
                  { label: 'Course',          value: courses.find((course) => course.id === form.course)?.code ? `${courses.find((course) => course.id === form.course)?.code} - ${courses.find((course) => course.id === form.course)?.name}` : '—' },
                  { label: 'Description',     value: form.description || '—' },
                  { label: 'Duration',        value: `${form.duration} minutes` },
                  { label: 'Passing Score',   value: `${form.passingScore}%` },
                  { label: 'Exam Window',     value: `${form.startDate} ${form.startTime} → ${form.endDate} ${form.endTime}` },
                  { label: 'Questions',       value: `${form.questionCount} (${form.questionType})` },
                  { label: 'AI Proctoring',   value: form.requiresProctoring ? 'Enabled' : 'Disabled' },
                  { label: 'Offline Download',value: form.requiresDownload ? 'Required' : 'Not required' },
                  { label: 'Shuffle',         value: form.shuffleQuestions ? 'Yes' : 'No' },
                  { label: 'Show Results',    value: form.showResultImmediately ? 'Immediately' : 'After review' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-muted-foreground w-36 shrink-0">{label}</span>
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
              if (stepIdx === 0) navigate('/lecturer/exams');
              else setStep(STEPS[stepIdx - 1].key);
            }}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {stepIdx === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step !== 'preview' ? (
            <Button
              onClick={() => setStep(STEPS[stepIdx + 1].key)}
              disabled={!canNext()}
              className="gap-2"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
              {isCreating ? 'Creating…' : <><CheckCircle2 className="h-4 w-4" /> Create Exam</>}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
