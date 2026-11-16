import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';
import { TodayPage } from '@/pages/today-page';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
