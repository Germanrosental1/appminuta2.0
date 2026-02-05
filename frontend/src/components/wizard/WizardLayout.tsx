import React from "react";
import { useWizard } from "@/context/WizardContext";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WizardLayoutProps {
  children: React.ReactNode;
  onNext?: () => boolean;
  onBack?: () => void;
  hideNavigation?: boolean;
  finalStep?: boolean;
  isEditMode?: boolean; // En modo edición, no puede volver al paso 1
}

// Definir títulos base
const TITLES_BASE = [
  "Proyecto y Unidad",
  "Propietarios",
  "Precio y Forma de Pago",
  "Condiciones",
  "Observaciones",
  "Revisión",
  "Firmas",
  "Generar",
];

const TITLES_CONTADO = [
  "Proyecto y Unidad",
  "Propietarios",
  "Precio y Forma de Pago",
  "Condiciones",
  "Observaciones",
  "Revisión",
  "Firmas",
];

// Iconos para cada paso
const STEP_ICONS = [
  "apartment",      // Proyecto y Unidad
  "group",          // Propietarios
  "payments",       // Precio y Forma de Pago
  "gavel",          // Condiciones
  "description",    // Observaciones
  "rate_review",    // Revisión
  "draw",           // Firmas
  "task",           // Generar
];

// Descripciones para cada paso
const STEP_DESCRIPTIONS: Record<string, string> = {
  "Proyecto y Unidad": "Selecciona el contexto del proyecto y agrega las unidades (departamentos, estacionamientos, bodegas) que formarán parte de la minuta.",
  "Propietarios": "Define los propietarios y sus porcentajes de participación en cada unidad.",
  "Precio y Forma de Pago": "Establece el precio de venta y las condiciones de pago acordadas.",
  "Condiciones": "Especifica las condiciones particulares y cláusulas del acuerdo.",
  "Observaciones": "Agrega observaciones adicionales o comentarios relevantes para la operación.",
  "Revisión": "Revisa y verifica toda la información ingresada antes de continuar.",
  "Firmas": "Obtén las firmas digitales de las partes involucradas.",
  "Generar": "Genera y descarga el documento final de la minuta.",
};

// WizardLayout component definition
export const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  onNext,
  onBack,
  hideNavigation = false,
  finalStep = false,
  isEditMode = false,
}) => {
  const { currentStep, setCurrentStep, resetWizard, data } = useWizard();
  const { user } = useAuth();

  // Determine array based on payment type
  const titles = data.tipoPago === "contado" ? [...TITLES_CONTADO] : [...TITLES_BASE];

  // Insert extra step if IVA applies
  if (data.ivaProyecto === "no incluido") {
    titles.splice(3, 0, "Impuestos (IVA)");
  }

  // Calculate progress
  const progress = ((currentStep + 1) / titles.length) * 100;

  const handleBack = () => {
    if (isEditMode && currentStep === 1) {
      toast.error("En modo edición no puedes cambiar el proyecto/unidad");
      return;
    }

    if (onBack) {
      onBack();
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (onNext) {
      const canProceed = onNext();
      if (canProceed && currentStep < titles.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else if (currentStep < titles.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const userName = user?.Nombre && user?.Apellido ? `${user.Nombre} ${user.Apellido}` : user?.email || 'Usuario';
  const userRole = user?.Roles?.Nombre || 'Agente Inmobiliario';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Steps (Desktop) */}
      <aside className="hidden w-64 flex-col border-r border-border bg-[#1a2233] lg:flex">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            {/* Logo/Header */}
            <div className="flex flex-col gap-1 mb-4 px-2">
              <h1 className="text-white text-lg font-bold leading-tight">Gestión Inmobiliaria</h1>
              <p className="text-muted-foreground text-xs font-normal leading-normal">Asistente de Minutas</p>
            </div>

            {/* Navigation Steps */}
            <nav className="flex flex-col gap-2">
              {titles.map((title, index) => {
                const isActive = currentStep === index;
                const isCompleted = index < currentStep;
                const icon = STEP_ICONS[index] || "circle";

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (isEditMode && index === 0) {
                        toast.error("En modo edición no puedes cambiar el proyecto/unidad");
                        return;
                      }
                      setCurrentStep(index);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium leading-normal transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : isCompleted
                          ? "text-muted-foreground hover:bg-secondary hover:text-white"
                          : "text-muted-foreground hover:bg-secondary hover:text-white"
                    )}
                  >
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                    <span>{title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Info at Bottom */}
          <div className="flex items-center gap-3 px-2 py-3 border-t border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-white text-sm font-medium leading-tight truncate">{userName}</p>
              <p className="text-muted-foreground text-xs leading-tight truncate">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[#0f131a]">
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        </div>

        {/* Mobile Header (visible only on small screens) */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-[#111622] px-4 lg:hidden z-20">
          <span className="font-bold text-white">Paso {currentStep + 1}: {titles[currentStep]}</span>
          <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 lg:hidden">
              <Progress value={progress} className="h-2 w-full" />
            </div>

            {/* Header Section */}
            <div className="mb-8">
              <div className="mb-3">
                <span className="text-primary text-sm font-semibold tracking-wide uppercase">
                  PASO {currentStep + 1} DE {titles.length}
                </span>
              </div>
              <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight font-display mb-3">
                {titles[currentStep]}
              </h1>
              {STEP_DESCRIPTIONS[titles[currentStep]] && (
                <p className="text-muted-foreground text-base font-medium max-w-3xl">
                  {STEP_DESCRIPTIONS[titles[currentStep]]}
                </p>
              )}
            </div>

            {/* Content Card */}
            {children}
          </div>
        </main>

        {/* Footer Navigation (Sticky) */}
        {!hideNavigation && (
          <footer className="h-20 border-t border-[#334366] bg-[#111622] px-8 flex items-center justify-between z-20">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || (isEditMode && currentStep === 1)}
              className="text-[#92a4c8] hover:text-white hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            <div className="flex gap-4">
              {!finalStep && (
                <Button
                  onClick={handleNext}
                  className="h-12 bg-primary px-8 text-base font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-600 rounded-xl"
                >
                  Siguiente Paso
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
