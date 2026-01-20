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
import { Step35IVACalculo } from "@/components/wizard/steps/Step35IVACalculo";
import { toast } from "sonner";
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
  // Calcular saldo restante A (siempre en ARS)
  const totalReglasA = (data.reglasFinanciacionA || [])
    .filter(regla => regla.activa)
    .reduce((sum, regla) => {
      if (regla.moneda === "USD") {
        return sum + (regla.saldoFinanciar * (data.tcValor || 1));
      }
      return sum + regla.saldoFinanciar;
    }, 0);

  const saldoRestanteA = Math.max((data.totalFinanciarArs || 0) - totalReglasA, 0);

  // Calcular saldo restante B (en la moneda que corresponda)
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

  // Use a small tolerance for floating point comparisons (1 peso/dólar de tolerancia)
  const TOLERANCE = 1.01;

  // Validación 1: Saldo restante F (ARS) debe ser 0
  if (saldoRestanteA > TOLERANCE) {
    toast.error(`El saldo a financiar de la Parte F debe estar cubierto al 100% (faltan $${saldoRestanteA.toFixed(2)} ARS)`);
    return false;
  }

  // Validación 2: Saldo restante SB debe ser 0 (solo si hay monto a financiar en SB)
  if ((data.totalFinanciarUsd || 0) > 0 && saldoRestanteB > TOLERANCE) {
    const moneda = data.monedaB === "USD" ? "USD" : "ARS";
    toast.error(`El saldo a financiar de la Parte SB debe estar cubierto al 100% (faltan $${saldoRestanteB.toFixed(2)} ${moneda})`);
    return false;
  }

  return true;
}

// Helper: Validate Step 6 (Datos del Cliente)
function validateStep6DatosCliente(data: WizardData): boolean {
  // Datos del cliente ahora son opcionales
  return true;
}

const Wizard: React.FC = () => {
  const { currentStep, data } = useWizard();
  const [searchParams] = useSearchParams();
  const [isEditMode] = useState(false);
  const [isLoading] = useState(false);

  // Detectar si aplica IVA
  const aplicaIVA = data.ivaProyecto === "no incluido";

  // Calcular índice real basado en si aplica IVA
  // Si aplica IVA, insertamos el paso extra en index 3
  // Pasos:
  // 0: Proyecto
  // 1: Comercial
  // 2: Composición
  // 3: IVA (Si aplica) -> Si no, este es Pago
  // 4: Pago (Si aplica IVA) -> Si no, Cargos
  // ...

  // Detectar modo edición y cargar minuta
  useEffect(() => {
    // ... (mismo código)
  }, [searchParams]);

  // Extracted validation logic for step Pago
  const validatePagoStep = (aplicaIVA: boolean, currentStep: number) => {
    // Calcular indices
    const stepPago = aplicaIVA ? 4 : 3;

    if (currentStep === stepPago && data.tipoPago === "contado") {
      let logicalStep = currentStep;
      if (aplicaIVA && currentStep > 3) logicalStep--;

      const validationMapped = validateStep(logicalStep, data);
      if (!validationMapped.valid) {
        const firstError = Object.values(validationMapped.errors)[0];
        toast.error(firstError || "Por favor complete todos los campos requeridos");
        return false;
      }
      return true;
    }
    return null; // Not handled
  };

  const validateIVAStep = () => {
    if (!data.porcentajeIVA || data.porcentajeIVA <= 0) {
      toast.error("Debe ingresar un porcentaje de IVA válido");
      return false;
    }
    return true;
  };

  const validateGenericStep = (aplicaIVA: boolean, currentStep: number) => {
    let logicalStep = currentStep;
    if (aplicaIVA && currentStep > 3) logicalStep--;

    const validation = validateStep(logicalStep, data, data.tipoPago);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Por favor complete todos los campos requeridos");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    // Step 0: Proyecto y Unidad
    if (currentStep === 0 && !validateStep0ProyectoUnidad(data)) return false;

    // Validación IVA (Paso 3 si aplica)
    if (aplicaIVA && currentStep === 3 && !validateIVAStep()) return false;

    // Step Pago
    const pagoValidation = validatePagoStep(aplicaIVA, currentStep);
    if (pagoValidation !== null) return pagoValidation;

    const stepReglas = aplicaIVA ? 6 : 5;
    const stepCliente = aplicaIVA ? 7 : 6;

    // Step Reglas
    if (currentStep === stepReglas && data.tipoPago !== "contado") {
      if (!validateStep5ReglasFinanciacion(data)) return false;
    }

    // Step Cliente
    if (currentStep === stepCliente && !validateStep6DatosCliente(data)) return false;

    // Default validation
    return validateGenericStep(aplicaIVA, currentStep);
  };

  const renderStep = () => {
    // Steps mapping for better readability
    const stepsMap: Record<number, JSX.Element> = {
      0: <Step1ProyectoUnidad />,
      1: <Step2Comercial />,
      2: <Step3ComposicionFSB />,
    };

    if (aplicaIVA) {
      stepsMap[3] = <Step35IVACalculo />;
    }

    // Shift indices if IVA applies
    const offset = aplicaIVA ? 1 : 0;
    stepsMap[3 + offset] = <Step4Pago />;
    stepsMap[4 + offset] = <Step5Cargos />;
    stepsMap[5 + offset] = <Step6ReglasFinanciacion />;
    stepsMap[6 + offset] = <Step6DatosCliente />;
    stepsMap[7 + offset] = <Step7Salida />;

    // Handle Contado skips overrides
    if (data.tipoPago === "contado") {
      // Reglas -> Cliente
      if (currentStep === (5 + offset)) return <Step6DatosCliente />;
      // Cliente -> Salida
      if (currentStep === (6 + offset)) return <Step7Salida />;
    }

    return stepsMap[currentStep] || <Step1ProyectoUnidad />;
  };

  // Determinar si estamos en el paso final
  const stepFinalIndex = aplicaIVA ? 8 : 7;
  const stepClienteIndex = aplicaIVA ? 7 : 6;

  const isFinalStep = currentStep === stepFinalIndex || (data.tipoPago === "contado" && currentStep === stepClienteIndex);

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
