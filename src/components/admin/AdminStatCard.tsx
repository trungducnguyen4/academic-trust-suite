import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconWrapClassName?: string;
  iconClassName?: string;
  className?: string;
}

export function AdminStatCard({
  icon: Icon,
  label,
  value,
  iconWrapClassName,
  iconClassName,
  className,
}: AdminStatCardProps) {
  return (
    <Card className={cn("rounded-xl shadow-sm", className)}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center",
              iconWrapClassName,
            )}
          >
            <Icon className={cn("h-4 w-4 text-primary", iconClassName)} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xl leading-none font-semibold">{value}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
