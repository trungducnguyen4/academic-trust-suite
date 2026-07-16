import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export type UiStatus = {
  label: string;
  tone: StatusTone;
  description?: string;
};

export type PageAction = {
  label: string;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
};

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: PageAction;
  className?: string;
};

export type ResponsiveColumn = {
  key: string;
  label: string;
  priority: "primary" | "secondary" | "detail";
  align?: "left" | "center" | "right";
};
