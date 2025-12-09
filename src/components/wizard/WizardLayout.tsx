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
}

const STEP_TITLES = [
  "Proyecto & Unidad",
  "Estructura comercial",
  "Composición F/SB",
  "Pago F/SB",
  "Cargos & Extras",
  "Reglas de Financiación F/SB",
  "Tipo de Cambio & Salida",
];

// Títulos para pago de contado (sin paso de financiación)
const STEP_TITLES_CONTADO = [
  "Proyecto & Unidad",
  "Estructura comercial",
  "Composición F/SB",
  "Pago F/SB",
  "Cargos & Extras",
  "Tipo de Cambio & Salida",
];

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  onNext,
  onBack,
  hideNavigation = false,
  finalStep = false,
}) => {
  const { currentStep, setCurrentStep, resetWizard, data } = useWizard();
  
  // Determinar qué conjunto de títulos usar basado en el tipo de pago
  const titles = data.tipoPago === "contado" ? STEP_TITLES_CONTADO : STEP_TITLES;
  
  // Calcular el progreso basado en el conjunto de títulos actual
  const progress = ((currentStep + 1) / titles.length) * 100;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (onNext) {
      const canProceed = onNext();
      if (canProceed && currentStep < STEP_TITLES.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Función de guardar borrador eliminada

  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar toda la calculadora? Todos los datos se perderán.')) {
      resetWizard();
      toast.success("Calculadora reiniciada correctamente");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">Calculadora Comercial</h1>
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
              disabled={currentStep === 0}
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
