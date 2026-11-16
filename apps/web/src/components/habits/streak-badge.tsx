import { FlameIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StreakBadge({ streak }: { streak: number }) {
  const active = streak > 0;
  return (
    <Badge
      variant={active ? 'secondary' : 'outline'}
      className={cn('tabular-nums', !active && 'text-muted-foreground')}
      aria-label={`Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
    >
      <FlameIcon className={cn(active && 'text-orange-500')} />
      {streak}
    </Badge>
  );
}
