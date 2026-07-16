"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAttentionItems } from "./useAttentionItems";
import type { Exam } from "../LecturerDashboard";

const PRIORITY_STYLES: Record<
  string,
  { bg: string; icon: string; border: string; hover: string }
> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-950/20",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    hover: "hover:bg-red-100/50 dark:hover:bg-red-950/30",
  },
  high: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    hover: "hover:bg-amber-100/50 dark:hover:bg-amber-950/30",
  },
  medium: {
    bg: "bg-sky-50 dark:bg-sky-950/20",
    icon: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    hover: "hover:bg-sky-100/50 dark:hover:bg-sky-950/30",
  },
  low: {
    bg: "bg-primary/5",
    icon: "text-primary",
    border: "border-border/60",
    hover: "hover:bg-secondary/50",
  },
};

interface AttentionSectionProps {
  exams: Exam[];
  examsLoading: boolean;
  onRetry?: () => void;
}

export function AttentionSection({
  exams,
  examsLoading,
  onRetry,
}: AttentionSectionProps) {
  const { items, loading, isMock } = useAttentionItems({
    exams,
    loading: examsLoading,
  });

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">
                Needs your attention
              </CardTitle>
              {isMock && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  Mock preview
                </Badge>
              )}
            </div>
            <CardDescription>
              Important tasks and upcoming deadlines
            </CardDescription>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
              asChild
            >
              <Link href="/lecturer/exams">
                View all tasks
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 animate-pulse"
              >
                <div className="h-8 w-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-8 w-20 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error / retry state */}
        {!loading && items.length === 0 && !examsLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No pending tasks require your attention.
            </p>
          </div>
        )}

        {/* Attention items */}
        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => {
              const style = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.low;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${style.bg} ${style.border} ${style.hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${style.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.message}
                    </p>
                  </div>
                  <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-background px-3 text-xs font-medium text-foreground shadow-sm">
                    {item.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
