"use client";

import { ReactNode } from "react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { cn } from "@/lib/utils";

interface AdminPageShellProps {
  children: ReactNode;
  className?: string;
  showBackButton?: boolean;
  backTo?: string;
  backButtonClassName?: string;
}

export function AdminPageShell({
  children,
  className,
  showBackButton = true,
  backTo = "/admin",
  backButtonClassName,
}: AdminPageShellProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showBackButton && (
        <BackToDashboardButton
          to={backTo}
          className={cn("-ml-2", backButtonClassName)}
        />
      )}
      {children}
    </div>
  );
}

