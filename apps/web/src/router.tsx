import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { HabitPage } from '@/pages/habit-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { TodayPage } from '@/pages/today-page';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'habits/:habitId', element: <HabitPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
