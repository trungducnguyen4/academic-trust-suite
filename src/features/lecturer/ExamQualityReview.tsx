"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type Suggestion = {
  id: string;
  questionId: string;
  severity: string | null;
  reasonSummary: string;
  recommendation: string;
  statsSnapshot: Record<string, any> | null;
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_CHANGES";
  reviewNotes: string | null;
  question?: { id: string; content: string; type: string };
};

export default function ExamQualityReview() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug : [];
  const examId = slug[1];
  const pathname = usePathname();
  const router = useRouter();
  const basePath = pathname.startsWith("/admin") ? "/admin" : "/lecturer";

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [overallSummary, setOverallSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!examId) return;
    const loadExisting = async () => {
      try {
        const items = await api.listExamQualityReviewSuggestions(examId);
        setSuggestions(items || []);
        const latestWithSummary = (items || []).find((item: any) => item.job?.output?.overallSummary);
        if (latestWithSummary) {
          setOverallSummary(latestWithSummary.job.output.overallSummary);
        }
      } catch {
        // No prior review yet - not an error state.
      } finally {
        setLoading(false);
      }
    };
    loadExisting();
  }, [examId]);

  const handleGenerate = async () => {
    if (!examId) return;
    setGenerating(true);
    try {
      const job = await api.generateExamQualityReview(examId);
      setOverallSummary(job?.output?.overallSummary || null);
      setSuggestions(job?.qualityReviewItems || []);
      toast.success("AI quality review generated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate AI quality review.");
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (
    item: Suggestion,
    decision: "APPROVED" | "REJECTED" | "NEEDS_CHANGES",
  ) => {
    if (!examId) return;
    try {
      const notes = notesDraft[item.id]?.trim() || undefined;
      const updated = await api.reviewExamQualitySuggestion(examId, item.id, { decision, notes });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, reviewStatus: updated.reviewStatus, reviewNotes: updated.reviewNotes } : s)),
      );
      toast.success(
        decision === "APPROVED"
          ? "Suggestion approved."
          : decision === "REJECTED"
            ? "Suggestion rejected."
            : "Marked as needs changes.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update review status.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminPageShell showBackButton={false}>
        <Button
          variant="ghost"
          className="pl-0 gap-2 mb-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(`${basePath}/exam/${examId}/results`)}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Exam Results
        </Button>

        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Quality Review
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-generated suggestions based on real exam statistics. Review, approve, or reject each
              suggestion — the AI never edits or publishes questions itself.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Analyzing exam data..." : "Generate AI Review"}
          </Button>
        </div>

        {overallSummary ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Overall Quality Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{overallSummary}</p>
            </CardContent>
          </Card>
        ) : null}

        {suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {generating
                ? "Analyzing question statistics with AI..."
                : "No AI quality review has been generated yet for this exam. Click \"Generate AI Review\" to analyze real exam statistics."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map((item) => {
              const stats = item.statsSnapshot || {};
              return (
                <Card key={item.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge domain="severity" status={item.severity || "medium"} />
                        <StatusBadge domain="approval" status={item.reviewStatus} />
                      </div>
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {item.question?.content || `Question ${item.questionId}`}
                      </CardTitle>
                      <CardDescription>{item.question?.type}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {typeof stats.incorrectRate === "number" && (
                        <div>Incorrect: <span className="font-medium text-foreground">{stats.incorrectRate.toFixed(0)}%</span></div>
                      )}
                      {typeof stats.skipRate === "number" && (
                        <div>Skipped: <span className="font-medium text-foreground">{stats.skipRate.toFixed(0)}%</span></div>
                      )}
                      {typeof stats.difficultyIndex === "number" && (
                        <div>Difficulty: <span className="font-medium text-foreground">{stats.difficultyIndex.toFixed(2)}</span></div>
                      )}
                      {typeof stats.discriminationIndex === "number" && (
                        <div>Discrimination: <span className="font-medium text-foreground">{stats.discriminationIndex.toFixed(2)}</span></div>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm">{item.reasonSummary}</p>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{item.recommendation}</p>
                    </div>

                    <Textarea
                      placeholder="Optional review note..."
                      value={notesDraft[item.id] ?? item.reviewNotes ?? ""}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="text-sm min-h-[60px]"
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 hover:bg-green-50"
                        onClick={() => handleReview(item, "APPROVED")}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleReview(item, "REJECTED")}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(item, "NEEDS_CHANGES")}
                      >
                        Needs Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => router.push(`${basePath}/question-editor?id=${item.questionId}`)}
                      >
                        Edit Question
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </AdminPageShell>
    </DashboardLayout>
  );
}
