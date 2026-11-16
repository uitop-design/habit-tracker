import { useEffect, useMemo, useRef } from 'react';
import type { HabitColor } from '@/api/schemas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatShortDate, isCheckinAllowed, parseDateKey } from '@/lib/dates';
import { COLOR_CLASSES } from '@/lib/habits';
import { buildYearGrid } from '@/lib/heatmap';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: '' },
  { day: 3, label: 'Wed' },
  { day: 4, label: '' },
  { day: 5, label: 'Fri' },
  { day: 6, label: '' },
  { day: 7, label: '' },
];

interface YearHeatmapProps {
  year: number;
  dates: readonly string[];
  color: HabitColor;
  weekdays: readonly number[];
  today: string;
  readOnly: boolean;
  onToggle: (date: string, done: boolean) => void;
}

function isoWeekday(date: string): number {
  return ((parseDateKey(date).getDay() + 6) % 7) + 1;
}

export function YearHeatmap({
  year,
  dates,
  color,
  weekdays,
  today,
  readOnly,
  onToggle,
}: YearHeatmapProps) {
  const grid = useMemo(() => buildYearGrid(year), [year]);
  const done = useMemo(() => new Set(dates), [dates]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element && year === Number(today.slice(0, 4))) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [year, today]);

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-2">
      <div className="inline-grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span />
        <div className="relative h-3">
          {grid.months.map((month) => (
            <span
              key={month.label}
              className="absolute top-0"
              style={{ left: `calc(${month.column} * 15px)` }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-[3px]">
          {WEEKDAY_LABELS.map(({ day, label }) => (
            <span key={day} className="h-3 leading-3">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {grid.weeks.flat().map((cell) => {
            if (!cell.inYear) {
              return <span key={cell.date} className="size-3" />;
            }
            const isDone = done.has(cell.date);
            const scheduled = weekdays.includes(isoWeekday(cell.date));
            const editable = !readOnly && isCheckinAllowed(cell.date, today);
            const status = isDone ? 'Done' : scheduled ? 'Not done' : 'Not scheduled';

            return (
              <Tooltip key={cell.date}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${formatShortDate(cell.date)}: ${status}`}
                    aria-pressed={isDone}
                    aria-disabled={!editable}
                    onClick={() => {
                      if (editable) onToggle(cell.date, !isDone);
                    }}
                    className={cn(
                      'size-3 rounded-[3px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      isDone ? COLOR_CLASSES[color] : scheduled ? 'bg-muted' : 'bg-muted/40',
                      editable ? 'cursor-pointer hover:opacity-75' : 'cursor-default',
                      cell.date > today && 'opacity-40',
                      cell.date === today && 'ring-1 ring-foreground/60',
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {formatShortDate(cell.date)} · {status}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
