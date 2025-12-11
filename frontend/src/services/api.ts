import { apiFetchBuffer } from '../lib/api-client';
import { WizardData } from "@/types/wizard";

export interface ApiResponse {
  success: boolean;
  data?: ArrayBuffer;
  contentType?: string;
  error?: string;
}

export const postGenerarMinuta = async (payload: WizardData): Promise<ApiResponse> => {
  try {
    const { buffer, contentType } = await apiFetchBuffer('/minutas/generar', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      data: buffer,
      contentType,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al generar minuta",
    };
  }
};

export const generateDemoFile = (): ArrayBuffer => {
  const text = `MINUTA COMERCIAL - MODO DEMO
  
Esta es una simulación de descarga.
En producción, aquí recibirías un PDF o XLSX real desde el webhook de n8n.

Archivo generado: ${new Date().toISOString()}`;

  const encoder = new TextEncoder();
  return encoder.encode(text).buffer;
};
