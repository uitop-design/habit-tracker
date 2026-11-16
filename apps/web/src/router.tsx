import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
]);
