import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { authApi } from './api/endpoints';
import { AppLayout } from './components/AppLayout';

const ServiceOrdersPage = lazy(() => import('./routes/ServiceOrdersPage.tsx'));
const PrintServiceOrderPage = lazy(() => import('./routes/PrintServiceOrderPage.tsx'));
const CustomersPage = lazy(() => import('./routes/CustomersPage.tsx'));
const VehiclesPage = lazy(() => import('./routes/VehiclesPage.tsx'));
const LoginPage = lazy(() => import('./routes/LoginPage.tsx'));
const ExpensesPage = lazy(() => import('./routes/ExpensesPage.tsx'));
const DashboardPage = lazy(() => import('./routes/DashboardPage.tsx'));
const CategoriesPage = lazy(() => import('./routes/CategoriesPage.tsx'));
const CalendarPage = lazy(() => import('./routes/CalendarPage.tsx'));

// Root route
export const rootRoute = createRootRoute();

// Rota pai para todas as rotas protegidas
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AppLayout,
  beforeLoad: async () => {
    try {
      await authApi.me();
    } catch {
      throw redirect({ to: '/login' });
    }
  },
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <Suspense>
      <LoginPage />
    </Suspense>
  ),
});

export const printServiceOrderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ordens-servico/impressao',
  beforeLoad: async () => {
    try {
      await authApi.me();
    } catch {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <Suspense>
      <PrintServiceOrderPage />
    </Suspense>
  ),
});

export const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: () => (
    <Suspense>
      <ServiceOrdersPage />
    </Suspense>
  ),
});

export const serviceOrdersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/ordens-servico',
  component: () => (
    <Suspense>
      <ServiceOrdersPage />
    </Suspense>
  ),
});

export const expensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/financeiro/despesas',
  component: () => (
    <Suspense>
      <ExpensesPage />
    </Suspense>
  ),
});

export const customersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/clientes',
  component: () => (
    <Suspense>
      <CustomersPage />
    </Suspense>
  ),
});

export const budgetsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/orcamentos',
  beforeLoad: () => {
    throw redirect({ to: '/ordens-servico' });
  },
});

export const vehiclesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/veiculos',
  component: () => (
    <Suspense>
      <VehiclesPage />
    </Suspense>
  ),
});

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/financeiro',
  component: () => (
    <Suspense>
      <DashboardPage />
    </Suspense>
  ),
});

export const calendarRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/financeiro/calendar',
  component: () => (
    <Suspense>
      <CalendarPage />
    </Suspense>
  ),
});

export const categoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/financeiro/categories',
  component: () => (
    <Suspense>
      <CategoriesPage />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  printServiceOrderRoute,
  authenticatedRoute.addChildren([homeRoute, serviceOrdersRoute, customersRoute, vehiclesRoute, budgetsRoute, expensesRoute, dashboardRoute, calendarRoute, categoriesRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
