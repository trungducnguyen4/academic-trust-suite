import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit2,
  Loader2,
  Brain,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface GeneratedQuestion {
  id: string;
  content: string;
  type: "multiple_choice" | "true_false";
  options?: { id: string; text: string; isCorrect: boolean }[];
  tfAnswer?: boolean;
  difficulty: number;
  topic: string;
  approved: boolean | null; // null = pending review
  editing: boolean;
}

type Step = "upload" | "configure" | "generating" | "review";

export default function UploadDocAIGen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [files, setFiles] = useState<
    { name: string; size: string; type: string }[]
  >([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Config state
  const [numQuestions, setNumQuestions] = useState(10);
  const [targetDifficulty, setTargetDifficulty] = useState("mixed");
  const [questionTypes, setQuestionTypes] = useState({ mc: true, tf: true });
  const [focusTopics, setFocusTopics] = useState("");

  // Generation state
  const [genProgress, setGenProgress] = useState(0);

  // Review state
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);

  const simulateUpload = () => {
    setFiles([
      { name: "Chapter5_Algorithms.pdf", size: "2.4 MB", type: "PDF" },
      { name: "Lecture_Notes_Graph.docx", size: "1.1 MB", type: "DOCX" },
    ]);
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setUploadProgress(Math.min(p, 100));
      if (p >= 100) clearInterval(interval);
    }, 200);
  };

  const startGeneration = () => {
    setStep("generating");
    let p = 0;
    const interval = setInterval(() => {
      p += 8;
      setGenProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        // Mock generated questions
        const mockGen: GeneratedQuestion[] = [
          {
            id: "G1",
            content: "What is the time complexity of BFS on an adjacency list?",
            type: "multiple_choice",
            options: [
              { id: "A", text: "O(V + E)", isCorrect: true },
              { id: "B", text: "O(V²)", isCorrect: false },
              { id: "C", text: "O(E log V)", isCorrect: false },
              { id: "D", text: "O(V × E)", isCorrect: false },
            ],
            difficulty: 0.55,
            topic: "Graph Traversal",
            approved: null,
            editing: false,
          },
          {
            id: "G2",
            content:
              "Kruskal's algorithm always produces a minimum spanning tree for any connected weighted graph.",
            type: "true_false",
            tfAnswer: true,
            difficulty: 0.4,
            topic: "Minimum Spanning Tree",
            approved: null,
            editing: false,
          },
          {
            id: "G3",
            content:
              "Which data structure is used in Dijkstra's algorithm for optimal performance?",
            type: "multiple_choice",
            options: [
              { id: "A", text: "Stack", isCorrect: false },
              { id: "B", text: "Queue", isCorrect: false },
              { id: "C", text: "Min-heap / Priority queue", isCorrect: true },
              { id: "D", text: "Hash table", isCorrect: false },
            ],
            difficulty: 0.62,
            topic: "Shortest Path",
            approved: null,
            editing: false,
          },
          {
            id: "G4",
            content:
              "A topological sort is possible only on DAGs (Directed Acyclic Graphs).",
            type: "true_false",
            tfAnswer: true,
            difficulty: 0.35,
            topic: "Graph Properties",
            approved: null,
            editing: false,
          },
          {
            id: "G5",
            content:
              "What is the worst-case time complexity of Bellman-Ford algorithm?",
            type: "multiple_choice",
            options: [
              { id: "A", text: "O(V + E)", isCorrect: false },
              { id: "B", text: "O(V × E)", isCorrect: true },
              { id: "C", text: "O(V² log V)", isCorrect: false },
              { id: "D", text: "O(E²)", isCorrect: false },
            ],
            difficulty: 0.72,
            topic: "Shortest Path",
            approved: null,
            editing: false,
          },
        ];
        setGenerated(mockGen);
        setStep("review");
      }
    }, 300);
  };

  const approveQuestion = (id: string) => {
    setGenerated((prev) =>
      prev.map((q) => (q.id === id ? { ...q, approved: true } : q)),
    );
  };

  const rejectQuestion = (id: string) => {
    setGenerated((prev) =>
      prev.map((q) => (q.id === id ? { ...q, approved: false } : q)),
    );
  };

  const removeQuestion = (id: string) => {
    setGenerated((prev) => prev.filter((q) => q.id !== id));
  };

  const approvedCount = generated.filter((q) => q.approved === true).length;
  const rejectedCount = generated.filter((q) => q.approved === false).length;
  const pendingCount = generated.filter((q) => q.approved === null).length;

  const saveApproved = async () => {
    // In real app, save to question bank
    navigate("/lecturer/question-bank");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate("/lecturer/question-bank")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Question Bank
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Upload Document & AI Generate
          </h1>
          <p className="text-muted-foreground">
            Upload course materials and let AI generate exam questions
            automatically
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["upload", "configure", "generating", "review"] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium
                ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["upload", "configure", "generating", "review"].indexOf(
                          step,
                        ) > i
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                }`}
                >
                  {["upload", "configure", "generating", "review"].indexOf(
                    step,
                  ) > i ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm capitalize ${step === s ? "font-medium" : "text-muted-foreground"}`}
                >
                  {s}
                </span>
                {i < 3 && <Separator className="w-8" />}
              </div>
            ),
          )}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> Upload Documents
              </CardTitle>
              <CardDescription>
                Upload PDF, DOCX, or TXT files containing course material
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={simulateUpload}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, TXT up to 50MB each
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Uploaded Files</p>
                  {files.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.size} · {f.type}
                        </p>
                      </div>
                      {uploadProgress >= 100 && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  ))}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} className="h-2" />
                  )}
                  {uploadProgress >= 100 && (
                    <Button
                      onClick={() => setStep("configure")}
                      className="w-full"
                    >
                      Continue to Configure
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure */}
        {step === "configure" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" /> AI Generation Settings
              </CardTitle>
              <CardDescription>
                Configure how AI should generate questions from your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Difficulty</Label>
                  <Select
                    value={targetDifficulty}
                    onValueChange={setTargetDifficulty}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="mixed">Mixed (recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Types</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={questionTypes.mc}
                      onCheckedChange={(c) =>
                        setQuestionTypes({ ...questionTypes, mc: !!c })
                      }
                    />
                    <span className="text-sm">Multiple Choice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={questionTypes.tf}
                      onCheckedChange={(c) =>
                        setQuestionTypes({ ...questionTypes, tf: !!c })
                      }
                    />
                    <span className="text-sm">True / False</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Focus Topics (optional)</Label>
                <Textarea
                  placeholder="e.g., Graph algorithms, Shortest path, Minimum spanning tree..."
                  value={focusTopics}
                  onChange={(e) => setFocusTopics(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={startGeneration} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Generate Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                AI is analyzing your documents...
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Extracting key concepts and generating {numQuestions} questions
              </p>
              <Progress value={genProgress} className="max-w-md mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {genProgress}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <div className="space-y-4">
            {/* Review Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-green-600">
                    {approvedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-yellow-600">
                    {pendingCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pending Review
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-red-600">
                    {rejectedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </CardContent>
              </Card>
            </div>

            {/* Review Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("configure");
                  setGenerated([]);
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
              <Button
                onClick={saveApproved}
                disabled={approvedCount === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> Save {approvedCount} to Question
                Bank
              </Button>
            </div>

            {/* Question Cards */}
            {generated.map((q, idx) => (
              <Card
                key={q.id}
                className={`${q.approved === false ? "opacity-50" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <StatusBadge
                        variant={
                          q.difficulty < 0.4
                            ? "success"
                            : q.difficulty < 0.7
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {q.difficulty < 0.4
                          ? "Easy"
                          : q.difficulty < 0.7
                            ? "Medium"
                            : "Hard"}
                      </StatusBadge>
                      <StatusBadge variant="info">
                        {q.type === "multiple_choice" ? "MC" : "T/F"}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {q.topic}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {q.approved === null && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveQuestion(q.id)}
                            className="gap-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectQuestion(q.id)}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                      {q.approved === true && (
                        <StatusBadge variant="success">Approved</StatusBadge>
                      )}
                      {q.approved === false && (
                        <StatusBadge variant="destructive">
                          Rejected
                        </StatusBadge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-3">{q.content}</p>
                  {q.type === "multiple_choice" && q.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((o) => (
                        <div
                          key={o.id}
                          className={`flex items-center gap-2 p-2 rounded border text-sm ${
                            o.isCorrect
                              ? "border-green-500 bg-green-50"
                              : "border-muted"
                          }`}
                        >
                          <span className="font-medium text-muted-foreground">
                            {o.id}.
                          </span>
                          {o.text}
                          {o.isCorrect && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === "true_false" && (
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 rounded text-sm ${q.tfAnswer ? "bg-green-50 text-green-700 font-medium" : "text-muted-foreground"}`}
                      >
                        True
                      </span>
                      <span
                        className={`px-3 py-1 rounded text-sm ${!q.tfAnswer ? "bg-green-50 text-green-700 font-medium" : "text-muted-foreground"}`}
                      >
                        False
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
