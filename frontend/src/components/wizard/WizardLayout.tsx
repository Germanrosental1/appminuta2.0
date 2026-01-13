import React from "react";
import { useWizard } from "@/context/WizardContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Home } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
  const { currentStep, setCurrentStep, resetWizard, data } = useWizard();

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

  const handleReset = () => {
    if (globalThis.confirm('¿Estás seguro de que quieres reiniciar toda la minuta comercial? Todos los datos se perderán.')) {
      resetWizard();
      toast.success("Minuta comercial reiniciada correctamente");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">Minuta Comercial</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Paso {currentStep + 1} de {titles.length}</span>
              <span>{Math.round(progress)}% completado</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-lg font-medium text-foreground">{titles[currentStep]}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6" data-step={currentStep + 1}>
          {children}
        </div>

        {/* Navigation */}
        {!hideNavigation && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || (isEditMode && currentStep === 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            {!finalStep && (
              <Button onClick={handleNext}>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
