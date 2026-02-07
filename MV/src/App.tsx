import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";

// ⚡ PERFORMANCE: Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard/index"));
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const SalesMapView = lazy(() => import("./pages/SalesMapView"));
const UnitsListPage = lazy(() => import("./pages/UnitsListPage"));
const UnitEditPage = lazy(() => import("./pages/UnitEditPage"));
const DiagnosticPage = lazy(() => import("./pages/DiagnosticPage"));
const PriceAdjustmentPage = lazy(() => import("./pages/PriceAdjustmentPage"));
const StockHistoryPage = lazy(() => import("./pages/StockHistoryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading spinner component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<Index />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="/map/:mapId" element={<SalesMapView />} />
                <Route path="/units" element={<UnitsListPage />} />

                <Route
                  path="/unit/create"
                  element={
                    <UnitEditPage />
                  }
                />

                {/* superadminmv y adminmv pueden editar */}
                <Route
                  path="/unit/edit/:unitId"
                  element={
                    <ProtectedRoute requireAnyRole={['superadminmv', 'adminmv']}>
                      <UnitEditPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/diagnostic" element={<DiagnosticPage />} />

                {/* Ajuste masivo de precios */}
                <Route path="/price-adjustment" element={<PriceAdjustmentPage />} />

                {/* Historial de Stock */}
                <Route path="/stock-history" element={<StockHistoryPage />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>

    {/* React Query DevTools - Only in development */}
    {import.meta.env.DEV && (
      <ReactQueryDevtools
        initialIsOpen={false}
        position="bottom-right"
        buttonPosition="bottom-right"
      />
    )}
  </QueryClientProvider>
);

export default App;
