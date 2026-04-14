import { useState } from "react";
import { ChevronDown, Filter, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  FilterDefinition,
  FilterValues,
  NumberRangeValue,
  TextFilterValue,
} from "./filter-types";

type FilterPanelProps = {
  title?: string;
  description?: string;
  filters: FilterDefinition[];
  value: FilterValues;
  onValueChange: (key: string, value: FilterValues[string]) => void;
  onApply: () => void;
  onClear: () => void;
  triggerLabel?: string;
  activeCount?: number;
  className?: string;
};

const EMPTY_TEXT_FILTER: TextFilterValue = { value: "", operator: "contains" };

export function FilterPanel({
  title = "Filters",
  description = "Refine results before applying.",
  filters,
  value,
  onValueChange,
  onApply,
  onClear,
  triggerLabel = "Filter",
  activeCount = 0,
  className,
}: FilterPanelProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-8 rounded-lg border-border bg-white px-2.5 text-xs hover:bg-muted",
        className,
      )}
    >
      <Filter className="h-3.5 w-3.5" />
      <span>{triggerLabel}</span>
      {activeCount > 0 ? (
        <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0 text-[10px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </Button>
  );

  const content = (
    <div className="flex max-h-[min(50vh,20rem)] min-h-0 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 rounded-full px-2.5 text-xs"
        >
          Clear
        </Button>
      </div>

      <Separator />

      <div className="max-h-[16rem] min-h-[6rem] overflow-y-auto pr-2">
        <div className="space-y-3">
          {filters.map((filter) => {
            const current = value[filter.key];

            if (filter.type === "text") {
              const currentValue =
                typeof current === "object" && current && "value" in current
                  ? (current as TextFilterValue)
                  : EMPTY_TEXT_FILTER;

              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  <div className="grid gap-1.5 sm:grid-cols-[120px_1fr]">
                    <Select
                      value={currentValue.operator}
                      onValueChange={(operator) =>
                        onValueChange(filter.key, {
                          ...currentValue,
                          operator: operator as TextFilterValue["operator"],
                        })
                      }
                    >
                      <SelectTrigger className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0 data-[state=open]:border-primary data-[state=open]:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          filter.operators || [
                            "contains",
                            "startsWith",
                            "equals",
                          ]
                        ).map((operator) => (
                          <SelectItem key={operator} value={operator}>
                            {operator === "startsWith"
                              ? "Starts with"
                              : operator === "equals"
                                ? "Equals"
                                : "Contains"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={currentValue.value}
                        onChange={(event) =>
                          onValueChange(filter.key, {
                            ...currentValue,
                            value: event.target.value,
                          })
                        }
                        placeholder={
                          filter.placeholder ||
                          `Search ${filter.label.toLowerCase()}`
                        }
                        className="h-9 rounded-lg border-border bg-white pl-8 text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (filter.type === "select") {
              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  <Select
                    value={typeof current === "string" ? current : "all"}
                    onValueChange={(nextValue) =>
                      onValueChange(filter.key, nextValue)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0 data-[state=open]:border-primary data-[state=open]:ring-0">
                      <SelectValue
                        placeholder={
                          filter.placeholder ||
                          `Select ${filter.label.toLowerCase()}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.allowAll !== false && (
                        <SelectItem value="all">
                          {filter.allLabel || `All ${filter.label}`}
                        </SelectItem>
                      )}
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (filter.type === "multi-select") {
              const selected = Array.isArray(current) ? current : [];

              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  <div className="rounded-lg border border-border/80 p-2.5">
                    <ScrollArea className="max-h-28 pr-1.5">
                      <div className="space-y-1.5">
                        {filter.options.map((option) => {
                          const checked = selected.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(checkedValue) => {
                                  const next = checkedValue
                                    ? [...selected, option.value]
                                    : selected.filter(
                                        (item) => item !== option.value,
                                      );
                                  onValueChange(filter.key, next);
                                }}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-medium text-foreground">
                                  {option.label}
                                </span>
                                {option.description ? (
                                  <span className="block text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              );
            }

            if (filter.type === "boolean") {
              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  <div className="flex items-center justify-between rounded-lg border border-border/80 px-2.5 py-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        {typeof current === "boolean"
                          ? current
                            ? filter.trueLabel || "Enabled"
                            : filter.falseLabel || "Disabled"
                          : `Toggle ${filter.label.toLowerCase()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeof current === "boolean"
                          ? current
                            ? filter.trueLabel || "Yes"
                            : filter.falseLabel || "No"
                          : "Optional boolean filter"}
                      </p>
                    </div>
                    <Switch
                      checked={typeof current === "boolean" ? current : false}
                      onCheckedChange={(checked) =>
                        onValueChange(filter.key, checked)
                      }
                    />
                  </div>
                </div>
              );
            }

            if (filter.type === "number-range") {
              const range =
                current && typeof current === "object"
                  ? (current as NumberRangeValue)
                  : {};
              const minValue = range.min;
              const maxValue = range.max;

              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  {filter.showSlider &&
                  typeof filter.min === "number" &&
                  typeof filter.max === "number" ? (
                    <div className="space-y-3 rounded-lg border border-border/80 px-2.5 py-3">
                      <Slider
                        min={filter.min}
                        max={filter.max}
                        step={filter.step || 1}
                        value={[minValue ?? filter.min, maxValue ?? filter.max]}
                        onValueChange={([min, max]) =>
                          onValueChange(filter.key, { min, max })
                        }
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="number"
                          min={filter.min}
                          max={filter.max}
                          step={filter.step || 1}
                          value={minValue ?? ""}
                          onChange={(event) =>
                            onValueChange(filter.key, {
                              min: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                              max: maxValue,
                            })
                          }
                          placeholder="Min"
                          className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                        />
                        <Input
                          type="number"
                          min={filter.min}
                          max={filter.max}
                          step={filter.step || 1}
                          value={maxValue ?? ""}
                          onChange={(event) =>
                            onValueChange(filter.key, {
                              min: minValue,
                              max: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Max"
                          className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/80 p-2.5 sm:grid-cols-2">
                      <Input
                        type="number"
                        step={filter.step || 1}
                        value={minValue ?? ""}
                        onChange={(event) =>
                          onValueChange(filter.key, {
                            min: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                            max: maxValue,
                          })
                        }
                        placeholder="Min"
                        className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                      />
                      <Input
                        type="number"
                        step={filter.step || 1}
                        value={maxValue ?? ""}
                        onChange={(event) =>
                          onValueChange(filter.key, {
                            min: minValue,
                            max: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Max"
                        className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>
              );
            }

            if (filter.type === "date-range") {
              const range =
                current && typeof current === "object"
                  ? (current as { from?: string; to?: string })
                  : {};

              return (
                <div
                  key={filter.key}
                  className="mx-auto w-full max-w-[26rem] space-y-1.5"
                >
                  <Label className="text-xs font-medium">{filter.label}</Label>
                  <div className="grid gap-2 rounded-lg border border-border/80 p-2.5 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        From
                      </span>
                      <Input
                        type={filter.showTime ? "datetime-local" : "date"}
                        value={range.from || ""}
                        onChange={(event) =>
                          onValueChange(filter.key, {
                            from: event.target.value || undefined,
                            to: range.to,
                          })
                        }
                        className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        To
                      </span>
                      <Input
                        type={filter.showTime ? "datetime-local" : "date"}
                        value={range.to || ""}
                        onChange={(event) =>
                          onValueChange(filter.key, {
                            from: range.from,
                            to: event.target.value || undefined,
                          })
                        }
                        className="h-9 rounded-lg border-border bg-white text-xs ring-0 outline-none focus:border-primary focus:ring-0 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="h-8 rounded-lg px-3 text-xs"
        >
          Clear filters
        </Button>
        <Button type="button" onClick={onApply} className="h-8 rounded-lg px-2.5 text-xs">
          Apply Filter
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[78vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
          <DrawerFooter className="px-4 pb-6" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[clamp(15.5rem,30vw,27rem)] max-w-[90vw] min-w-[15.5rem] max-h-[80vh] p-0"
      >
        <div className="p-2.5">{content}</div>
      </PopoverContent>
    </Popover>
  );
}
