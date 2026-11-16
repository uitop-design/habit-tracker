import {
  type QueryClient,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request } from '@/api/client';
import { habitKeys } from '@/api/query-keys';
import {
  emptySchema,
  type HabitInput,
  type HabitStats,
  type HabitWithProgress,
  habitListSchema,
  habitSchema,
  habitStatsSchema,
  habitWithProgressSchema,
} from '@/api/schemas';

export function useHabits(date: string, archived = false) {
  return useQuery({
    queryKey: habitKeys.list(date, archived),
    queryFn: () => request(`/habits?date=${date}&archived=${archived}`, habitListSchema),
  });
}

export function useHabit(id: string, date: string) {
  return useQuery({
    queryKey: habitKeys.detail(id, date),
    queryFn: () => request(`/habits/${id}?date=${date}`, habitWithProgressSchema),
  });
}

export function useHabitStats(id: string, year: number, date: string, enabled = true) {
  return useQuery({
    queryKey: habitKeys.stats(id, year, date),
    queryFn: () => request(`/habits/${id}/stats?year=${year}&date=${date}`, habitStatsSchema),
    placeholderData: (previous) => previous,
    enabled,
  });
}

function useInvalidatingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useCreateHabit() {
  return useInvalidatingMutation((input: HabitInput) =>
    request('/habits', habitSchema, { method: 'POST', body: input }),
  );
}

export function useUpdateHabit(id: string) {
  return useInvalidatingMutation((input: Partial<HabitInput>) =>
    request(`/habits/${id}`, habitSchema, { method: 'PATCH', body: input }),
  );
}

export function useArchiveHabit() {
  return useInvalidatingMutation(({ id, archived }: { id: string; archived: boolean }) =>
    request(`/habits/${id}/${archived ? 'archive' : 'unarchive'}`, habitSchema, {
      method: 'POST',
    }),
  );
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/habits/${id}`, emptySchema, { method: 'DELETE' }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: [...habitKeys.all, 'detail', id] });
      queryClient.removeQueries({ queryKey: habitKeys.statsOf(id) });
      return queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export interface CheckinVariables {
  habitId: string;
  date: string;
  done: boolean;
  today: string;
}

const CHECKIN_MUTATION_KEY = ['checkin'];

function markDone<T extends HabitWithProgress>(habit: T, { habitId, done }: CheckinVariables): T {
  return habit.id === habitId ? { ...habit, doneToday: done } : habit;
}

function applyOptimisticCheckin(queryClient: QueryClient, variables: CheckinVariables) {
  const cache = queryClient.getQueryCache();

  for (const query of cache.findAll({ queryKey: habitKeys.lists() })) {
    const [, , params] = query.queryKey as ReturnType<typeof habitKeys.list>;
    if (params.date !== variables.date) continue;
    queryClient.setQueryData<HabitWithProgress[]>(query.queryKey, (habits) =>
      habits?.map((habit) => markDone(habit, variables)),
    );
  }

  queryClient.setQueryData<HabitWithProgress>(
    habitKeys.detail(variables.habitId, variables.date),
    (habit) => (habit ? markDone(habit, variables) : habit),
  );

  for (const query of cache.findAll({ queryKey: habitKeys.statsOf(variables.habitId) })) {
    const [, , , params] = query.queryKey as ReturnType<typeof habitKeys.stats>;
    if (!variables.date.startsWith(`${params.year}-`)) continue;
    queryClient.setQueryData<HabitStats>(query.queryKey, (stats) => {
      if (!stats) return stats;
      const has = stats.dates.includes(variables.date);
      if (has === variables.done) return stats;
      return {
        ...stats,
        dates: variables.done
          ? [...stats.dates, variables.date].sort()
          : stats.dates.filter((date) => date !== variables.date),
        totalCheckins: stats.totalCheckins + (variables.done ? 1 : -1),
      };
    });
  }
}

export function useToggleCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CHECKIN_MUTATION_KEY,
    mutationFn: ({ habitId, date, done, today }: CheckinVariables) =>
      request(`/habits/${habitId}/checkins/${date}?today=${today}`, emptySchema, {
        method: done ? 'PUT' : 'DELETE',
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.all });
      const snapshot: [QueryKey, unknown][] = queryClient.getQueriesData({
        queryKey: habitKeys.all,
      });
      applyOptimisticCheckin(queryClient, variables);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: CHECKIN_MUTATION_KEY }) === 1) {
        return queryClient.invalidateQueries({ queryKey: habitKeys.all });
      }
    },
  });
}
