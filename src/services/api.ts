import { WizardData } from "@/types/wizard";

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "";

export interface ApiResponse {
  success: boolean;
  data?: ArrayBuffer;
  contentType?: string;
  error?: string;
}

export const postGenerarMinuta = async (payload: WizardData): Promise<ApiResponse> => {
  try {
    if (!WEBHOOK_URL) {
      throw new Error("VITE_N8N_WEBHOOK_URL no está configurada");
    }

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to parse error as JSON
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    }

    const contentType = response.headers.get("Content-Type") || "";
    const arrayBuffer = await response.arrayBuffer();

    return {
      success: true,
      data: arrayBuffer,
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
