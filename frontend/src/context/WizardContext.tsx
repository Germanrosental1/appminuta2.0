import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { WizardData, initialWizardData, GeneratedFile } from "@/types/wizard";

interface WizardContextType {
  data: WizardData;
  currentStep: number;
  generatedFile: GeneratedFile | null;
  demoMode: boolean;
  updateData: (data: Partial<WizardData>) => void;
  setCurrentStep: (step: number) => void;
  setGeneratedFile: (file: GeneratedFile | null) => void;
  setDemoMode: (demo: boolean) => void;
  resetWizard: () => void;
  maxStepReached: number;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

// STORAGE_KEY eliminado

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [generatedFile, setGeneratedFile] = useState<GeneratedFile | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const updateData = useCallback((newData: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Funciones de guardado y carga de borradores eliminadas

  const resetWizard = useCallback(() => {
    setData(initialWizardData);
    setCurrentStep(0);
    setMaxStepReached(0);
    setGeneratedFile(null);
  }, []);

  const handleSetCurrentStep = useCallback((step: number) => {
    setCurrentStep(step);
    setMaxStepReached((prev) => Math.max(step, prev));
  }, []);

  const handleSetGeneratedFile = useCallback((file: GeneratedFile | null) => {
    setGeneratedFile(file);
  }, []);

  const handleSetDemoMode = useCallback((demo: boolean) => {
    setDemoMode(demo);
  }, []);

  // Efectos de auto-guardado y carga eliminados

  const value = React.useMemo(() => ({
    data,
    currentStep,
    generatedFile,
    demoMode,
    maxStepReached,
    updateData,
    setCurrentStep: handleSetCurrentStep,
    setGeneratedFile: handleSetGeneratedFile,
    setDemoMode: handleSetDemoMode,
    resetWizard,
  }), [data, currentStep, generatedFile, demoMode, maxStepReached, updateData, handleSetCurrentStep, handleSetGeneratedFile, handleSetDemoMode, resetWizard]);

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return context;
};
