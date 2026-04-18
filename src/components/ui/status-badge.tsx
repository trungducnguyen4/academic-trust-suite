import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-muted/70 text-muted-foreground shadow-sm shadow-black/5",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-warning",
        danger: "border-destructive/25 bg-destructive/10 text-destructive",
        info: "border-info/25 bg-info/10 text-info",
        accent: "border-accent/25 bg-accent/10 text-accent-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export type StatusBadgeTone = VariantProps<typeof statusBadgeVariants>["tone"];

type LegacyStatusBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "accent";

export type StatusBadgeDomain =
  | "exam"
  | "integrity"
  | "user"
  | "severity"
  | "confidence"
  | "submission"
  | "role"
  | "approval"
  | "session"
  | "course";

type StatusBadgeMapEntry = {
  tone: StatusBadgeTone;
  label?: string;
};

const STATUS_BADGE_MAP: Record<
  StatusBadgeDomain,
  Record<string, StatusBadgeMapEntry>
> = {
  exam: {
    draft: { tone: "neutral" },
    published: { tone: "info" },
    ongoing: { tone: "warning" },
    completed: { tone: "success" },
    archived: { tone: "neutral" },
  },
  integrity: {
    pending: { tone: "warning", label: "Pending" },
    reviewed: { tone: "info", label: "Reviewed" },
    dismissed: { tone: "neutral", label: "Dismissed" },
    confirmed: { tone: "danger", label: "Confirmed" },
  },
  user: {
    active: { tone: "success" },
    suspended: { tone: "danger" },
    inactive: { tone: "neutral" },
  },
  severity: {
    none: { tone: "success", label: "No issues" },
    info: { tone: "info" },
    low: { tone: "neutral", label: "Low" },
    medium: { tone: "warning", label: "Medium" },
    warning: { tone: "warning", label: "Warning" },
    high: { tone: "danger", label: "High" },
    critical: { tone: "danger", label: "Critical" },
  },
  confidence: {
    low: { tone: "neutral" },
    medium: { tone: "warning" },
    high: { tone: "danger" },
  },
  submission: {
    downloading: { tone: "warning" },
    downloaded: { tone: "success" },
    available: { tone: "info" },
    expired: { tone: "danger" },
    flagged: { tone: "warning" },
    approved: { tone: "success" },
    rejected: { tone: "danger" },
    pending: { tone: "warning" },
    graded: { tone: "success" },
    submitted: { tone: "info" },
    failed: { tone: "danger" },
  },
  role: {
    admin: { tone: "accent" },
    lecturer: { tone: "info" },
    student: { tone: "neutral" },
  },
  approval: {
    pending: { tone: "warning" },
    approved: { tone: "success" },
    rejected: { tone: "danger" },
    dismissed: { tone: "neutral" },
  },
  session: {
    not_joined: { tone: "neutral" },
    in_progress: { tone: "warning" },
    submitted: { tone: "success" },
    flagged: { tone: "danger" },
    disconnected: { tone: "warning" },
  },
  course: {
    draft: { tone: "warning" },
    active: { tone: "success" },
    archived: { tone: "neutral" },
    published: { tone: "info" },
  },
};

function normalizeStatusKey(value?: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBadgeText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const shouldPreserveCase =
    trimmed.includes("/") ||
    /\d/.test(trimmed) ||
    (trimmed.length <= 2 && trimmed === trimmed.toUpperCase());

  if (shouldPreserveCase) return trimmed;

  if (
    trimmed === trimmed.toUpperCase() ||
    trimmed === trimmed.toLowerCase() ||
    /[_-]/.test(trimmed)
  ) {
    return toTitleCase(trimmed.toLowerCase());
  }

  return trimmed;
}

function renderBadgeContent(content: React.ReactNode): React.ReactNode {
  if (typeof content === "string") {
    return formatBadgeText(content);
  }

  if (Array.isArray(content)) {
    return content.map((item, index) => (
      <React.Fragment key={index}>{renderBadgeContent(item)}</React.Fragment>
    ));
  }

  return content;
}

export function getStatusBadgeTone(
  status: string | undefined,
  domain?: StatusBadgeDomain,
  fallbackTone: StatusBadgeTone = "neutral",
): StatusBadgeTone {
  if (!domain) return fallbackTone;

  const entry = STATUS_BADGE_MAP[domain][normalizeStatusKey(status)];
  return entry?.tone ?? fallbackTone;
}

export function getStatusBadgeLabel(
  status: string | undefined,
  domain?: StatusBadgeDomain,
  fallbackLabel?: string,
): string {
  if (fallbackLabel) return fallbackLabel;

  if (!status) return "";

  const entry = domain
    ? STATUS_BADGE_MAP[domain][normalizeStatusKey(status)]
    : undefined;

  return entry?.label ?? toTitleCase(status);
}

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusBadgeTone;
  variant?: StatusBadgeTone | LegacyStatusBadgeVariant;
  status?: string;
  domain?: StatusBadgeDomain;
  label?: string;
  children?: React.ReactNode;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    { className, tone, variant, status, domain, label, children, ...props },
    ref,
  ) => {
    const resolvedTone =
      tone ??
      (variant === "default"
        ? "neutral"
        : variant === "destructive"
          ? "danger"
          : variant ?? getStatusBadgeTone(status, domain));
    const resolvedLabel = getStatusBadgeLabel(status, domain, label);
    const content = renderBadgeContent(children ?? resolvedLabel);

    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ tone: resolvedTone }), className)}
        {...props}
      >
        {content}
      </span>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { statusBadgeVariants };
