import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, unwrapPaginatedData } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
} from 'lucide-react';

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
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('id');
  const courseCodeParam = searchParams.get('courseCode');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [tab, setTab] = useState('edit');
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);

  // Question form state
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [multipleAnswers, setMultipleAnswers] = useState(false);
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState([0.5]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'audio'>('image');
  const [learningObjective, setLearningObjective] = useState('');

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Multiple choice options
  const [options, setOptions] = useState<Option[]>([
    { id: 'A', text: '', isCorrect: true },
    { id: 'B', text: '', isCorrect: false },
    { id: 'C', text: '', isCorrect: false },
    { id: 'D', text: '', isCorrect: false },
  ]);

  // True/False answer
  const [tfAnswer, setTfAnswer] = useState<'true' | 'false'>('true');

  // Essay rubric
  const [essayRubric, setEssayRubric] = useState('');
  const [essayMaxScore, setEssayMaxScore] = useState(10);

  // Load courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = unwrapPaginatedData(await api.getCourses());
        const mapped = data.map((c: any) => ({ id: c.id, code: c.code, name: c.name }));
        setCourses(mapped);
        // Pre-select course from URL param
        if (courseCodeParam && !course) {
          const found = mapped.find((c: any) => c.code === courseCodeParam);
          if (found) setCourse(found.id);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
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
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (questionData: Question) => {
    // Map backend question type to frontend format
    const typeMapping: { [key: string]: string } = {
      'MULTIPLE_CHOICE': 'multiple_choice',
      'MULTI_SELECT': 'multiple_choice', 
      'SINGLE_CHOICE': 'single_choice',
      'TRUE_FALSE': 'true_false',
      'SHORT_ANSWER': 'essay',
      'ESSAY': 'essay',
      'FILL_IN_BLANK': 'fill_blank',
      'MATCHING': 'matching',
      'ORDERING': 'ordering'
    };
    
    const frontendType = typeMapping[questionData.type] || questionData.type.toLowerCase();
    setQuestionType(frontendType);
    
    setContent(questionData.content);
    setExplanation(questionData.explanation || '');
    setCourse(questionData.course?.id || '');
    setDifficulty([questionData.difficulty]);
    
    // Parse tags
    if (questionData.tags) {
      try {
        const tagsArray = Array.isArray(questionData.tags) ? questionData.tags : 
                         typeof questionData.tags === 'string' ? 
                         questionData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        setTags(tagsArray);
      } catch {
        setTags([]);
      }
    }
    
    // Handle different question types
    if (questionData.type === 'MULTIPLE_CHOICE' || questionData.type === 'MULTI_SELECT' || questionData.type === 'SINGLE_CHOICE') {
      console.log('Question options from backend:', questionData.options);
      console.log('Question correctAnswer from backend:', questionData.correctAnswer);
      
      if (questionData.options) {
        let formattedOptions: { id: string; text: string; isCorrect: boolean }[] = [];
        
        if (Array.isArray(questionData.options)) {
          // Handle array format: ["Stack", "Queue", "Array", "List"]
          formattedOptions = questionData.options.map((opt: any, index: number) => ({
            id: String.fromCharCode(65 + index),
            text: opt.text || opt,
            isCorrect: false // Will set correct answers below
          }));
        } else if (typeof questionData.options === 'object') {
          // Handle object format: {A: "Stack", B: "Queue", C: "Array", D: "List"}
          formattedOptions = Object.entries(questionData.options).map(([key, value]) => ({
            id: key,
            text: value as string,
            isCorrect: false // Will set correct answers below
          }));
        }
        
        // Set correct answers
        if (questionData.correctAnswer) {
          console.log('Processing correctAnswer:', questionData.correctAnswer);
          
          if (typeof questionData.correctAnswer === 'object') {
            if ('answer' in questionData.correctAnswer) {
              // Format: {answer: "B"} - mark that option as correct
              const correctId = questionData.correctAnswer.answer;
              const optionIndex = formattedOptions.findIndex(opt => opt.id === correctId);
              if (optionIndex !== -1) {
                formattedOptions[optionIndex].isCorrect = true;
              }
            } else {
              // Handle other object formats if needed
              Object.keys(questionData.correctAnswer).forEach(correctKey => {
                const optionIndex = formattedOptions.findIndex(opt => opt.id === correctKey);
                if (optionIndex !== -1) {
                  formattedOptions[optionIndex].isCorrect = true;
                }
              });
            }
          } else if (typeof questionData.correctAnswer === 'number') {
            // Handle index format
            if (formattedOptions[questionData.correctAnswer]) {
              formattedOptions[questionData.correctAnswer].isCorrect = true;
            }
          }
        }
        
        setOptions(formattedOptions);
      }
      setMultipleAnswers(questionData.type === 'MULTI_SELECT');
    } else if (questionData.type === 'TRUE_FALSE') {
      console.log('True/False correctAnswer from backend:', questionData.correctAnswer);
      
      if (questionData.correctAnswer && typeof questionData.correctAnswer === 'object' && 'answer' in questionData.correctAnswer) {
        setTfAnswer(questionData.correctAnswer.answer === true ? 'true' : 'false');
      } else {
        // Fallback for other formats
        setTfAnswer(questionData.correctAnswer ? 'true' : 'false');
      }
    }
    
    setLearningObjective(questionData.learningObjectives || '');
  };

  const addOption = () => {
    const nextId = String.fromCharCode(65 + options.length);
    setOptions([...options, { id: nextId, text: '', isCorrect: false }]);
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
      setOptions(options.map((o) => (o.id === id ? { ...o, isCorrect: !o.isCorrect } : o)));
    } else {
      setOptions(options.map((o) => ({ ...o, isCorrect: o.id === id })));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

  const handleSave = async () => {
    let questionData;
    try {
      setSaving(true);
      
      // Map frontend question type back to backend format
      const backendTypeMapping: { [key: string]: string } = {
        'multiple_choice': 'MULTIPLE_CHOICE',
        'single_choice': 'SINGLE_CHOICE', 
        'true_false': 'TRUE_FALSE',
        'essay': 'ESSAY',
        'fill_blank': 'FILL_IN_BLANK',
        'matching': 'MATCHING',
        'ordering': 'ORDERING'
      };
      
      const backendType = backendTypeMapping[questionType] || questionType.toUpperCase();
      
      questionData = {
        type: backendType,
        content,
        explanation,
        difficulty: difficulty[0],
        points: 10, // Default points
        tags: tags, // Backend expects array
        courseId: course || undefined,
        options: questionType === 'multiple_choice' || questionType === 'single_choice' 
          ? options.filter(opt => opt.text.trim()).reduce((acc, opt, idx) => {
              acc[opt.id] = opt.text;
              return acc;
            }, {} as any) // Send as object {A: "text", B: "text"}
          : {},
        correctAnswer: questionType === 'single_choice' 
          ? { answer: options.find(opt => opt.isCorrect)?.id || 'A' } // Format: {answer: "B"}
          : questionType === 'multiple_choice'
          ? { answer: options.filter(opt => opt.isCorrect).map(opt => opt.id).join(',') } // Format: {answer: "A,C"}
          : questionType === 'true_false'
          ? { answer: tfAnswer === 'true' }
          : {}
      };
      
      if (questionId) {
        // Update existing question
        console.log('Updating question with data:', questionData);
        await api.updateQuestion(questionId, questionData);
      } else {
        // Create new question
        console.log('Creating question with data:', questionData);
        await api.createQuestion(questionData);
      }
      
      navigate('/lecturer/question-bank');
    } catch (error) {
      console.error('Failed to save question:', error);
      console.error('Question data that failed:', questionData);
      // Show user-friendly error message
      alert('Failed to save question. Please check the console for details.');
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
        'multiple_choice': 'MULTIPLE_CHOICE',
        'single_choice': 'MULTIPLE_CHOICE',
        'true_false': 'TRUE_FALSE',
        'essay': 'ESSAY',
        'fill_blank': 'FILL_IN_BLANK',
        'matching': 'MATCHING',
        'ordering': 'ORDERING',
      };

      const result = await api.aiGenerateQuestion({
        prompt: aiPrompt,
        questionType: backendTypeMap[questionType] || 'MULTIPLE_CHOICE',
        difficulty: Math.max(0, Math.min(1, difficulty[0])),
      });

      // Fill in the form with AI-generated content
      setContent(result.content);
      if (result.explanation) setExplanation(result.explanation);
      if (result.tags && result.tags.length > 0) setTags(result.tags);
      if (result.difficulty !== undefined && result.difficulty !== null) setDifficulty([Math.max(0, Math.min(1, result.difficulty))]);

      // Fill in options if it's a choice-based question
      if (result.options && (questionType === 'multiple_choice' || questionType === 'single_choice' || questionType === 'true_false')) {
        const newOptions = Object.entries(result.options).map(([key, text]) => ({
          id: key,
          text: text as string,
          isCorrect: result.correctAnswer?.answer === key,
        }));
        if (newOptions.length > 0) setOptions(newOptions);
      }

      setAiPrompt('');
    } catch (error: any) {
      console.error('AI generation failed:', error);
      alert('AI generation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyLabel = difficulty[0] < 0.4 ? 'Easy' : difficulty[0] < 0.7 ? 'Medium' : 'Hard';
  const difficultyColor = difficulty[0] < 0.4 ? 'text-green-600' : difficulty[0] < 0.7 ? 'text-yellow-600' : 'text-red-600';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/lecturer/question-bank')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Question Bank
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {loading ? 'Loading Question...' : questionId ? 'Edit Question' : 'New Question'}
            </h1>
            <p className="text-muted-foreground">
              {(() => {
                const currentCourse = courses.find(c => c.id === course);
                if (currentCourse) return <span>Course: <span className="font-semibold text-foreground">{currentCourse.code} — {currentCourse.name}</span></span>;
                if (courseCodeParam) return <span>Course: <span className="font-semibold text-foreground">{courseCodeParam}</span></span>;
                return questionId ? 'Edit an existing question with metadata and options' : 'Create a question with metadata and options';
              })()}
            </p>
          </div>
          <div className="flex gap-2">
            {!loading && (
              <>
                <Button variant="outline" onClick={() => setTab('preview')} className="gap-2">
                  <Eye className="h-4 w-4" /> Preview
                </Button>
                <Button onClick={handleSave} disabled={saving || !content} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Question
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading question data...</span>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* === EDIT TAB === */}
          <TabsContent value="edit" className="space-y-6">
            {/* AI Generator Section */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold text-primary">AI Question Assistant</CardTitle>
                </div>
                <CardDescription>Generate question content and options using generative AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Distributed system consensus algorithms, Raft vs Paxos..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                  />
                  <Button 
                    onClick={handleAiGenerate} 
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="gap-2"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generate
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic px-1">
                  * Generated content will overwrite current question text and options.
                </p>
              </CardContent>
            </Card>

            {/* Question Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Question Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={questionType} 
                  onValueChange={(val) => {
                    setQuestionType(val);
                    if (val === 'single_choice') {
                      setMultipleAnswers(false);
                      // Keep only the first correct option if switching to single choice
                      const firstCorrectIndex = options.findIndex(o => o.isCorrect);
                      setOptions(options.map((o, idx) => ({
                        ...o,
                        isCorrect: idx === (firstCorrectIndex !== -1 ? firstCorrectIndex : 0)
                      })));
                    } else if (val === 'multiple_choice') {
                      setMultipleAnswers(true);
                    }
                  }}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                    <SelectItem value="matching">Matching</SelectItem>
                    <SelectItem value="find_error">Find the Error</SelectItem>
                    <SelectItem value="ordering">Ordering / Sequencing</SelectItem>
                    <SelectItem value="essay">Short Answer / Essay</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Question Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Question Content</CardTitle>
                <CardDescription>Enter your question text and answer options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(questionType === 'multiple_choice' || questionType === 'single_choice') && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      💡 How to select correct answers:
                    </p>
                    <p className="text-xs text-blue-700">
                      {questionType === 'multiple_choice' ? 
                        'Click the circles (A, B, C, D) to mark multiple correct answers' :
                        'Click the circles (A, B, C, D) to select the single correct answer'
                      }
                    </p>
                  </div>
                )}
                {questionType === 'true_false' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-1">
                      💡 How to select correct answer:
                    </p>
                    <p className="text-xs text-green-700">
                      Click either "True" or "False" button below to set the correct answer
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="content">Question Text</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter your question here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasMedia} onCheckedChange={setHasMedia} />
                    <Label>Include media</Label>
                  </div>
                  {hasMedia && (
                    <div className="flex gap-2">
                      <Button
                        variant={mediaType === 'image' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMediaType('image')}
                        className="gap-1"
                      >
                        <Image className="h-3.5 w-3.5" /> Image
                      </Button>
                      <Button
                        variant={mediaType === 'audio' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMediaType('audio')}
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
                      Drag & drop {mediaType === 'image' ? 'an image' : 'an audio file'} here, or click to browse
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">Choose File</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Options */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {(questionType === 'multiple_choice' || questionType === 'single_choice') && 'Answer Options'}
                    {questionType === 'true_false' && 'Correct Answer'}
                    {questionType === 'essay' && 'Grading Rubric'}
                    {questionType === 'fill_blank' && 'Blank Configurations'}
                    {questionType === 'matching' && 'Matching Pairs'}
                    {questionType === 'find_error' && 'Code Segments'}
                    {questionType === 'ordering' && 'Sequence Items'}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    {(questionType === 'multiple_choice' || questionType === 'single_choice' || questionType === 'ordering' || questionType === 'matching') && options.length < 8 && (
                      <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add Item
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(questionType === 'multiple_choice' || questionType === 'single_choice' || questionType === 'ordering' || questionType === 'matching') && options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    {(questionType === 'multiple_choice' || questionType === 'single_choice') && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setCorrectOption(opt.id)}
                              className={`flex items-center justify-center h-8 w-8 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                                opt.isCorrect
                                  ? 'border-green-500 bg-green-100 text-green-700 shadow-lg scale-110'
                                  : 'border-gray-300 hover:border-green-400 text-muted-foreground hover:bg-green-50 hover:scale-105'
                              }`}
                              title={opt.isCorrect ? 'Correct answer' : 'Click to mark as correct'}
                            >
                              {opt.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : opt.id}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{opt.isCorrect ? '✅ Correct answer' : '⭕ Click to mark as correct'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {questionType === 'ordering' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                    )}
                    <Input
                      placeholder={questionType === 'matching' ? "Concept..." : `Option ${opt.id}`}
                      value={opt.text}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      className="flex-1"
                    />
                    {questionType === 'matching' && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <Input
                          placeholder="Match Result..."
                          className="flex-1"
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

                {questionType === 'true_false' && (
                  <div className="flex gap-4">
                    <Button
                      variant={tfAnswer === 'true' ? 'default' : 'outline'}
                      onClick={() => setTfAnswer('true')}
                      className={`flex-1 ${tfAnswer === 'true' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 hover:border-green-500 hover:bg-green-50'}`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> True
                    </Button>
                    <Button
                      variant={tfAnswer === 'false' ? 'default' : 'outline'}
                      onClick={() => setTfAnswer('false')}
                      className={`flex-1 ${tfAnswer === 'false' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 hover:border-green-500 hover:bg-green-50'}`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> False
                    </Button>
                  </div>
                )}

                {questionType === 'fill_blank' && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground mb-2 italic">
                        Tip: Use double brackets like [[answer]] in the question text above to create blanks.
                      </p>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Add Blank Manually
                      </Button>
                    </div>
                  </div>
                )}

                {questionType === 'find_error' && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-secondary/20 font-mono text-sm">
                      <p className="text-muted-foreground mb-2">Select the line or phrase that contains the error.</p>
                      <div className="p-3 bg-card border rounded space-y-1">
                        <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">1. function calculate(a, b) {'{'} </div>
                        <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">2.   return a + c; // Click to mark as error </div>
                        <div className="hover:bg-destructive/10 p-1 cursor-pointer rounded">3. {'}'} </div>
                      </div>
                    </div>
                  </div>
                )}

                {questionType === 'essay' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rubric / Grading Criteria</Label>
                      <Textarea
                        placeholder="Describe grading criteria, expected key points..."
                        value={essayRubric}
                        onChange={(e) => setEssayRubric(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Score</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={essayMaxScore}
                        onChange={(e) => setEssayMaxScore(Number(e.target.value))}
                        className="w-24"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Explanation (optional)</CardTitle>
                <CardDescription>Shown to students after they answer</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Explain why the correct answer is correct..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* === METADATA TAB === */}
          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={course} onValueChange={setCourse}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Input
                      placeholder="e.g., Graph Algorithms"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Learning Objective</Label>
                  <Input
                    placeholder="e.g., Apply Dijkstra's algorithm to find shortest paths"
                    value={learningObjective}
                    onChange={(e) => setLearningObjective(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Difficulty Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${difficultyColor}`}>{difficultyLabel}</span>
                    <span className="text-sm text-muted-foreground">{difficulty[0].toFixed(2)}</span>
                  </div>
                  <Slider
                    value={difficulty}
                    onValueChange={setDifficulty}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Easy (0.0)</span>
                    <span>Medium (0.5)</span>
                    <span>Hard (1.0)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
                <CardDescription>Add tags for categorization and search</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted text-muted-foreground"
                    >
                      <Tag className="h-3 w-3" />{t}
                      <button onClick={() => removeTag(t)} className="ml-1 hover:text-destructive">×</button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tags added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === PREVIEW TAB === */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Question Preview</CardTitle>
                  <StatusBadge variant={difficulty[0] < 0.4 ? 'success' : difficulty[0] < 0.7 ? 'warning' : 'destructive'}>
                    {difficultyLabel} ({difficulty[0].toFixed(2)})
                  </StatusBadge>
                  <StatusBadge variant="info">{questionType.replace('_', ' ')}</StatusBadge>
                </div>
              </CardHeader>
              <CardContent>
                {!content ? (
                  <p className="text-muted-foreground text-center py-8">Enter question content to see preview</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">{content}</p>
                    <Separator />

                    {(questionType === 'multiple_choice' || questionType === 'single_choice' || questionType === 'ordering' || questionType === 'matching') && (
                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              opt.isCorrect && (questionType === 'multiple_choice' || questionType === 'single_choice') 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-muted'
                            }`}
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                              {questionType === 'ordering' ? idx + 1 : opt.id}
                            </span>
                            <span className="text-sm">{opt.text || '(empty)'}</span>
                            {questionType === 'matching' && (
                              <>
                                <span className="text-muted-foreground mx-2">→</span>
                                <span className="text-sm font-medium text-primary">Match Definition</span>
                              </>
                            )}
                            {opt.isCorrect && (questionType === 'multiple_choice' || questionType === 'single_choice') && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {questionType === 'fill_blank' && (
                      <div className="p-4 rounded-lg bg-secondary/10 border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">Fill in the blank preview will appear here</p>
                      </div>
                    )}

                    {questionType === 'find_error' && (
                      <div className="p-4 rounded-lg bg-secondary/10 border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">Find the error code block preview will appear here</p>
                      </div>
                    )}

                    {questionType === 'true_false' && (
                      <div className="flex gap-4">
                        <div className={`flex-1 p-3 rounded-lg border text-center ${tfAnswer === 'true' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-muted text-muted-foreground'}`}>True</div>
                        <div className={`flex-1 p-3 rounded-lg border text-center ${tfAnswer === 'false' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-muted text-muted-foreground'}`}>False</div>
                      </div>
                    )}

                    {questionType === 'essay' && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Rubric</p>
                        <p className="text-sm">{essayRubric || '(no rubric)'}</p>
                        <p className="text-xs text-muted-foreground mt-2">Max Score: {essayMaxScore}</p>
                      </div>
                    )}

                    {explanation && (
                      <>
                        <Separator />
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">Explanation</p>
                          <p className="text-sm text-blue-600">{explanation}</p>
                        </div>
                      </>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />{t}
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
