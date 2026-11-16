import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { isNotFound } from '@/api/client';
import {
  useArchiveHabit,
  useDeleteHabit,
  useHabit,
  useHabitStats,
  useToggleCheckin,
} from '@/api/habits';
import type { HabitWithProgress } from '@/api/schemas';
import { HabitDot } from '@/components/habits/habit-dot';
import { HabitFormDialog } from '@/components/habits/habit-form-dialog';
import { YearHeatmap } from '@/components/habits/year-heatmap';
import { QueryError } from '@/components/query-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToday } from '@/hooks/use-today';
import { CHECKIN_FUTURE_DAYS, CHECKIN_PAST_DAYS, shiftDateKey } from '@/lib/dates';
import { describeSchedule } from '@/lib/habits';
import { NotFoundPage } from '@/pages/not-found-page';

const yearOf = (date: string) => Number(date.slice(0, 4));

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;

function HabitActions({ habit }: { habit: HabitWithProgress }) {
  const navigate = useNavigate();
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const archived = habit.archivedAt !== null;

  const toggleArchive = () =>
    archive.mutate(
      { id: habit.id, archived: !archived },
      { onSuccess: () => toast.success(archived ? 'Habit restored' : 'Habit archived') },
    );

  const confirmDelete = () =>
    remove.mutate(habit.id, {
      onSuccess: () => {
        toast.success(`Habit “${habit.name}” deleted`);
        navigate(archived ? '/archive' : '/');
      },
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Habit actions">
            {archive.isPending ? <Spinner /> : <EllipsisVerticalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleArchive} disabled={archive.isPending}>
            {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {archived ? 'Restore' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{habit.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The habit and all of its check-ins will be removed permanently. Archive it instead if
              you want to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {remove.isPending && <Spinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function HabitSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-12 w-2/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {['current', 'best', 'total', 'rate'].map((key) => (
          <Skeleton key={key} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function HabitPage() {
  const { habitId = '' } = useParams();
  const today = useToday();
  const [year, setYear] = useState(() => yearOf(today));
  const habit = useHabit(habitId, today);
  const stats = useHabitStats(habitId, year, today, habit.isSuccess);
  const toggle = useToggleCheckin();

  if (habit.isPending) return <HabitSkeleton />;
  if (habit.isError) {
    return isNotFound(habit.error) ? (
      <NotFoundPage
        title="Habit not found"
        description="It may have been deleted or the link is wrong."
      />
    ) : (
      <QueryError error={habit.error} onRetry={() => habit.refetch()} />
    );
  }

  const data = habit.data;
  const archived = data.archivedAt !== null;
  const minYear = Math.min(yearOf(data.createdAt), yearOf(shiftDateKey(today, -CHECKIN_PAST_DAYS)));
  const maxYear = yearOf(shiftDateKey(today, CHECKIN_FUTURE_DAYS));

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link to={archived ? '/archive' : '/'}>
            <ArrowLeftIcon />
            {archived ? 'Archive' : 'Today'}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
              <HabitDot color={data.color} className="size-3" />
              <span className="truncate">{data.name}</span>
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{describeSchedule(data.weekdays)}</span>
              {archived && <Badge variant="outline">Archived</Badge>}
            </div>
          </div>
          <HabitActions habit={data} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Current streak" value={days(data.currentStreak)} />
        <StatCard label="Best streak" value={days(data.bestStreak)} />
        <StatCard
          label="Total check-ins"
          value={stats.data ? String(stats.data.totalCheckins) : '—'}
        />
        <StatCard
          label="Last 30 days"
          value={stats.data ? `${Math.round(stats.data.completionRate30d * 100)}%` : '—'}
          hint="of scheduled days"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check-ins in {year}</CardTitle>
          <CardAction className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous year"
              disabled={year <= minYear}
              onClick={() => setYear(year - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="w-10 text-center text-sm tabular-nums">{year}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next year"
              disabled={year >= maxYear}
              onClick={() => setYear(year + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {stats.isError ? (
            <QueryError error={stats.error} onRetry={() => stats.refetch()} />
          ) : stats.data ? (
            <YearHeatmap
              year={year}
              dates={stats.data.dates}
              color={data.color}
              weekdays={data.weekdays}
              today={today}
              readOnly={archived}
              onToggle={(date, done) => toggle.mutate({ habitId: data.id, date, done, today })}
            />
          ) : (
            <Skeleton className="h-28 w-full" />
          )}
          <p className="text-xs text-muted-foreground">
            {archived
              ? 'Restore the habit to change its check-ins.'
              : 'Click a day to check it in or out. Days up to a year back can be changed.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
