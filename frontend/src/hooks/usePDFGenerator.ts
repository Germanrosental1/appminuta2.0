import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UsePDFGeneratorProps {
    prefix: string;
}

export const usePDFGenerator = ({ prefix }: UsePDFGeneratorProps) => {
    const [procesando, setProcesando] = useState(false);
    const pdfContenidoRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const generarPDF = async (identificador: string) => {
        if (!pdfContenidoRef.current) return;

        try {
            setProcesando(true);

            // Importar jsPDF y html2canvas dinámicamente
            const { default: jsPDF } = await import('jspdf');
            const { default: html2canvas } = await import('html2canvas');

            const canvas = await html2canvas(pdfContenidoRef.current, {
                scale: 1.5,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            let heightLeft = imgHeight;
            let position = 0;

            while (heightLeft > 297) {
                position -= 297;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }

            const nombreArchivo = `${prefix}_${identificador}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(nombreArchivo);

            toast({
                title: "PDF generado",
                description: "El PDF ha sido generado exitosamente",
            });

        } catch (error) {
            console.error('Error al generar PDF:', error);
            toast({
                title: "Error",
                description: "No se pudo generar el PDF",
                variant: "destructive",
            });
        } finally {
            setProcesando(false);
        }
    };

    return { generarPDF, procesando, pdfContenidoRef };
};
