import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground border-border",
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-warning/10 text-warning border-warning/30",
        destructive: "bg-destructive/10 text-destructive border-destructive/20",
        info: "bg-info/10 text-info border-info/20",
        accent: "bg-accent/10 text-accent border-accent/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

export function StatusBadge({ className, variant, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
