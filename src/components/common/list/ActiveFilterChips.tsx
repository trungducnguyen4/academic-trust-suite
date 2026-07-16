"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-types";

type ActiveFilterChipsProps = {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
};

export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <Badge
          key={`${chip.key}-${chip.valueLabel}`}
          variant="secondary"
          className="gap-2 rounded-md px-3 py-1.5 text-xs font-medium"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="max-w-[220px] truncate">{chip.valueLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(chip.key)}
            className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Xóa bộ lọc {chip.label}</span>
          </Button>
        </Badge>
      ))}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-8 rounded-full px-3 text-xs"
      >
        Xóa bộ lọc
      </Button>
    </div>
  );
}

