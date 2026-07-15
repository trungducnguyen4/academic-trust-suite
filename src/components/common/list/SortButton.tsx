"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SortOrder = "asc" | "desc";

export interface SortOption {
  field: string;
  label: string;
}

type SortButtonProps = {
  options: SortOption[];
  value: string;
  order: SortOrder;
  onSortChange: (field: string, order: SortOrder) => void;
  className?: string;
  label?: string;
};

export function SortButton({
  options,
  value,
  order,
  onSortChange,
  className,
  label = "Sort",
}: SortButtonProps) {
  const [open, setOpen] = useState(false);

  const toggleOrder = () => {
    onSortChange(value, order === "asc" ? "desc" : "asc");
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg border-border bg-white shadow-sm hover:bg-muted/40"
          >
            <ArrowUpDown className="h-4 w-4" />
            {label}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.field}
              onClick={() => {
                onSortChange(option.field, order);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-md text-sm text-foreground transition-colors",
                "hover:bg-muted/40 hover:text-foreground",
                "focus:bg-muted/40 focus:text-foreground",
                "data-[highlighted]:bg-muted/40 data-[highlighted]:text-foreground",
                value === option.field && "font-medium"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.field && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {order === "asc" ? "↑" : "↓"}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          {options.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={toggleOrder}
                className="cursor-pointer rounded-md text-sm text-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus:bg-muted/40 focus:text-foreground data-[highlighted]:bg-muted/40 data-[highlighted]:text-foreground"
              >
                <span className="flex-1">
                  Order: {order === "asc" ? "Ascending" : "Descending"}
                </span>
                <span className="ml-2 text-xs">
                  {order === "asc" ? "↑" : "↓"}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

