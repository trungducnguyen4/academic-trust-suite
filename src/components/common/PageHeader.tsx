import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageAction } from "@/types/ui";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: PageAction[];
  meta?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions = [], meta, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions.map((action) => {
            const content = (
              <>
                {action.icon}
                {action.label}
              </>
            );
            return action.href ? (
              <Button key={action.label} asChild variant={action.variant ?? "default"}>
                <Link href={action.href}>{content}</Link>
              </Button>
            ) : (
              <Button key={action.label} variant={action.variant ?? "default"} onClick={action.onClick}>
                {content}
              </Button>
            );
          })}
        </div>
      )}
    </header>
  );
}
