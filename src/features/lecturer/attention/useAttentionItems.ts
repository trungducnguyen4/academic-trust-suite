"use client";

import { useMemo } from "react";
import { FileText, Clock, AlertTriangle, Sparkles } from "lucide-react";
import type { Exam } from "../LecturerDashboard";
import type { AttentionItemData, AttentionPriority } from "./types";

const PRIORITY_ORDER: Record<AttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// Development-only preview data. Production continues to use API-derived items.
const DEVELOPMENT_MOCK_ITEMS: AttentionItemData[] = [
  {
    id: "mock-integrity-reviews",
    icon: AlertTriangle,
    priority: "critical",
    message: "3 suspicious activity reports require instructor review",
    count: 3,
    actionLabel: "Review flags",
    href: "/lecturer/analytics",
  },
  {
    id: "mock-ai-questions",
    icon: Sparkles,
    priority: "high",
    message: "12 AI-generated questions are waiting for approval",
    count: 12,
    actionLabel: "Review questions",
    href: "/lecturer/question-bank",
  },
  {
    id: "mock-draft-exams",
    icon: FileText,
    priority: "high",
    message: "2 draft exams have not been published",
    count: 2,
    actionLabel: "Continue editing",
    href: "/lecturer/exams",
  },
  {
    id: "mock-upcoming-exam",
    icon: Clock,
    priority: "medium",
    message: "1 exam starts within the next 24 hours",
    count: 1,
    actionLabel: "Review schedule",
    href: "/lecturer/exams",
  },
];

function sortByPriority(a: AttentionItemData, b: AttentionItemData) {
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

interface UseAttentionItemsOptions {
  exams: Exam[];
  loading: boolean;
}

export function useAttentionItems({
  exams,
  loading,
}: UseAttentionItemsOptions): {
  items: AttentionItemData[];
  loading: boolean;
  isMock: boolean;
} {
  const isMock = process.env.NODE_ENV === "development";

  const items = useMemo(() => {
    if (loading) return [];
    if (isMock) return DEVELOPMENT_MOCK_ITEMS;
    if (exams.length === 0) return [];

    const result: AttentionItemData[] = [];

    // 1. Draft exams
    const draftExams = exams.filter(
      (ex) => ex.status === "DRAFT",
    );
    if (draftExams.length > 0) {
      result.push({
        id: "draft-exams",
        icon: FileText,
        priority: "high",
        message: `${draftExams.length} draft ${draftExams.length === 1 ? "exam has" : "exams have"} not been published`,
        count: draftExams.length,
        actionLabel: "Continue editing",
        href: "/lecturer/exams",
      });
    }

    // 2. Upcoming exams (PUBLISHED, starting within 7 days)
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const upcomingExams = exams.filter((ex) => {
      if (ex.status !== "PUBLISHED") return false;
      if (!ex.startTime) return false;
      const start = new Date(ex.startTime).getTime();
      return start > now && start <= now + sevenDays;
    });
    if (upcomingExams.length > 0) {
      result.push({
        id: "upcoming-exams",
        icon: Clock,
        priority: "medium",
        message: `${upcomingExams.length} ${upcomingExams.length === 1 ? "exam starts" : "exams start"} within the next 7 days`,
        count: upcomingExams.length,
        actionLabel: "Review exams",
        href: "/lecturer/exams",
      });
    }

    // Sort by priority and limit to 4
    return result.sort(sortByPriority).slice(0, 4);
  }, [exams, isMock, loading]);

  return { items, loading, isMock };
}
