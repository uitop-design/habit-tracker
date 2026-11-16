import type { HabitColor } from '@/api/schemas';
import { COLOR_CLASSES } from '@/lib/habits';
import { cn } from '@/lib/utils';

export function HabitDot({ color, className }: { color: HabitColor; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2.5 shrink-0 rounded-full', COLOR_CLASSES[color], className)}
    />
  );
}
