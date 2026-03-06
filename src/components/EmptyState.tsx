import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = FolderOpen, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-slide-up">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
