export class MinutaDefinitiva {
    id: string;
    usuario_id: string;
    fecha_creacion: Date | null;
    datos: any; // JSON
    datos_adicionales: any | null; // JSON
    estado: string;
    url_documento: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    proyecto: string;
    comentarios: string | null;
    datos_mapa_ventas: any | null; // JSON
}

export class MinutaProvisoria {
    id: string;
    proyecto: string;
    unidad_id: bigint;
    usuario_id: string;
    fecha_creacion: Date | null;
    datos: any; // JSON
    estado: string;
    comentarios: string | null;
    created_at: Date | null;
    updated_at: Date | null;
}
