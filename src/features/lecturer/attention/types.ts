export type AttentionPriority = "critical" | "high" | "medium" | "low";

export interface AttentionItemData {
  id: string;
  icon: React.ElementType;
  priority: AttentionPriority;
  message: string;
  count: number;
  actionLabel: string;
  href: string;
}
