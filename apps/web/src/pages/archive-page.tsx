import { format, parseISO } from 'date-fns';
import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useArchiveHabit, useHabits } from '@/api/habits';
import type { HabitWithProgress } from '@/api/schemas';
import { HabitDot } from '@/components/habits/habit-dot';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToday } from '@/hooks/use-today';
import { describeSchedule } from '@/lib/habits';

function ArchivedRow({ habit }: { habit: HabitWithProgress }) {
  const restore = useArchiveHabit();
  const archivedOn = habit.archivedAt ? format(parseISO(habit.archivedAt), 'MMM d, yyyy') : '';

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <HabitDot color={habit.color} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/habits/${habit.id}`}
          className="block truncate font-medium underline-offset-4 hover:underline"
        >
          {habit.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {describeSchedule(habit.weekdays)} · Archived {archivedOn} · Best streak{' '}
          {habit.bestStreak}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={restore.isPending}
        onClick={() =>
          restore.mutate(
            { id: habit.id, archived: false },
            { onSuccess: () => toast.success(`Habit “${habit.name}” restored`) },
          )
        }
      >
        {restore.isPending ? <Spinner /> : <ArchiveRestoreIcon />}
        Restore
      </Button>
    </li>
  );
}

export function ArchivePage() {
  const today = useToday();
  const habits = useHabits(today, true);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="text-sm text-muted-foreground">
          Archived habits keep their history and can be restored at any time.
        </p>
      </div>

      {habits.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : habits.isError ? (
        <QueryError error={habits.error} onRetry={() => habits.refetch()} />
      ) : habits.data.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveIcon />
            </EmptyMedia>
            <EmptyTitle>The archive is empty</EmptyTitle>
            <EmptyDescription>
              Archive a habit from its page to hide it from Today without losing its history.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {habits.data.map((habit) => (
              <ArchivedRow key={habit.id} habit={habit} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
