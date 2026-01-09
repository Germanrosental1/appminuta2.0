import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { WizardProvider } from "@/context/WizardContext";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useCSRFProtection } from "@/hooks/useCSRF";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/LoginPage";
import { PerfilIncompletoPage } from "./pages/error/PerfilIncompletoPage";
import { ForceChangePasswordPage } from "./pages/ForceChangePasswordPage";
import MobileBlocker from "@/components/MobileBlocker";
import { rbacApi } from '@/services/rbac';
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Lazy loading de componentes pesados
const Wizard = lazy(() => import("./pages/Wizard"));
const DashboardComercial = lazy(() => import("./pages/comercial/DashboardComercial"));
const DashboardAdmin = lazy(() => import("./pages/admin/DashboardAdmin"));
const DashboardFirmante = lazy(() => import("./pages/firmante/DashboardFirmante"));

// Helper functions to reduce complexity
async function verifyRole(
  requiredRole: string,
  hasRole: (role: string) => boolean,
  refreshRoles: () => Promise<void>
): Promise<boolean> {
  if (hasRole(requiredRole)) {
    return true;
  }

  // Lazy check via API
  const hasAccess = await rbacApi.checkRole(requiredRole);
  if (hasAccess) {
    await refreshRoles();
    return true;
  }
  return false;
}

async function determineRedirect(): Promise<string> {
  const isComercial = await rbacApi.checkRole('comercial');
  if (isComercial) return "/comercial/dashboard";

  const isFirmante = await rbacApi.checkRole('firmante');
  if (isFirmante) return "/firmante/dashboard";

  const isViewer = await rbacApi.checkRole('viewer');
  if (isViewer) return "/viewer/dashboard";

  return "/admin/dashboard";
}

// Componente de protección para rutas que requieren autenticación
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'comercial' | 'administrador' | 'viewer' | 'firmante' }) => {
  const { user, loading, hasRole, refreshRoles } = useAuth();
  const [checkingPassword, setCheckingPassword] = React.useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = React.useState(false);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [redirectPath, setRedirectPath] = React.useState<string | null>(null);

  // Verificar si requiere cambio de contraseña Y rol
  React.useEffect(() => {
    const checkRequirements = async () => {
      if (!user) {
        setCheckingPassword(false);
        setIsAuthorized(false);
        return;
      }

      try {
        // 1. Check Password Requirement
        const { data } = await supabase
          .from('profiles')
          .select('require_password_change')
          .eq('id', user.id)
          .single();

        const pwdRequired = data?.require_password_change || false;
        setRequiresPasswordChange(pwdRequired);

        if (pwdRequired) {
          setCheckingPassword(false);
          return; // Stop checks if password change needed
        }

        // 2. Check Role (Lazy Load)
        if (requiredRole) {
          const authorized = await verifyRole(requiredRole, hasRole, async () => {
            await refreshRoles();
          });
          setIsAuthorized(authorized);

          if (!authorized) {
            const path = await determineRedirect();
            setRedirectPath(path);
          }
        } else {
          setIsAuthorized(true);
          void refreshRoles(); // Fire and forget
        }

      } catch (err) {
        console.error('Error checking requirements:', err);
        setRequiresPasswordChange(false);
        setIsAuthorized(false);
      } finally {
        setCheckingPassword(false);
      }
    };

    if (!loading) {
      checkRequirements();
    }
  }, [user, loading, requiredRole, hasRole, refreshRoles]);

  if (loading || checkingPassword || isAuthorized === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-gray-500">Verificando permisos...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiresPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  // Si falló la autorización y tenemos path de redirección
  if (isAuthorized === false) {
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    // Fallback default
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

// Componente especial para la página de cambio de contraseña 
// Solo permite acceso si el usuario está autenticado Y requiere cambio de contraseña
const PasswordChangeRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  // Si no hay usuario, login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si NO requiere cambio de contraseña, redirigir al dashboard según rol RBAC
  if (!user.require_password_change) {
    // comercial → dashboard comercial
    // administrador, firmante, viewer → dashboard admin
    if (hasRole('comercial')) {
      return <Navigate to="/comercial/dashboard" replace />;
    } else {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// Importar queryClient optimizado
import { queryClient } from '@/lib/queryClient';

// Definir las rutas
const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/change-password",
    element: (
      <PasswordChangeRoute>
        <ForceChangePasswordPage />
      </PasswordChangeRoute>
    )
  },
  {
    path: "/perfil-incompleto",
    element: <PerfilIncompletoPage />
  },
  {
    path: "/wizard",
    element: (
      <ProtectedRoute requiredRole="comercial">
        <Suspense fallback={<LoadingSpinner />}>
          <Wizard />
        </Suspense>
      </ProtectedRoute>
    )
  },
  {
    path: "/comercial",
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
      // Ruta eliminada - ahora usamos un modal en lugar de una página separada
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
    // Ruta catch-all para 404
    path: "*",
    element: <NotFound />
  }
];

// Crear el router con opciones estándar
// Nota: Los future flags mencionados en las advertencias no están disponibles en la versión actual
// de React Router que estamos utilizando. Se implementarán correctamente cuando actualicemos a v7.
const router = createBrowserRouter(routes);

// Componente wrapper para inicializar CSRF
const AppWrapper = () => {
  useCSRFProtection();

  return (
    <>
      <Toaster />
      <Sonner />
      <MobileBlocker>
        <RouterProvider router={router} />
      </MobileBlocker>
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WizardProvider>
          <AppWrapper />
          {/* ⚡ OPTIMIZACIÓN: DevTools solo en desarrollo */}
          {import.meta.env.DEV && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </WizardProvider>
      </AuthProvider>
    </QueryClientProvider>
  </TooltipProvider>
);

export default App;
