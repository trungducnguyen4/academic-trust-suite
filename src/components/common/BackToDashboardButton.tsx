"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface BackToDashboardButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function BackToDashboardButton({
  to = "/admin",
  label = "Quay lại tổng quan",
  className,
  variant = "ghost",
  size = "sm",
}: BackToDashboardButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`!mb-1 gap-2 text-muted-foreground ${className ?? ""}`.trim()}
      asChild
    >
      <Link href={to as any}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}



