import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWizard } from "@/context/WizardContext";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { Step1ProyectoUnidad } from "@/components/wizard/steps/Step1ProyectoUnidad";
import { Step2Comercial } from "@/components/wizard/steps/Step2Comercial";
import { Step3ComposicionFSB } from "@/components/wizard/steps/Step3ComposicionFSB";
import { Step4Pago } from "@/components/wizard/steps/Step4Pago";
import { Step5Cargos } from "@/components/wizard/steps/Step5Cargos";
import { Step6ReglasFinanciacion } from "@/components/wizard/steps/Step6ReglasFinanciacion";
import { Step6Salida as Step7Salida } from "@/components/wizard/steps/Step6Salida";
import { validateStep } from "@/utils/validation";
import { toast } from "sonner";
import { getMinutaDefinitivaById } from "@/services/minutas";

import { WizardData } from "@/types/wizard";

// Helper: Validate Step 0 (Proyecto y Unidad)
function validateStep0ProyectoUnidad(data: WizardData): boolean {
  const step1Component = document.querySelector('[data-step="1"]');

  if (step1Component) {
    const errorFields = step1Component.querySelectorAll('.border-destructive');
    if (errorFields.length > 0) {
      toast.error("Por favor complete todos los campos requeridos");
      return false;
    }
  }

  if (!data.proyecto) {
    toast.error("Debe seleccionar un proyecto");
    return false;
  }

  if (!data.unidad) {
    toast.error("Debe seleccionar una unidad");
    return false;
  }

  if (!data.fechaPosesion) {
    toast.error("Debe ingresar la fecha de posesión");
    return false;
  }

  return true;
}

// Helper: Validate Step 5 (Reglas de Financiación)
function validateStep5ReglasFinanciacion(data: WizardData): boolean {
  // Calcular saldo restante A
  const totalReglasA = (data.reglasFinanciacionA || [])
    .filter(regla => regla.activa)
    .reduce((sum, regla) => {
      if (regla.moneda === "USD") {
        return sum + (regla.saldoFinanciar * (data.tcValor || 1));
      }
      return sum + regla.saldoFinanciar;
    }, 0);

  const saldoRestanteA = Math.max((data.totalFinanciarArs || 0) - totalReglasA, 0);

  // Calcular saldo restante B
  const totalReglasB = (data.reglasFinanciacionB || [])
    .filter(regla => regla.activa)
    .reduce((sum, regla) => sum + regla.saldoFinanciar, 0);

  const saldoRestanteB = Math.max((data.totalFinanciarUsd || 0) - totalReglasB, 0);

  if (saldoRestanteA > 0 || saldoRestanteB > 0) {
    toast.error("Debe cubrir el 100% del saldo a financiar con reglas de financiación");
    return false;
  }

  return true;
}

const Wizard: React.FC = () => {
  const { currentStep, data, updateData, setCurrentStep } = useWizard();
  const [searchParams] = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Detectar modo edición y cargar minuta
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsLoading(true);
      setIsEditMode(true);

      getMinutaDefinitivaById(editId)
        .then((minuta) => {
          if (minuta?.datos) {
            // Cargar datos de la minuta en el wizard
            updateData({
              ...minuta.datos,
              // Mantener el ID de la minuta para actualizar en lugar de crear
              minutaId: editId,
            });
            // Empezar desde el paso 2 (index 1)
            setCurrentStep(1);
            toast.success("Minuta cargada para edición");
          }
        })
        .catch((err) => {
          toast.error("Error al cargar la minuta");
          console.error(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  const handleNext = () => {
    // Step 0: Proyecto y Unidad
    if (currentStep === 0) {
      if (!validateStep0ProyectoUnidad(data)) return false;
    }

    // Step 3: Skip to step 5 if payment is "contado"
    if (currentStep === 3 && data.tipoPago === "contado") {
      const validation = validateStep(currentStep, data);
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError || "Por favor complete todos los campos requeridos");
        return false;
      }
      return true;
    }

    // Step 5: Reglas de Financiación
    if (currentStep === 5) {
      if (!validateStep5ReglasFinanciacion(data)) return false;
    }

    // General validation for all steps
    const validation = validateStep(currentStep, data);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Por favor complete todos los campos requeridos");
      return false;
    }

    return true;
  };

  const renderStep = () => {
    // Si el tipo de pago es "contado" y estamos en el paso 5 (que normalmente sería Reglas de Financiación),
    // mostrar directamente el paso 7 (Salida)
    if (data.tipoPago === "contado" && currentStep === 5) {
      return <Step7Salida />;
    }

    switch (currentStep) {
      case 0:
        return <Step1ProyectoUnidad />;
      case 1:
        return <Step2Comercial />;
      case 2:
        return <Step3ComposicionFSB />;
      case 3:
        return <Step4Pago />;
      case 4:
        return <Step5Cargos />;
      case 5:
        return <Step6ReglasFinanciacion />;
      case 6:
        return <Step7Salida />;
      default:
        return <Step1ProyectoUnidad />;
    }
  };

  // Determinar si estamos en el paso final
  const isFinalStep = currentStep === 6 || (data.tipoPago === "contado" && currentStep === 5);

  // Loading state mientras carga la minuta
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <WizardLayout onNext={handleNext} finalStep={isFinalStep} isEditMode={isEditMode}>
      {renderStep()}
    </WizardLayout>
  );
};

export default Wizard;
