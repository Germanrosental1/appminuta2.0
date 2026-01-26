export class MinutaDefinitiva {
    id: string;
    usuario_id: string;
    fecha_creacion: Date | null;
    datos: Record<string, any>; // JSON
    datos_adicionales: Record<string, any> | null; // JSON
    estado: string;
    url_documento: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    proyecto: string;
    comentarios: string | null;
    datos_mapa_ventas: Record<string, any> | null; // JSON
}

export class MinutaProvisoria {
    id: string;
    proyecto: string;
    unidad_id: bigint;
    usuario_id: string;
    fecha_creacion: Date | null;
    datos: Record<string, any>; // JSON
    estado: string;
    comentarios: string | null;
    created_at: Date | null;
    updated_at: Date | null;
}
