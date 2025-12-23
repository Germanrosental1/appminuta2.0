import React, { useRef } from "react";
import { ResumenCompleto } from "../ResumenCompleto";
import { useWizard } from "@/context/WizardContext";
import { ConfirmarGuardarMinutaDefinitiva } from "@/components/minutas/ConfirmarGuardarMinutaDefinitiva";

export const Step6Salida: React.FC = () => {
  const { data } = useWizard();
  const resumenRef = useRef<HTMLDivElement>(null);

  /**
   * Genera un PDF a partir del resumen del wizard
   * NOTA: Funcionalidad temporalmente deshabilitada
  const handleDownloadPDF = async () => {
    if (!resumenRef.current) return;

    try {
      setIsGeneratingPDF(true);

      // Crear nombre del archivo
      const fileName = `Minuta_${data.proyecto || 'Proyecto'}_${data.unidad || 'Unidad'}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Configuración del PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Obtener el elemento del resumen
      const element = resumenRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Mayor escala para mejor calidad
        useCORS: true,
        logging: false,
        allowTaint: true
      });

      // Convertir el canvas a imagen
      const imgData = canvas.toDataURL('image/jpeg', 1);

      // Calcular dimensiones para ajustar al PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Añadir la primera página
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Añadir páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar el PDF
      pdf.save(fileName);

    } catch (error) {
      alert('Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Resumen de la Operación</h2>
        <div className="flex gap-2">
          <ConfirmarGuardarMinutaDefinitiva
            unidadId={data.unidad}
            wizardData={data}
            onSuccess={() => {
              alert('Minuta guardada exitosamente. Puedes verla en tu dashboard.');
            }}
          />
          {/* Botón de descarga de PDF temporalmente deshabilitado
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar PDF
              </>
            )}
          </Button>
          */}
        </div>
      </div>

      <div ref={resumenRef}>
        <ResumenCompleto forPDF={false} />
      </div>
    </div>
  );
};
