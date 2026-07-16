import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmptyStateProps } from "@/types/ui";

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const actionContent = action ? (
    <>
      {action.icon}
      {action.label}
    </>
  ) : null;

  return (
    <section className={cn("flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && (
        action.href ? (
          <Button asChild className="mt-6" variant={action.variant ?? "default"}>
            <Link href={action.href}>{actionContent}</Link>
          </Button>
        ) : (
          <Button className="mt-6" variant={action.variant ?? "default"} onClick={action.onClick}>
            {actionContent}
          </Button>
        )
      )}
    </section>
  );
}
