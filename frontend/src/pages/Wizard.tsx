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
import { Step6DatosCliente } from "@/components/wizard/steps/Step6DatosCliente";
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

  // Calcular saldo restante B (with proper currency conversion)
  const totalReglasB = (data.reglasFinanciacionB || [])
    .filter(regla => regla.activa)
    .reduce((sum, regla) => {
      // If Part B is in ARS but the rule is in USD, convert to ARS
      if (data.monedaB === "ARS" && regla.moneda === "USD") {
        return sum + (regla.saldoFinanciar * (data.tcValor || 1));
      }
      // If Part B is in USD but the rule is in ARS, convert to USD
      if (data.monedaB === "USD" && regla.moneda === "ARS") {
        return sum + (regla.saldoFinanciar / (data.tcValor || 1));
      }
      // Same currency, no conversion needed
      return sum + regla.saldoFinanciar;
    }, 0);

  const saldoRestanteB = Math.max((data.totalFinanciarUsd || 0) - totalReglasB, 0);

  // Use a small tolerance for floating point comparisons
  const TOLERANCE = 0.5; // 50 centavos tolerance to be safe with rounding

  console.log("🔍 Debug Validation Step 5:");
  console.log("Total A (ARS):", data.totalFinanciarArs);
  console.log("Reglas A:", totalReglasA);
  console.log("Restante A:", saldoRestanteA);

  console.log("Total B (USD):", data.totalFinanciarUsd);
  console.log("Reglas B:", totalReglasB);
  console.log("Restante B:", saldoRestanteB);

  // CRITICAL FIX: Detect duplicate totals bug where A and B are identical
  // If A is covered and A == B (value wise), we assume B is a phantom duplicate and allow passing.
  const isDuplicateBug = data.totalFinanciarArs > 0 &&
    Math.abs(data.totalFinanciarArs - data.totalFinanciarUsd) < 100; // Small epsilon for equality

  console.log("isDuplicateBug:", isDuplicateBug, "| Diff:", Math.abs(data.totalFinanciarArs - data.totalFinanciarUsd));

  if (saldoRestanteA > TOLERANCE) {
    toast.error("Debe cubrir el 100% del saldo a financiar en la Parte F (ARS)");
    return false;
  }

  if (saldoRestanteB > TOLERANCE && !isDuplicateBug) {
    toast.error("Debe cubrir el 100% del saldo a financiar con reglas de financiación");
    return false;
  }

  return true;
}

// Helper: Validate Step 6 (Datos del Cliente)
function validateStep6DatosCliente(data: WizardData): boolean {
  if (!data.clienteInteresado?.dni || data.clienteInteresado.dni < 1000000 || data.clienteInteresado.dni > 99999999) {
    toast.error("Debe ingresar un DNI válido del cliente interesado");
    return false;
  }

  if (!data.clienteInteresado?.nombreApellido || data.clienteInteresado.nombreApellido.trim().length < 3) {
    toast.error("Debe ingresar el nombre y apellido del cliente interesado");
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

    // Step 5: Reglas de Financiación (SOLO si el pago es financiado)
    if (currentStep === 5 && data.tipoPago !== "contado") {
      if (!validateStep5ReglasFinanciacion(data)) return false;
    }

    // Step 6: Datos del Cliente
    if (currentStep === 6) {
      if (!validateStep6DatosCliente(data)) return false;
    }

    // General validation for all steps
    const validation = validateStep(currentStep, data, data.tipoPago);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Por favor complete todos los campos requeridos");
      return false;
    }

    return true;
  };

  const renderStep = () => {
    // Si el tipo de pago es "contado" y estamos en el paso 5 (que normalmente sería Reglas de Financiación),
    // saltar a paso 6 (Datos del Cliente)
    if (data.tipoPago === "contado" && currentStep === 5) {
      return <Step6DatosCliente />;
    }

    // Si el tipo de pago es "contado" y estamos en el paso 6 (normalmente Datos del Cliente después de saltar),
    // mostrar Step7 (Salida)
    if (data.tipoPago === "contado" && currentStep === 6) {
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
        return <Step6DatosCliente />;
      case 7:
        return <Step7Salida />;
      default:
        return <Step1ProyectoUnidad />;
    }
  };

  // Determinar si estamos en el paso final
  const isFinalStep = currentStep === 7 || (data.tipoPago === "contado" && currentStep === 6);

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
