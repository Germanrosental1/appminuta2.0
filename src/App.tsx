import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { RouterProvider, createBrowserRouter, RouteObject, Navigate } from "react-router-dom";
import { WizardProvider } from "@/context/WizardContext";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index";
import Wizard from "./pages/Wizard";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/LoginPage";
import { DashboardComercial } from "./pages/comercial/DashboardComercial";
import { DashboardAdmin } from "./pages/admin/DashboardAdmin";
import { PerfilIncompletoPage } from "./pages/error/PerfilIncompletoPage";

// Componente de protección para rutas que requieren autenticación
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'comercial' | 'administracion' }) => {
  const { user, loading } = useAuth();
  
  // No hay timeout, simplemente esperar a que se complete la carga
  
  // Mostrar spinner de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-gray-500">Verificando autenticación...</p>
      </div>
    );
  }
  
  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Verificar el rol requerido
  if (requiredRole && user.role !== requiredRole) {
    // Redirigir según el rol del usuario
    if (user.role === 'administracion') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/comercial/dashboard" replace />;
    }
  }
  
  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>;
};

const queryClient = new QueryClient();

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
    path: "/perfil-incompleto",
    element: <PerfilIncompletoPage />
  },
  {
    path: "/wizard",
    element: (
      <ProtectedRoute requiredRole="comercial">
        <Wizard />
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
            <DashboardComercial />
          </ProtectedRoute>
        )
      },
      {
        path: "wizard",
        element: (
          <ProtectedRoute requiredRole="comercial">
            <Wizard />
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
          <ProtectedRoute requiredRole="administracion">
            <DashboardAdmin />
          </ProtectedRoute>
        )
      },
      // Ruta eliminada - ahora usamos un modal en lugar de una página separada
      {
        path: "minutas/:id/definitiva",
        element: (
          <ProtectedRoute requiredRole="administracion">
            <div>Crear Minuta Definitiva (Pendiente)</div>
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WizardProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </WizardProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
