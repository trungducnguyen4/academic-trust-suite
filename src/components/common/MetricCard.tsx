import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, helper, icon, className }: MetricCardProps) {
  return (
    <article className={cn("rounded-xl border border-border/80 bg-card p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="data-number mt-2 text-3xl font-semibold text-foreground">{value}</p>
        </div>
        {icon && <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</div>}
      </div>
      {helper && <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>}
    </article>
  );
}
