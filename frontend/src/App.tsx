import React, { lazy, Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { WizardProvider } from "@/context/WizardContext";
import { AuthProvider } from "@/context/AuthContext";
import { useCSRFProtection } from "@/hooks/useCSRF";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/LoginPage";
import { PerfilIncompletoPage } from "./pages/error/PerfilIncompletoPage";
import { ForceChangePasswordPage } from "./pages/ForceChangePasswordPage";
import MobileBlocker from "@/components/MobileBlocker";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordChangeRoute } from "@/components/auth/PasswordChangeRoute";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { PageError } from "@/components/error/PageError";
import { queryClient } from '@/lib/queryClient';

// Lazy loading de componentes pesados
const Wizard = lazy(() => import("./pages/Wizard"));
const DashboardComercial = lazy(() => import("./pages/comercial/DashboardComercial"));
const DashboardAdmin = lazy(() => import("./pages/admin/DashboardAdmin"));
const DashboardFirmante = lazy(() => import("./pages/firmante/DashboardFirmante"));

// Definir las rutas
const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/login" replace />,
    errorElement: <PageError />
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <PageError />
  },
  {
    path: "/change-password",
    element: (
      <PasswordChangeRoute>
        <ForceChangePasswordPage />
      </PasswordChangeRoute>
    ),
    errorElement: <PageError />
  },
  {
    path: "/perfil-incompleto",
    element: <PerfilIncompletoPage />,
    errorElement: <PageError />
  },
  {
    path: "/wizard",
    element: (
      <ProtectedRoute requiredRole="comercial">
        <Suspense fallback={<LoadingSpinner />}>
          <Wizard />
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <PageError />
  },
  {
    path: "/comercial",
    errorElement: <PageError />,
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute requiredRole="comercial">
            <Suspense fallback={<LoadingSpinner />}>
              <DashboardComercial />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "wizard",
        element: (
          <ProtectedRoute requiredRole="comercial">
            <Suspense fallback={<LoadingSpinner />}>
              <Wizard />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "minutas/:id",
        element: (
          <ProtectedRoute requiredRole="comercial">
            <div>Vista de Minuta (Pendiente)</div>
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: "/admin",
    errorElement: <PageError />,
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute requiredRole="administrador">
            <Suspense fallback={<LoadingSpinner />}>
              <DashboardAdmin />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: "minutas/:id/definitiva",
        element: (
          <ProtectedRoute requiredRole="administrador">
            <div>Crear Minuta Definitiva (Pendiente)</div>
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: "/firmante",
    errorElement: <PageError />,
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute requiredRole="firmante">
            <Suspense fallback={<LoadingSpinner />}>
              <DashboardFirmante />
            </Suspense>
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: "/viewer",
    errorElement: <PageError />,
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute requiredRole="viewer">
            <Suspense fallback={<LoadingSpinner />}>
              <DashboardAdmin readOnly={true} />
            </Suspense>
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: "*",
    element: <NotFound />
  }
];

// Crear el router
const router = createBrowserRouter(routes);

// Componente wrapper para inicializar CSRF
const AppTitle = () => {
  React.useEffect(() => {
    document.title = "AppMinuta";
  }, []);
  return null;
};

const AppWrapper = () => {
  useCSRFProtection();

  return (
    <GlobalErrorBoundary>
      <AppTitle />
      <Toaster />
      <Sonner />
      <MobileBlocker>
        <RouterProvider router={router} />
      </MobileBlocker>
    </GlobalErrorBoundary>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WizardProvider>
            <AppWrapper />
            {import.meta.env.DEV && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </WizardProvider>
        </AuthProvider>
      </QueryClientProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
