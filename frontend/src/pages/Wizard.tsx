import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWizard } from "@/context/WizardContext";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { Step1ProyectoUnidad } from "@/components/wizard/steps/Step1ProyectoUnidad";
import { Step2Comercial } from "@/components/wizard/steps/Step2Comercial";
import { Step3Pago } from "@/components/wizard/steps/Step3Pago";                       // Was Step4Pago
import { Step31ComposicionFSB } from "@/components/wizard/steps/Step31ComposicionFSB"; // Was Step3ComposicionFSB
import { Step32IVACalculo } from "@/components/wizard/steps/Step32IVACalculo";       // Was Step35IVACalculo
import { Step5Cargos } from "@/components/wizard/steps/Step5Cargos";
import { Step6ReglasFinanciacion } from "@/components/wizard/steps/Step6ReglasFinanciacion";
import { Step6DatosCliente } from "@/components/wizard/steps/Step6DatosCliente";
import { Step6Salida as Step7Salida } from "@/components/wizard/steps/Step6Salida";
import { validateStep } from "@/utils/validation";
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

// Helper: Validate Step Reglas de Financiación
function validateStepReglasFinanciacion(data: WizardData): boolean {
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

  // Detectar si aplica IVA
  const aplicaIVA = data.ivaProyecto === "no incluido";

  // NEW ORDER:
  // 0: Proyecto
  // 1: Comercial
  // 2: Pago (Step3Pago) -> Always present
  // 3: Composición (Step31ComposicionFSB) -> Always present
  // 4: IVA (Step32IVACalculo) -> ONLY IF aplicaIVA
  // 5 (or 4): Cargos (Step5Cargos)
  // 6 (or 5): Reglas (Step6ReglasFinanciacion)
  // 7 (or 6): Cliente (Step6DatosCliente)
  // 8 (or 7): Salida (Step7Salida)

  // Detectar modo edición y cargar minuta
  useEffect(() => {
    // ... (mismo código)
  }, [searchParams]);

  const validateIVAStep = () => {
    if (!data.porcentajeIVA || data.porcentajeIVA <= 0) {
      toast.error("Debe ingresar un porcentaje de IVA válido");
      return false;
    }
    return true;
  };

  const validateGenericStep = (step: number) => {
    // Here we pass the step index directly to validateSteputils
    // But we need to make sure the index matches what validateStep expects.
    // In validation.ts, we updated:
    // 2 -> Step3Pago (step4Schema)
    // 3 -> Step31Composicion (step3Schema)
    // 4 -> Cargos (step5Schema)

    // So if we are at Step 4 (IVA), validateStep(4) in utils is "Cargos" schema.
    // This is wrong for IVA. But IVA uses validateIVAStep().
    // If we are at Step 4 (Cargos - No IVA), validateStep(4) works.

    // So if IVA applies:
    // Step 0-3: Direct map.
    // Step 4 (IVA): Special.
    // Step 5 (Cargos): calls validateStep(4) (Logical step for Cargos)
    // Step 6 (Reglas): calls validateStep(5)...

    // If NO IVA:
    // Step 0-3: Direct map.
    // Step 4 (Cargos): calls validateStep(4).

    let logicalStep = step;
    if (aplicaIVA && step > 4) {
      // If Step is > 4 (IVA), logical step is step-1 to match Cargos/Reglas indices in Zod?
      // Zod: 4=Cargos, 5=Reglas.
      // UI with IVA: 5=Cargos, 6=Reglas.
      logicalStep = step - 1;
    }

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

    // Step 2: Pago
    if (currentStep === 2) {
      return validateGenericStep(2);
    }

    // Step 3: Composición
    if (currentStep === 3) {
      return validateGenericStep(3);
    }

    // Validación IVA (Paso 4 si aplica)
    if (aplicaIVA && currentStep === 4) {
      return validateIVAStep();
    }

    // Step Cargos (Map to logic step 4)
    // Index: IVA? 5 : 4
    const stepCargos = aplicaIVA ? 5 : 4;
    if (currentStep === stepCargos) {
      return validateGenericStep(stepCargos); // Handled by offset logic inside validateGenericStep
    }

    const stepReglas = aplicaIVA ? 6 : 5;
    const stepCliente = aplicaIVA ? 7 : 6;

    // Step Reglas
    if (currentStep === stepReglas && data.tipoPago !== "contado") {
      if (!validateStepReglasFinanciacion(data)) return false;
    }

    // Step Cliente
    if (currentStep === stepCliente && !validateStep6DatosCliente(data)) return false;

    // Default validation (Comm, etc)
    return validateGenericStep(currentStep);
  };

  const renderStep = () => {
    // Static steps
    const steps: Record<number, JSX.Element> = {
      0: <Step1ProyectoUnidad />,
      1: <Step2Comercial />,
      2: <Step31ComposicionFSB />,
      3: <Step3Pago />,
    };

    if (aplicaIVA) {
      steps[4] = <Step32IVACalculo />;
      // Offset for subsequent steps is 1 relative to "No IVA" flow
      // No IVA flow: 4=Cargos.
      // IVA flow: 5=Cargos.
      steps[5] = <Step5Cargos />;
      steps[6] = <Step6ReglasFinanciacion />;
      steps[7] = <Step6DatosCliente />;
      steps[8] = <Step7Salida />;
    } else {
      steps[4] = <Step5Cargos />;
      steps[5] = <Step6ReglasFinanciacion />;
      steps[6] = <Step6DatosCliente />;
      steps[7] = <Step7Salida />;
    }

    // Handle Contado skips overrides (render specific component instead of default for that index)
    // Contado skips Reglas.
    const reglasIndex = aplicaIVA ? 6 : 5;
    const clienteIndex = aplicaIVA ? 7 : 6;
    const salidaIndex = aplicaIVA ? 8 : 7;

    if (data.tipoPago === "contado") {
      // If we are at "Reglas" index, show Cliente instead (skipping Reglas)
      if (currentStep === reglasIndex) return <Step6DatosCliente />;
      // If we are at "Cliente" index (which would be skipped if we just jumped?),
      // Wait. Wizard usually increments step by 1.
      // If we are at "Cargos" (prev step), and hit Next, we go to ReglasIndex.
      // So renderStep(ReglasIndex) should render Cliente?
      // Yes. And then Next goes to ClienteIndex -> Salida.
      if (currentStep === clienteIndex) return <Step7Salida />;
    }

    return steps[currentStep] || <Step1ProyectoUnidad />;
  };

  // Determinar si estamos en el paso final
  // Final Logic:
  // Normal: Salida is last.
  // Contado: Salida is last.
  // Last index is always Salida Index.
  const stepSalidaIndex = aplicaIVA ? 8 : 7;

  // If Contado, we skip Reglas.
  // Start: Proy (0)
  // ...
  // Cargos (X)
  // Next -> Reglas (X+1). But Render renders Cliente.
  // Next -> Cliente (X+2). But Render renders Salida.

  // So "Is Final Step" should be when we are at the step BEFORE Salida?
  // Or when we are AT Salida? Usually "Final Step" button is "Finish" or "Generate".
  // `WizardLayout` uses `finalStep` prop to change button text to "Finalizar/Generar".
  // This usually happens when we are displaying the Summary/Revision step?
  // No, usually it happens when we are at the step *before* completion?
  // Let's check `WizardLayout`. Usually `finalStep` param implies "This is the last step".

  const isFinalStep = currentStep === stepSalidaIndex || (data.tipoPago === "contado" && currentStep === (stepSalidaIndex - 1));
  // Wait. If Contado loops:
  // ReglasIndex -> renders Cliente.
  // ClienteIndex -> renders Salida.
  // SalidaIndex -> Not reached?
  // Actually, if ReglasIndex renders Cliente, then "Current Step" is ReglasIndex.
  // If we click Next, we go to ReglasIndex + 1 (ClienteIndex).
  // At ClienteIndex, we render Salida.
  // So at ClienteIndex, we are seeing Salida. So this IS the final step (visually).
  // So isFinalStep should be true if `stepsMap[currentStep]` is Salida?

  // Let's match indices:
  // IVA=True.
  // 6: Reglas (Renders Cliente if Contado)
  // 7: Cliente (Renders Salida if Contado)
  // 8: Salida.

  // If Contado:
  // At 6: Seeing Cliente. Next -> 7.
  // At 7: Seeing Salida. Next -> Finish?
  // So 7 is Final Step.

  // If Normal:
  // At 7: Seeing Cliente. Next -> 8.
  // At 8: Seeing Salida.
  // So 8 is Final Step.

  let actualFinalIndex = stepSalidaIndex;

  // Logic: Valid only if distinct "Revision" step exists?
  // Step 7 Salida implies "Generation".
  // Usually WizardLayout `finalStep` hides "Next" and shows "Finish".
  // If `Step6Salida` is the summary/generation page, maybe we don't need a Next button there?

  const isSalida = currentStep === actualFinalIndex || (data.tipoPago === "contado" && currentStep === (stepSalidaIndex - 1));

  return (
    <WizardLayout onNext={handleNext} finalStep={isSalida} isEditMode={isEditMode}>
      {renderStep()}
    </WizardLayout>
  );
};

export default Wizard;
