import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, Document, DocType, FinancialData } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';

interface DocumentReviewDialogProps {
  document: Document;
  client: Client;
  onClose: () => void;
  onUpdate: () => void;
}

// Mapping from doc_type to financial_data section
const DOC_TYPE_TO_SECTION: Record<string, keyof FinancialData> = {
  'Ganancias': 'ganancias',
  'BienesPersonales': 'bienes_personales',
  'IVA': 'iva',
  'ReciboHaberes': 'recibo_haberes',
  'Monotributo': 'monotributo',
  'CertificacionContable': 'certificacion_contable',
  'Otros': 'otros',
  'DNI': 'datos',
  'EECC': 'datos_balance',
};

// Labels for each field in Spanish
const FIELD_LABELS: Record<string, string> = {
  // Ganancias (6 categorías)
  anio_fiscal: 'Año Fiscal',
  fecha_declaracion_jurada: 'Fecha Declaración Jurada',
  primera_cat: '1ra Categoría',
  segunda_cat_acciones: '2da Cat. (Acciones)',
  segunda_cat_instrumentos: '2da Cat. (Instrumentos)',
  segunda_cat_dividendos: '2da Cat. (Dividendos)',
  tercera_cat: '3ra Categoría',
  cuarta_cat: '4ta Categoría',
  monto_consumido: 'Monto Consumido',
  // Bienes Personales
  efectivo_pais: 'Efectivo País',
  efectivo_exterior: 'Efectivo Exterior',
  exento_no_alcanzado: 'Exento No Alcanzado',
  // IVA
  debitos_fiscales: 'Débitos Fiscales (separados por coma)',
  // Recibo Haberes
  sueldo_neto: 'Sueldo Neto',
  // Monotributo
  categoria: 'Categoría',
  // Certificación Contable
  certificacion_firmada: 'Certificación Firmada',
  // Otros
  venta_propiedad: 'Donación / Mutuo',
  arrendamiento: 'Arrendamiento',
  escriturasCesionesVentas: 'Escritura / Venta',
  blanqueo: 'Blanqueo',
  // Datos
  dolar: 'Dólar',
  nombreYApellido: 'Nombre y Apellido',
  // Estados Contables (EECC)
  caja_y_bancos: 'Caja y Bancos',
  patrimonio_neto: 'Patrimonio Neto',
  ingresos: 'Ingresos',
  costos: 'Costos',
  // Legacy EECC fields
  titulos_acciones_bonos: 'Títulos/Acciones/Bonos',
  ingresos_venta_fabricacion: 'Ingresos Venta/Fabricación',
  otros_patrimonio_neto: 'Otros Patrimonio Neto',
};

export function DocumentReviewDialog({ document, client, onClose, onUpdate }: DocumentReviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSignedUrl();
    initializeEditedData();
  }, [document]);

  const loadSignedUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from(document.storage_bucket || 'documents')
        .createSignedUrl(document.storage_path, 3600);

      if (!error && data) {
        setSignedUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Error loading signed URL:', err);
    }
  };

  const initializeEditedData = () => {
    // Get the section key for this document type
    const sectionKey = DOC_TYPE_TO_SECTION[document.doc_type];

    // Get the raw extracted/reviewed data
    const rawData = document.reviewed_data || document.extracted_data || {};

    // Expected fields for each section
    const expectedFieldsForSection: Record<string, string[]> = {
      'datos_balance': ['caja_y_bancos', 'patrimonio_neto', 'ingresos', 'costos'],
      'ganancias': ['anio_fiscal', 'fecha_declaracion_jurada', 'primera_cat', 'segunda_cat_acciones', 'segunda_cat_instrumentos', 'segunda_cat_dividendos', 'tercera_cat', 'cuarta_cat', 'monto_consumido'],
      'bienes_personales': ['anio_fiscal', 'fecha_declaracion_jurada', 'efectivo_pais', 'efectivo_exterior', 'exento_no_alcanzado'],
      'iva': ['anio_fiscal', 'fecha_declaracion_jurada', 'debitos_fiscales'],
      'recibo_haberes': ['sueldo_neto'],
      'monotributo': ['categoria'],
      'certificacion_contable': ['certificacion_firmada'],
      'otros': ['venta_propiedad', 'arrendamiento', 'escriturasCesionesVentas', 'blanqueo'],
      'datos': ['dolar', 'nombreYApellido'],
    };

    let relevantData: Record<string, any> = {};
    const expectedFields = sectionKey ? (expectedFieldsForSection[sectionKey] || []) : [];

    if (sectionKey && typeof rawData === 'object') {
      // Strategy 1: Check if the data has a nested structure with section key
      if (rawData[sectionKey] && typeof rawData[sectionKey] === 'object') {
        relevantData = { ...rawData[sectionKey] };
      }

      // Strategy 2: Look for expected fields directly in rawData (flat structure)
      if (Object.keys(relevantData).length === 0) {
        expectedFields.forEach((field) => {
          if (field in rawData) {
            relevantData[field] = rawData[field];
          }
        });
      }

      // Strategy 3: Search in nested objects for expected fields
      if (Object.keys(relevantData).length === 0) {
        Object.entries(rawData).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            expectedFields.forEach((field) => {
              if (field in value) {
                relevantData[field] = value[field];
              }
            });
          }
        });
      }

      // If EECC has no extracted fields yet, show the expected EECC fields (avoid showing unrelated primitives like "dolar")
      if (Object.keys(relevantData).length === 0 && sectionKey === 'datos_balance') {
        expectedFields.forEach((field) => {
          relevantData[field] = 0;
        });
      }

      // Strategy 4: Fall back to all primitives if still empty (except EECC)
      if (Object.keys(relevantData).length === 0 && sectionKey !== 'datos_balance') {
        Object.entries(rawData).forEach(([key, value]) => {
          if (value !== null && typeof value !== 'object') {
            relevantData[key] = value;
          }
        });
      }
    }

    // Final fallback: if completely empty, use all primitives from raw data
    if (Object.keys(relevantData).length === 0 && typeof rawData === 'object') {
      Object.entries(rawData).forEach(([key, value]) => {
        if (value !== null && typeof value !== 'object') {
          relevantData[key] = value;
        }
      });
    }

    setEditedData(relevantData);
  };

  // Format number with commas as thousand separators
  const formatWithCommas = (num: number | string): string => {
    const n = typeof num === 'string' ? parseFloat(String(num).replace(/,/g, '')) : num;
    if (isNaN(n) || n === 0) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Parse string with commas back to number
  const parseFromCommas = (str: string): number => {
    const clean = str.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const handleFieldChange = (key: string, value: string) => {
    // Special handling for IVA debitos_fiscales (array)
    if (key === 'debitos_fiscales') {
      const numbers = value.split(',').map(s => {
        const trimmed = s.trim();
        return trimmed === '' ? NaN : parseFloat(trimmed);
      }).filter(n => !isNaN(n));
      setEditedData(prev => ({
        ...prev,
        [key]: numbers,
      }));
    } else if (CURRENCY_FIELDS.has(key)) {
      // Parse currency fields (removing commas)
      setEditedData(prev => ({
        ...prev,
        [key]: parseFromCommas(value),
      }));
    } else {
      setEditedData(prev => ({
        ...prev,
        [key]: isNaN(Number(value)) || value === '' ? value : Number(value),
      }));
    }
  };

  const handleSaveAndValidate = async () => {
    setSaving(true);

    try {
      // 1. Update document with reviewed_data and mark as Validado
      await supabase
        .from('documents')
        .update({
          reviewed_data: editedData,
          status: 'Validado',
        })
        .eq('id', document.id);

      // 2. Update analysis financial_data instead of client depending on context
      const section = DOC_TYPE_TO_SECTION[document.doc_type];

      // If document is linked to an analysis, update the analysis financial_data
      if (document.analysis_id && section) {
        // Fetch current analysis data first
        const { data: currentAnalysis, error: fetchError } = await supabase
          .from('analyses')
          .select('financial_data')
          .eq('id', document.analysis_id)
          .single();

        if (fetchError) throw fetchError;

        let finalSectionData = {
          ...(typeof currentAnalysis.financial_data[section] === 'object' ? currentAnalysis.financial_data[section] : {}),
          ...editedData,
        };

        // Automatic Aggregation for numeric fields across multiple documents
        // We fetch ALL validated documents of this type for this analysis to sum their values
        const { data: siblingDocs } = await supabase
          .from('documents')
          .select('reviewed_data')
          .eq('analysis_id', document.analysis_id)
          .eq('doc_type', document.doc_type)
          .eq('status', 'Validado')
          .neq('id', document.id); // Exclude current doc to avoid double counting or stale data

        if (siblingDocs && siblingDocs.length > 0) {
          // Identify numeric keys in the current edited data
          // We only sum fields that are present in the current edit and are numbers
          Object.keys(editedData).forEach(key => {
            const val = editedData[key];

            // Only sum simple numbers (exclude arrays like IVA for now, and non-numbers)
            if (typeof val === 'number' && !isNaN(val)) {
              let total = val;

              siblingDocs.forEach(doc => {
                const siblingVal = Number(doc.reviewed_data?.[key]);
                if (!isNaN(siblingVal)) {
                  total += siblingVal;
                }
              });

              // Update the final data with the sum
              finalSectionData[key] = total;
            }
          });
        }

        const updatedFinancialData = {
          ...currentAnalysis.financial_data,
          [section]: finalSectionData,
        };

        await supabase
          .from('analyses')
          .update({
            financial_data: updatedFinancialData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', document.analysis_id);

      } else if (section) {
        // Fallback to legacy client financial_data update (if no analysis_id)
        const currentSectionData = client.financial_data[section] || {};
        const updatedFinancialData = {
          ...client.financial_data,
          [section]: {
            ...(typeof currentSectionData === 'object' ? currentSectionData : {}),
            ...editedData,
          },
        };

        await supabase
          .from('clients')
          .update({
            financial_data: updatedFinancialData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client.id);
      }

      toast({
        title: 'Documento validado',
        description: 'Los datos han sido guardados correctamente',
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkValidated = async () => {
    // Treat "Mark as Validated" exactly like "Save & Validate"
    // ensuring data is aggregated and pushed to the analysis.
    await handleSaveAndValidate();
  };

  const getFieldLabel = (key: string): string => {
    return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Currency fields that should show formatted display
  const CURRENCY_FIELDS = new Set([
    'monto_consumido',
    'primera_cat',
    'segunda_cat_acciones',
    'segunda_cat_instrumentos',
    'segunda_cat_dividendos',
    'tercera_cat',
    'cuarta_cat',
    'efectivo_pais',
    'efectivo_exterior',
    'exento_no_alcanzado',
    'sueldo_neto',
    'certificacion_firmada',
    'venta_propiedad',
    'arrendamiento',
    'escriturasCesionesVentas',
    'blanqueo',
    // Estados Contables
    'caja_y_bancos',
    'patrimonio_neto',
    'ingresos',
    'costos',
    // Legacy
    'titulos_acciones_bonos',
    'ingresos_venta_fabricacion',
    'otros_patrimonio_neto',
  ]);

  const formatCurrency = (value: any): string | null => {
    const num = Number(value);
    if (isNaN(num) || num === 0) return null;
    return `$ ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderFormFields = () => {
    const keys = Object.keys(editedData);

    if (keys.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          No hay datos extraídos para revisar
        </p>
      );
    }

    return keys.map((key) => {
      // Special rendering for array fields (debitos_fiscales)
      const isArray = Array.isArray(editedData[key]);

      if (isArray) {
        const arrayValues = editedData[key] as number[];
        const total = arrayValues.reduce((a, b) => a + b, 0);
        const promedio = arrayValues.length > 0 ? total / arrayValues.length : 0;

        return (
          <div key={key} className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {getFieldLabel(key)}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {arrayValues.map((value, index) => (
                <div key={`${key}-${index}`} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground/60">
                    Mes {index + 1}
                  </Label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => {
                      const newArray = [...arrayValues];
                      newArray[index] = parseFloat(e.target.value) || 0;
                      setEditedData(prev => ({
                        ...prev,
                        [key]: newArray
                      }));
                    }}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground/60 pl-1">
                    {formatCurrency(value) || '$0.00'}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground/60 pt-1 border-t">
              <span>{arrayValues.length} meses</span>
              <span>Promedio: ${promedio.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              <span>Total: ${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        );
      }

      // Normal field rendering for non-array fields
      const isCurrency = CURRENCY_FIELDS.has(key);
      const formattedValue = isCurrency ? formatCurrency(editedData[key]) : null;

      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            {getFieldLabel(key)}
          </Label>
          <Input
            value={isCurrency ? formatWithCommas(editedData[key]) : (editedData[key]?.toString() || '')}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="h-9"
          />
          {formattedValue && (
            <p className="text-xs text-muted-foreground/60 pl-1">
              {formattedValue}
            </p>
          )}
        </div>
      );
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-5xl !h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Revisar Documento</DialogTitle>
          <DialogDescription>
            {document.original_filename || document.storage_path.split('/').pop()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Document Viewer */}
          <div className="border rounded-lg overflow-hidden bg-muted h-full min-h-[300px]">
            {signedUrl ? (
              document.mime_type?.includes('pdf') ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={signedUrl}
                  alt="Document"
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Data Editor */}
          <div className="border rounded-lg overflow-hidden flex flex-col h-full min-h-[300px]">
            <div className="p-4 border-b bg-muted/30">
              <h4 className="font-medium">Datos Extraídos</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sección: {DOC_TYPE_TO_SECTION[document.doc_type]?.replace(/_/g, ' ').toUpperCase() || document.doc_type}
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {renderFormFields()}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleMarkValidated} disabled={saving}>
            Marcar como Validado
          </Button>
          <Button onClick={handleSaveAndValidate} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" />
            Guardar Correcciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
