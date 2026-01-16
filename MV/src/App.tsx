import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard/index";
import DashboardLayout from "./pages/DashboardLayout";
import SalesMapView from "./pages/SalesMapView";
import UnitsListPage from "./pages/UnitsListPage";
import UnitEditPage from "./pages/UnitEditPage";
import DiagnosticPage from "./pages/DiagnosticPage";
import PriceAdjustmentPage from "./pages/PriceAdjustmentPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
