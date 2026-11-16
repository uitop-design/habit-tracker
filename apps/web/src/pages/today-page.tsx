import { ChevronDownIcon, ListChecksIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useHabits } from '@/api/habits';
import type { HabitWithProgress } from '@/api/schemas';
import { HabitFormDialog } from '@/components/habits/habit-form-dialog';
import { HabitRow } from '@/components/habits/habit-row';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToday } from '@/hooks/use-today';
import { formatLongDate } from '@/lib/dates';

function HabitList({ habits, today }: { habits: HabitWithProgress[]; today: string }) {
  return (
    <Card className="py-0">
      <ul className="divide-y">
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} today={today} />
        ))}
      </ul>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function TodayPage() {
  const today = useToday();
  const habits = useHabits(today);
  const [formOpen, setFormOpen] = useState(false);

  const all = habits.data ?? [];
  const scheduled = all.filter((habit) => habit.scheduledToday);
  const unscheduled = all.filter((habit) => !habit.scheduledToday);
  const done = scheduled.filter((habit) => habit.doneToday).length;

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Today</p>
          <h1 className="text-2xl font-semibold tracking-tight">{formatLongDate(today)}</h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon />
          New habit
        </Button>
      </div>

      {habits.isPending ? (
        <TodaySkeleton />
      ) : habits.isError ? (
        <QueryError error={habits.error} onRetry={() => habits.refetch()} />
      ) : all.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecksIcon />
            </EmptyMedia>
            <EmptyTitle>No habits yet</EmptyTitle>
            <EmptyDescription>
              Create your first habit and check it off every day you do it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon />
              New habit
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Card className="py-4">
            <CardContent className="grid gap-3 px-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {done} of {scheduled.length} done
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {scheduled.length === 0 ? 0 : Math.round((done / scheduled.length) * 100)}%
                </span>
              </div>
              <Progress
                value={scheduled.length === 0 ? 0 : (done / scheduled.length) * 100}
                aria-label="Today's progress"
              />
            </CardContent>
          </Card>

          {scheduled.length > 0 ? (
            <HabitList habits={scheduled} today={today} />
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing is scheduled for today. Enjoy the day off!
            </p>
          )}

          {unscheduled.length > 0 && (
            <Collapsible className="grid gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="group w-fit text-muted-foreground">
                  <ChevronDownIcon className="transition-transform group-data-[state=open]:rotate-180" />
                  Not scheduled today ({unscheduled.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <HabitList habits={unscheduled} today={today} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
