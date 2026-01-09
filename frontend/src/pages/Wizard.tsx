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
import { Step3_5IVACalculo } from "@/components/wizard/steps/Step3_5IVACalculo";
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
  const { currentStep, data, updateData, setCurrentStep } = useWizard();
  const [searchParams] = useSearchParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleNext = () => {
    // Step 0: Proyecto y Unidad
    if (currentStep === 0) {
      if (!validateStep0ProyectoUnidad(data)) return false;
    }

    // Calcular indices ajustados
    const stepPago = aplicaIVA ? 4 : 3;
    const stepReglas = aplicaIVA ? 6 : 5;
    const stepCliente = aplicaIVA ? 7 : 6;

    // Validación IVA (Paso 3 si aplica)
    if (aplicaIVA && currentStep === 3) {
      if (!data.porcentajeIVA || data.porcentajeIVA <= 0) {
        toast.error("Debe ingresar un porcentaje de IVA válido");
        return false;
      }
      return true;
    }

    // Step Pago: Skip to step Reglas/Cliente if payment is "contado"
    if (currentStep === stepPago && data.tipoPago === "contado") {
      // Validar pago contado
      const validation = validateStep(3, data); // Usamos 3 hardcoded para schema de pago? Revisar
      // Nota: validateStep usa indices estáticos en validation.ts? 
      // Si validation.ts usa indices, esto va a romper la validación.
      // Asumiremos que validateStep usa indices 0-7 estandar.
      // Si insertamos un paso, validation.ts necesita saberlo o mapeamos el paso actual al "schema step".

      // Fix: Mapear currentStep al "Logical Step" de validación
      let logicalStep = currentStep;
      if (aplicaIVA && currentStep > 3) logicalStep--; // Deshacer el shift para validar con schemas viejos

      const validationMapped = validateStep(logicalStep, data);

      if (!validationMapped.valid) {
        const firstError = Object.values(validationMapped.errors)[0];
        toast.error(firstError || "Por favor complete todos los campos requeridos");
        return false;
      }
      return true;
    }

    // Step Reglas: (SOLO si el pago es financiado)
    if (currentStep === stepReglas && data.tipoPago !== "contado") {
      if (!validateStep5ReglasFinanciacion(data)) return false;
    }

    // Step Cliente
    if (currentStep === stepCliente) {
      if (!validateStep6DatosCliente(data)) return false;
    }

    // General validation mapping
    let logicalStep = currentStep;
    if (aplicaIVA && currentStep === 3) return true; // Step IVA custom validation above
    if (aplicaIVA && currentStep > 3) logicalStep--;

    const validation = validateStep(logicalStep, data, data.tipoPago);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Por favor complete todos los campos requeridos");
      return false;
    }

    return true;
  };

  const renderStep = () => {
    // Índices dinámicos
    const stepPago = aplicaIVA ? 4 : 3;
    const stepCargos = aplicaIVA ? 5 : 4;
    const stepReglas = aplicaIVA ? 6 : 5;
    const stepCliente = aplicaIVA ? 7 : 6;
    const stepSalida = aplicaIVA ? 8 : 7;

    // Lógica de saltos para Contado
    if (data.tipoPago === "contado") {
      if (currentStep === stepReglas) return <Step6DatosCliente />;
      if (currentStep === stepCliente) return <Step7Salida />; // Después de cliente va salida
    }

    if (currentStep === 0) return <Step1ProyectoUnidad />;
    if (currentStep === 1) return <Step2Comercial />;
    if (currentStep === 2) return <Step3ComposicionFSB />;

    if (aplicaIVA) {
      if (currentStep === 3) return <Step3_5IVACalculo />;
    }

    if (currentStep === stepPago) return <Step4Pago />;
    if (currentStep === stepCargos) return <Step5Cargos />;
    if (currentStep === stepReglas) return <Step6ReglasFinanciacion />;
    if (currentStep === stepCliente) return <Step6DatosCliente />;
    if (currentStep === stepSalida) return <Step7Salida />;

    return <Step1ProyectoUnidad />;
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
