import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useCreateHabit, useUpdateHabit } from '@/api/habits';
import {
  HABIT_COLORS,
  HABIT_NAME_MAX_LENGTH,
  type Habit,
  type HabitInput,
  habitColorSchema,
} from '@/api/schemas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { COLOR_CLASSES, capitalize, EVERY_DAY, WEEKDAYS, WORKDAYS } from '@/lib/habits';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(HABIT_NAME_MAX_LENGTH, `Name must be at most ${HABIT_NAME_MAX_LENGTH} characters`),
  color: habitColorSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
});

type FormValues = z.input<typeof formSchema>;

const NEW_HABIT: FormValues = { name: '', color: 'green', weekdays: EVERY_DAY };

const PRESETS = [
  { label: 'Every day', days: EVERY_DAY },
  { label: 'Weekdays', days: WORKDAYS },
];

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit;
}

export function HabitFormDialog({ open, onOpenChange, habit }: HabitFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <HabitForm habit={habit} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const isEdit = habit !== undefined;
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit(habit?.id ?? '');
  const pending = createHabit.isPending || updateHabit.isPending;
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: habit
      ? { name: habit.name, color: habit.color, weekdays: habit.weekdays }
      : NEW_HABIT,
  });

  const onSubmit = form.handleSubmit((values) => {
    const input: HabitInput = { ...values, weekdays: [...values.weekdays].sort((a, b) => a - b) };
    const onSuccess = () => {
      toast.success(isEdit ? 'Habit updated' : `Habit “${input.name}” created`);
      onDone();
    };
    if (isEdit) {
      updateHabit.mutate(input, { onSuccess });
    } else {
      createHabit.mutate(input, { onSuccess });
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit habit' : 'New habit'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Schedule changes apply to the whole history of the habit.'
            : 'Pick a name, a color and the days you plan to do it.'}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="habit-name">Name</FieldLabel>
              <Input
                {...field}
                id="habit-name"
                placeholder="Read 20 pages"
                autoComplete="off"
                maxLength={HABIT_NAME_MAX_LENGTH + 10}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="color"
          control={form.control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Color</FieldLegend>
              <ToggleGroup
                type="single"
                spacing={1}
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value);
                }}
                className="flex-wrap"
              >
                {HABIT_COLORS.map((color) => (
                  <ToggleGroupItem
                    key={color}
                    value={color}
                    aria-label={capitalize(color)}
                    className="size-9 rounded-full p-0 data-[state=on]:bg-transparent"
                  >
                    <span
                      className={cn(
                        'size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                        COLOR_CLASSES[color],
                        field.value === color && 'ring-2 ring-foreground',
                      )}
                    />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>
          )}
        />
        <Controller
          name="weekdays"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between gap-2">
                <FieldLegend variant="label" className="mb-0">
                  Days
                </FieldLegend>
                <div className="flex gap-1">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => field.onChange(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={1}
                value={field.value.map(String)}
                onValueChange={(values) => field.onChange(values.map(Number))}
                className="w-full"
              >
                {WEEKDAYS.map((day) => (
                  <ToggleGroupItem
                    key={day.value}
                    value={String(day.value)}
                    aria-label={day.long}
                    className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {day.short}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {isEdit ? 'Save changes' : 'Create habit'}
        </Button>
      </DialogFooter>
    </form>
  );
}
