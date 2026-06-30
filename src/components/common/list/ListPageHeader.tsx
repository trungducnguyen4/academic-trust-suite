"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListPageHeaderProps = {
  title: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  chips?: ReactNode;
  className?: string;
};

export function ListPageHeader({
  title,
  actions,
  toolbar,
  chips,
  className,
}: ListPageHeaderProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {toolbar ? <div className="flex flex-col gap-3">{toolbar}</div> : null}
      {chips ? <div>{chips}</div> : null}
    </section>
  );
}

