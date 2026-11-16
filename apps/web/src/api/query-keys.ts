export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (date: string, archived: boolean) => [...habitKeys.lists(), { date, archived }] as const,
  detailOf: (id: string) => [...habitKeys.all, 'detail', id] as const,
  detail: (id: string, date: string) => [...habitKeys.detailOf(id), date] as const,
  statsOf: (id: string) => [...habitKeys.all, 'stats', id] as const,
  stats: (id: string, year: number, date: string) =>
    [...habitKeys.statsOf(id), { year, date }] as const,
};
