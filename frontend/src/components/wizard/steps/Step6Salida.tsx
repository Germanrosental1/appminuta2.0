import React, { useRef } from "react";
import { ResumenGrid } from "../ResumenGrid";
import { useWizard } from "@/context/WizardContext";
import { ConfirmarGuardarMinutaDefinitiva } from "@/components/minutas/ConfirmarGuardarMinutaDefinitiva";
import { useToast } from "@/hooks/use-toast";

export const Step6Salida: React.FC = () => {
  const { data } = useWizard();
  const { toast } = useToast();
  const resumenRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Resumen de la Operación</h2>
      </div>

      <div ref={resumenRef}>
        <ResumenGrid data={data} />
      </div>

      {/* Botón de guardar movido al final */}
      <div className="flex justify-end gap-2 mt-6">
        <ConfirmarGuardarMinutaDefinitiva
          unidadId={data.unidad}
          wizardData={data}
          onSuccess={() => {
            toast({
              title: "Éxito",
              description: "Minuta guardada exitosamente. Puedes verla en tu dashboard.",
              duration: 3000,
            });
          }}
        />
      </div>
    </div>
  );
};
