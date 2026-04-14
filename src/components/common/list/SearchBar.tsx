import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
};

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
  disabled,
  clearable = true,
}: SearchBarProps) {
  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 rounded-lg border-border bg-white pl-9 pr-20 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
        {clearable && value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => onChange("")}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onSearch}
        disabled={disabled}
        className="h-10 shrink-0 rounded-lg border-border bg-white px-3 text-foreground hover:bg-muted"
      >
        Search
      </Button>
    </div>
  );
}
