import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface BackToDashboardButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function BackToDashboardButton({
  to = '/admin',
  label = 'Back to Dashboard',
  className,
  variant = 'ghost',
  size = 'sm',
}: BackToDashboardButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 text-muted-foreground ${className ?? ''}`.trim()}
      asChild
    >
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
