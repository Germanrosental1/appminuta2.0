import React from "react";
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

const Wizard: React.FC = () => {
  const { currentStep, data } = useWizard();

  const handleNext = () => {
    // Validación especial para el paso 1 (Proyecto y Unidad)
    if (currentStep === 0) {
      // Obtener el componente Step1ProyectoUnidad
      const step1Component = document.querySelector('[data-step="1"]');

      // Verificar si hay campos con errores (bordes rojos)
      if (step1Component) {
        const errorFields = step1Component.querySelectorAll('.border-destructive');
        if (errorFields.length > 0) {
          toast.error("Por favor complete todos los campos requeridos");
          return false;
        }
      }

      // Validar que todos los campos requeridos estén completos
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
    }

    // Si estamos en el paso 4 (Pago) y el tipo de pago es "contado", saltear el paso 6 (Reglas de Financiación)
    if (currentStep === 3 && data.tipoPago === "contado") {
      // Verificar si la validación del paso actual es exitosa
      const validation = validateStep(currentStep, data);
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError || "Por favor complete todos los campos requeridos");
        return false;
      }

      // Si estamos avanzando al paso 5 (Cargos), el proceso es correcto
      return true;
    }

    // Validación especial para el paso 6 (Reglas de Financiación)
    if (currentStep === 5) {
      // Calcular saldo restante A
      const totalReglasA = (data.reglasFinanciacionA || [])
        .filter(regla => regla.activa)
        .reduce((sum, regla) => {
          // Si la regla está en USD, convertir a ARS usando el tipo de cambio
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

      // Verificar que ambos saldos restantes sean 0
      if (saldoRestanteA > 0 || saldoRestanteB > 0) {
        toast.error("Debe cubrir el 100% del saldo a financiar con reglas de financiación");
        return false;
      }
    }

    // Validación general para todos los pasos
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

  return (
    <WizardLayout onNext={handleNext} finalStep={isFinalStep}>
      {renderStep()}
    </WizardLayout>
  );
};

export default Wizard;
