import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { appRoutes } from './routes.jsx';

export default function App() {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return <RouterProvider router={router} />;
}
