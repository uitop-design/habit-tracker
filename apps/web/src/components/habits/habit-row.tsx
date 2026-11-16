import { Link } from 'react-router';
import { useToggleCheckin } from '@/api/habits';
import type { HabitWithProgress } from '@/api/schemas';
import { HabitDot } from '@/components/habits/habit-dot';
import { StreakBadge } from '@/components/habits/streak-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { describeSchedule } from '@/lib/habits';
import { cn } from '@/lib/utils';

export function HabitRow({ habit, today }: { habit: HabitWithProgress; today: string }) {
  const toggle = useToggleCheckin();
  const checkboxId = `habit-${habit.id}`;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <HabitDot color={habit.color} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/habits/${habit.id}`}
          className={cn(
            'block truncate font-medium underline-offset-4 hover:underline',
            habit.doneToday && 'text-muted-foreground line-through',
          )}
        >
          {habit.name}
        </Link>
        <p className="text-xs text-muted-foreground">{describeSchedule(habit.weekdays)}</p>
      </div>
      <StreakBadge streak={habit.currentStreak} />
      <Checkbox
        id={checkboxId}
        className="size-5"
        checked={habit.doneToday}
        onCheckedChange={(checked) =>
          toggle.mutate({ habitId: habit.id, date: today, done: checked === true, today })
        }
        aria-label={`Mark “${habit.name}” as done today`}
      />
    </li>
  );
}
