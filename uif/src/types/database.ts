export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface FinancialData {
  datos: {
    dolar: string;
    nombreYApellido: string;
  };
  ganancias: {
    anio_fiscal: string;
    fecha_declaracion_jurada: string;
    primera_cat: number;
    segunda_cat_acciones: number;
    segunda_cat_instrumentos: number;
    segunda_cat_dividendos: number;
    tercera_cat: number;
    cuarta_cat: number;
    monto_consumido: number;
  };
  bienes_personales: {
    anio_fiscal: string;
    fecha_declaracion_jurada: string;
    efectivo_pais: number;
    efectivo_exterior: number;
    exento_no_alcanzado: number;
  };
  iva: {
    anio_fiscal: string;
    fecha_declaracion_jurada: string;
    debitos_fiscales: number[]; // Array of 1-12 monthly values
  };
  recibo_haberes: {
    sueldo_neto: number;
  };
  monotributo: {
    categoria: string; // A-K
  };
  certificacion_contable: {
    certificacion_firmada: number;
  };
  otros: {
    venta_propiedad: number;
    arrendamiento: number;
    escriturasCesionesVentas: number;
    blanqueo: number;
  };
  datos_balance: {
    caja_y_bancos: number;
    patrimonio_neto: number;
    ingresos: number;
    costos: number;
    // Legacy fields (kept for backwards compatibility)
    titulos_acciones_bonos?: number;
    ingresos_venta_fabricacion?: number;
    otros_patrimonio_neto?: number;
  };
  // Settings específicos para PJ
  estado_resultados_settings: {
    peso_caja_bancos: number;      // Default 70%
    peso_ingresos: number;         // Default 30%
    porcentaje_patrimonio_neto: number;  // Default 10%
    usar_resultado_bruto: boolean; // Switch: false = Ingresos, true = Resultado Bruto
  };
}

// Monotributo category limits - configurable via Settings page
export const MONOTRIBUTO_CATEGORIES: Record<string, number> = {
  A: 7813063.45,
  B: 11447046.44,
  C: 16050901.57,
  D: 19264300.14,
  E: 23439190.34,
  F: 29374695.9,
  G: 35128502.31,
  H: 53298417.99,
  I: 59657887.55,
  J: 68318860.36,
  K: 82370281.28
};

export interface AnalysisSettings {
  weights: {
    ganancias: number;
    iva: number;
    monotributo: number;
    haberes: number;
    otros: number;
    bienes_personales: number;
    certificacion_contable: number;
    datos_balance: number;
  };
  simulacion: {
    importe_operacion: number;
    aporte_operacion: number;
    cantidad_cuotas: number;
  };
}

export type PersonType = 'PF' | 'PJ';

export interface Client {
  id: string;
  name: string;
  cuit: string | null;
  status: string;
  financial_data: FinancialData;
  analysis_settings: AnalysisSettings;
  person_type: PersonType;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  client_id: string;
  name: string;
  status: string; // 'En Proceso' | 'Finalizado'
  financial_data: FinancialData;
  analysis_settings: AnalysisSettings;
  created_at: string;
}

export type DocumentStatus = 'Pendiente' | 'Procesando' | 'ListoParaRevision' | 'Validado' | 'Error';

export type DocType =
  | 'Ganancias'
  | 'BienesPersonales'
  | 'IVA'
  | 'ReciboHaberes'
  | 'Monotributo'
  | 'CertificacionContable'
  | 'Otros'
  | 'DNI'
  | 'EECC';

export interface ReviewedData {
  anio_fiscal?: string | number;
  categoria?: string;
  sueldo_neto?: number | string;
  certificacion_firmada?: number | string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  client_id: string;
  analysis_id?: string | null; // Optional link to specific analysis
  doc_type: DocType;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  status: DocumentStatus;
  extracted_data: Json | null;
  reviewed_data: Json | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: {
          id?: string;
          name: string;
          cuit?: string | null;
          status?: string;
          financial_data: FinancialData | Json;
          analysis_settings: AnalysisSettings | Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cuit?: string | null;
          status?: string;
          financial_data?: FinancialData | Json;
          analysis_settings?: AnalysisSettings | Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      analyses: {
        Row: Analysis;
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          status?: string;
          financial_data: FinancialData | Json;
          analysis_settings: AnalysisSettings | Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          status?: string;
          financial_data?: FinancialData | Json;
          analysis_settings?: AnalysisSettings | Json;
          created_at?: string;
        };
      };
      documents: {
        Row: Document;
        Insert: {
          id?: string;
          client_id: string;
          analysis_id?: string | null;
          doc_type: string;
          storage_bucket?: string;
          storage_path: string;
          original_filename?: string | null;
          mime_type?: string | null;
          status?: string;
          extracted_data?: Json | null;
          reviewed_data?: Json | null;
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          analysis_id?: string | null;
          doc_type?: string;
          storage_bucket?: string;
          storage_path?: string;
          original_filename?: string | null;
          mime_type?: string | null;
          status?: string;
          extracted_data?: Json | null;
          reviewed_data?: Json | null;
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
      };
    };
  };
}

// Default templates
export const DEFAULT_FINANCIAL_DATA: FinancialData = {
  datos: {
    dolar: "1475",
    nombreYApellido: ""
  },
  ganancias: {
    anio_fiscal: "",
    fecha_declaracion_jurada: "",
    primera_cat: 0,
    segunda_cat_acciones: 0,
    segunda_cat_instrumentos: 0,
    segunda_cat_dividendos: 0,
    tercera_cat: 0,
    cuarta_cat: 0,
    monto_consumido: 0
  },
  bienes_personales: {
    anio_fiscal: "",
    fecha_declaracion_jurada: "",
    efectivo_pais: 0,
    efectivo_exterior: 0,
    exento_no_alcanzado: 0
  },
  iva: {
    anio_fiscal: "",
    fecha_declaracion_jurada: "",
    debitos_fiscales: []
  },
  recibo_haberes: {
    sueldo_neto: 0
  },
  monotributo: {
    categoria: ""
  },
  certificacion_contable: {
    certificacion_firmada: 0
  },
  otros: {
    venta_propiedad: 0,
    arrendamiento: 0,
    escriturasCesionesVentas: 0,
    blanqueo: 0
  },
  datos_balance: {
    caja_y_bancos: 0,
    patrimonio_neto: 0,
    ingresos: 0,
    costos: 0,
    titulos_acciones_bonos: 0,
    ingresos_venta_fabricacion: 0,
    otros_patrimonio_neto: 0
  },
  estado_resultados_settings: {
    peso_caja_bancos: 70,
    peso_ingresos: 30,
    porcentaje_patrimonio_neto: 10,
    usar_resultado_bruto: false
  }
};

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  weights: {
    ganancias: 70,
    iva: 30,
    monotributo: 70,
    haberes: 100,
    otros: 100,
    bienes_personales: 0,
    certificacion_contable: 0,
    datos_balance: 0
  },
  simulacion: {
    importe_operacion: 0,
    aporte_operacion: 0,
    cantidad_cuotas: 24
  }
};

export const DOC_TYPES: DocType[] = [
  'Ganancias',
  'BienesPersonales',
  'IVA',
  'ReciboHaberes',
  'Monotributo',
  'CertificacionContable',
  'Otros',
  'DNI',
  'EECC'
];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  'Ganancias': 'Ganancias',
  'BienesPersonales': 'Bienes Personales',
  'IVA': 'IVA',
  'ReciboHaberes': 'Recibo de Haberes',
  'Monotributo': 'Monotributo',
  'CertificacionContable': 'Certificación Contable',
  'Otros': 'Otros',
  'DNI': 'DNI',
  'EECC': 'Estado de Resultados'
};

export const PJ_DOC_TYPES: DocType[] = ['EECC', 'IVA', 'Otros'];

export const PF_DOC_TYPES: DocType[] = DOC_TYPES.filter(t => t !== 'EECC');
