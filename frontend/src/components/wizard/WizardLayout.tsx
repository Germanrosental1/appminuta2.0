import React from "react";
import { useWizard } from "@/context/WizardContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Home } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { validateStep } from "@/utils/validation";
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
  "Proyecto & Unidad",
  "Acuerdo Comercial",
  "Estructura de Pago",
  "Forma de Pago",
  "Cargos & Extras",
  "Reglas de Financiación F/SB",
  "Datos del Cliente",
  "Resumen",
];

const TITLES_CONTADO = [
  "Proyecto & Unidad",
  "Acuerdo Comercial",
  "Estructura de Pago",
  "Forma de Pago",
  "Cargos & Extras",
  "Datos del Cliente",
  "Resumen",
];

// WizardLayout component definition
export const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  onNext,
  onBack,
  hideNavigation = false,
  finalStep = false,
  isEditMode = false,
}) => {
  const { currentStep, setCurrentStep, resetWizard, data, maxStepReached } = useWizard();

  // Determine array based on payment type
  const titles = data.tipoPago === "contado" ? [...TITLES_CONTADO] : [...TITLES_BASE];

  // Insert extra step if IVA applies
  if (data.ivaProyecto === "no incluido") {
    titles.splice(3, 0, "Impuestos (IVA)");
  }

  // Calculate progress
  const progress = ((currentStep + 1) / titles.length) * 100;

  // Validate current step
  const stepValidation = validateStep(currentStep, data, data.tipoPago);
  const isStepValid = stepValidation.valid;

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
    if (!isStepValid) {
      toast.error("Por favor complete los campos requeridos antes de avanzar");
      return;
    }

    if (onNext) {
      const canProceed = onNext();
      if (canProceed && currentStep < titles.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else if (currentStep < titles.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    if (globalThis.confirm('¿Estás seguro de que quieres reiniciar toda la minuta comercial? Todos los datos se perderán.')) {
      resetWizard();
      toast.success("Minuta comercial reiniciada correctamente");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Steps (Desktop) */}
      <aside className="hidden w-80 flex-col border-r border-border bg-card p-6 lg:flex">
        <div className="mb-8 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-lg">apartment</span>
            </span>
            <span>AppMinuta</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-1">
            {titles.map((title, index) => {
              const isActive = currentStep === index;
              const isCompleted = index < currentStep || index < maxStepReached;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (isEditMode && index === 0) {
                      toast.error("En modo edición no puedes cambiar el proyecto/unidad");
                      return;
                    }
                    // Prevent skipping steps if current is invalid, unless going back
                    if (index > currentStep && !isStepValid) {
                      toast.error("Complete el paso actual antes de avanzar");
                      return;
                    }
                    // Allow navigation if previously reached (handled by maxStepReached logic in UI) 
                    // BUT explicitly enforce sequential validation for forward jumps effectively blocked by logic above + maxStepReached implicitly
                    // Just set step if allowed
                    if (index <= maxStepReached || (index === currentStep + 1 && isStepValid)) {
                      setCurrentStep(index);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/20"
                      : isCompleted
                        ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                        : "text-muted-foreground/70 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isActive
                      ? "border-background bg-background text-primary"
                      : isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/30 bg-transparent text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-sm font-bold">check</span>
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className="font-semibold">{title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4" />
            Reiniciar Minuta
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-background">
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        </div>

        {/* Mobile Header (visible only on small screens) */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden z-20">
          <span className="font-bold text-foreground">Paso {currentStep + 1}: {titles[currentStep]}</span>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 lg:hidden">
              <Progress value={progress} className="h-2 w-full" />
            </div>

            <div className="mb-8 hidden lg:block">
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">{titles[currentStep]}</h2>
              <p className="text-muted-foreground">Complete la información solicitada para avanzar.</p>
            </div>

            <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-6 md:p-8 shadow-2xl relative overflow-hidden">
              {/* Glow inside card */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-50"></div>
              {children}
            </div>
          </div>
        </main>

        {/* Footer Navigation (Sticky) */}
        {!hideNavigation && (
          <footer className="h-20 border-t border-border bg-card px-8 flex items-center justify-between z-20">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || (isEditMode && currentStep === 1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            <div className="flex gap-4">
              {!finalStep && (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid}
                  className="h-12 bg-primary px-8 text-base font-bold shadow-lg shadow-blue-500/20 hover:bg-primary/90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
