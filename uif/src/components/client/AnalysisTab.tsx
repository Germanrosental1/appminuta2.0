import { useState, useMemo, useEffect } from 'react';
import { Client, FinancialData, AnalysisSettings, MONOTRIBUTO_CATEGORIES, Analysis, Document, ReviewedData, CustomField } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Save, Calculator, DollarSign, Loader2, Download, Package, TrendingUp, Calendar, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
// ⚡ PERFORMANCE: jsPDF, JSZip, file-saver son lazy imports en las funciones de descarga (bundle optimization)
import ExpandableCard from './ExpandableCard';
import CustomFieldsSection from './CustomFieldsSection';
import type { jsPDF } from 'jspdf';

interface AutoTableDoc extends jsPDF {
  lastAutoTable: { finalY: number };
}

interface AnalysisTabProps {
  client: Client;
  analysis: Analysis;
  documents: Document[];
  onUpdate: (updates: Partial<Analysis>) => Promise<boolean>;
}

// Format number as currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatUSD = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

// Defaults for Estado Resultados settings (PJ)
const DEFAULT_ESTADO_RESULTADOS_SETTINGS = {
  peso_caja_bancos: 70,
  peso_ingresos: 30,
  porcentaje_patrimonio_neto: 10,
  usar_resultado_bruto: false,
};

// Configuration for available sections
const AVAILABLE_SECTIONS = [
  { id: 'ganancias', label: 'Ganancias', type: 'PF' },
  { id: 'otros', label: 'Otros', type: 'BOTH' },
  { id: 'monotributo', label: 'Monotributo', type: 'PF' },
  { id: 'iva', label: 'IVA', type: 'BOTH' },
  { id: 'recibo_haberes', label: 'Recibo de Haberes', type: 'PF' },
  { id: 'certificacion_contable', label: 'Certificación Contable', type: 'PF' },
  { id: 'bienes_personales', label: 'Bienes Personales', type: 'PF' },
  { id: 'estado_resultados', label: 'Estado de Resultados', type: 'PJ' },
] as const;

export function AnalysisTab({ client, analysis, documents, onUpdate }: Readonly<AnalysisTabProps>) {
  const [financialData, setFinancialData] = useState<FinancialData>(analysis.financial_data);
  const [settings, setSettings] = useState<AnalysisSettings>(() => {
    // Ensure simulacion has rem_percent and cac_percent (backwards compatibility)
    const baseSettings = analysis.analysis_settings;
    return {
      ...baseSettings,
      simulacion: {
        ...baseSettings.simulacion,
        rem_percent: baseSettings.simulacion?.rem_percent ?? 0,
        cac_percent: baseSettings.simulacion?.cac_percent ?? 10,
      }
    };
  });
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize visible sections based on data
  useEffect(() => {
    if (isInitialized) return;

    const newVisible = new Set<string>();

    // Logic to determine if a section should be visible

    // We need access to calculations for subtotals, but calculations is defined AFTER this effect.
    // Solution: Move this logic to a separate effect that depends on calculations, or define calculations before.
    // Actually, calculations uses financialData, so we can rely on financialData.

    // Let's rely on data presence in financialData and Documents for now
    AVAILABLE_SECTIONS.forEach(section => {
      let isVisible = false;

      // 1. Check Custom Fields
      if (financialData.custom_fields?.[section.id]?.length ?? 0 > 0) {
        isVisible = true;
      }

      // 2. Check Documents
      // Mapping from config.type/id to doc_type
      // Simple mapping based on known IDs
      const docMapping: Record<string, string> = {
        'ganancias': 'Ganancias',
        'bienes_personales': 'BienesPersonales',
        'iva': 'IVA',
        'recibo_haberes': 'ReciboHaberes',
        'monotributo': 'Monotributo',
        'certificacion_contable': 'CertificacionContable',
        'estado_resultados': 'EECC',
      };

      const docType = docMapping[section.id];
      if (docType && documents.some(d => d.doc_type === docType && d.status === 'Validado')) {
        isVisible = true;
      }

      // 3. Check specific financial data fields (subtotals > 0)
      if (!isVisible) {
        const g = financialData.ganancias as any;
        if (section.id === 'ganancias' && (Number(g.monto_consumido) > 0 || Number(g.impuesto_determinado) > 0 || Number(g.primera_cat) > 0)) isVisible = true;

        if (section.id === 'monotributo' && financialData.monotributo.categoria) isVisible = true;

        if (section.id === 'iva' && (financialData.iva.debitos_fiscales?.length ?? 0) > 0) isVisible = true;

        if (section.id === 'recibo_haberes' && Number(financialData.recibo_haberes.sueldo_neto) > 0) isVisible = true;

        if (section.id === 'certificacion_contable' && Number(financialData.certificacion_contable.certificacion_firmada) > 0) isVisible = true;

        if (section.id === 'bienes_personales') {
          const bp = financialData.bienes_personales as any;
          if (Number(bp.efectivo_pais) > 0 || Number(bp.efectivo_exterior) > 0 || Number(bp.exento_no_alcanzado) > 0) isVisible = true;
        }

        if (section.id === 'otros') {
          const o = financialData.otros as any;
          if (Number(o.venta_propiedad) > 0 || Number(o.arrendamiento) > 0 || Number(o.jubilacion) > 0) isVisible = true;
        }

        if (section.id === 'estado_resultados') {
          const db = (financialData.datos_balance || {}) as any;
          if (Number(db.ventas) > 0 || Number(db.costo_ventas) > 0 || Number(db.gastos) > 0 || Number(db.resultado_operativo) > 0 || Number(db.caja_y_bancos) > 0 || Number(db.patrimonio_neto) > 0) isVisible = true;
        }
      }

      // Default visibility for PJ: Estado de Resultados
      if (client.person_type === 'PJ' && section.id === 'estado_resultados') isVisible = true;

      // Filter by person type
      if (section.type === 'PF' && client.person_type !== 'PF') isVisible = false;
      if (section.type === 'PJ' && client.person_type !== 'PJ') isVisible = false;

      if (isVisible) newVisible.add(section.id);
    });

    // Always show at least one? Maybe not needed if "Add" button exists.

    setVisibleSections(newVisible);
    setIsInitialized(true);

  }, [client.person_type, documents, isInitialized]); // financialData dependency removed to avoid constant resets, only init once. Or better, check specific flags.


  const [saving, setSaving] = useState(false);
  const [simCurrency, setSimCurrency] = useState<'USD' | 'ARS'>('USD');
  const { toast } = useToast();

  // Initialize REM/CAC from system_settings only if not already set in analysis
  useEffect(() => {
    const initializeFromSystemSettings = async () => {
      // Only fetch if values are 0 (new analysis or never set)
      if (settings.simulacion.rem_percent === 0 && settings.simulacion.cac_percent === 0) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('extra_settings')
            .single();

          if (!error && data?.extra_settings) {
            const { rem = 0, cac = 0 } = data.extra_settings as { rem: number; cac: number };
            if (rem > 0 || cac > 0) {
              setSettings(prev => ({
                ...prev,
                simulacion: {
                  ...prev.simulacion,
                  rem_percent: rem,
                  cac_percent: cac,
                }
              }));
            }
          }
        } catch (err) {
          console.error('Error fetching system settings:', err);
        }
      }
    };
    initializeFromSystemSettings();
  }, []);

  // Helper to standardise input parsing/display
  const formatCurrencyInput = (usdValue: number, currency: 'USD' | 'ARS', dolar: number): string => {
    if (currency === 'USD') {
      return usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    const arsValue = usdValue * dolar;
    return Math.round(arsValue).toLocaleString('es-AR');
  };

  const parseCurrencyInput = (inputValue: string, currency: 'USD' | 'ARS', dolar: number): number => {
    // Remove all non-numeric characters except . and ,
    let cleanValue = inputValue.replace(/[^\d.,]/g, '');

    if (currency === 'USD') {
      // US format: comma is thousands separator, dot is decimal
      // Remove commas (thousands separators)
      cleanValue = cleanValue.replace(/,/g, '');
    } else {
      // AR format: dot is thousands separator, comma is decimal
      // Remove dots (thousands separators), replace comma with dot for parsing
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    }

    const num = Number.parseFloat(cleanValue) || 0;
    if (currency === 'USD') return num;
    return num / dolar;
  };

  useEffect(() => {
    setFinancialData(analysis.financial_data);
    setSettings(analysis.analysis_settings);
  }, [analysis]);

  // Calculate all values in real-time
  const calculations = useMemo(() => {
    const dolar = Number.parseFloat(financialData.datos.dolar) || 1;

    // Ensure weights has all required keys with defaults (for older clients without datos_balance)
    const weights = {
      ...settings.weights,
      datos_balance: settings.weights.datos_balance ?? 0,
    };

    // Helper to ensure numeric values (handles strings from JSON)
    const toNum = (val: unknown): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return Number.parseFloat(val) || 0;
      return 0;
    };

    // Ensure datos_balance exists with defaults - merge to handle missing fields
    const datosBalance = {
      caja_y_bancos: 0,
      patrimonio_neto: 0,
      ingresos: 0,
      costos: 0,
      titulos_acciones_bonos: 0,
      ingresos_venta_fabricacion: 0,
      otros_patrimonio_neto: 0,
      ...financialData.datos_balance,
    };

    // Ensure estado_resultados_settings exists with defaults - merge to handle missing fields
    const estadoResultadosSettings = {
      peso_caja_bancos: 70,
      peso_ingresos: 30,
      porcentaje_patrimonio_neto: 10,
      usar_resultado_bruto: false,
      ...financialData.estado_resultados_settings,
    };

    // Helper to sum custom fields with currency conversion (USD -> ARS)
    const sumCustomFields = (fields: typeof financialData.custom_fields.ganancias): number => {
      return (fields || []).reduce((sum, f) => {
        const value = toNum(f.value);
        // If currency is USD, convert to ARS
        return sum + (f.currency === 'USD' ? value * dolar : value);
      }, 0);
    };


    // Base calculations - use toNum to handle string values from Supabase JSON
    const sum_categorias_ganancias =
      toNum(financialData.ganancias.primera_cat) +
      toNum(financialData.ganancias.segunda_cat_acciones) +
      toNum(financialData.ganancias.segunda_cat_instrumentos) +
      toNum(financialData.ganancias.segunda_cat_dividendos) +
      toNum(financialData.ganancias.tercera_cat) +
      toNum(financialData.ganancias.cuarta_cat);

    // Custom fields sum for ganancias (with USD conversion)
    const custom_ganancias = sumCustomFields(financialData.custom_fields?.ganancias);

    const base_ganancias = Math.max(0,
      sum_categorias_ganancias + custom_ganancias - toNum(financialData.ganancias.monto_consumido)
    );

    // Monotributo: Look up category value from table based on letter
    // Apply REM adjustment: frozen values are adjusted by REM %
    const monotributo_category = financialData.monotributo.categoria?.toUpperCase();
    const rem_factor = 1 + (settings.simulacion.rem_percent / 100);
    const base_monotributo_original = MONOTRIBUTO_CATEGORIES[monotributo_category] || 0;
    // REM adjustment applied to monotributo (frozen value)
    const custom_monotributo = sumCustomFields(financialData.custom_fields?.monotributo);
    const base_monotributo = (base_monotributo_original * rem_factor) + custom_monotributo;

    // IVA: Calculate monthly average from debitos_fiscales array and project annually
    const debitos = financialData.iva.debitos_fiscales || [];
    const total_debitos = debitos.reduce((acc, val) => acc + toNum(val), 0);
    const promedio_mensual_iva = debitos.length > 0 ? total_debitos / debitos.length : 0;
    const proyeccion_anual_iva = promedio_mensual_iva * 12;
    const custom_iva = sumCustomFields(financialData.custom_fields?.iva);
    const base_iva = (proyeccion_anual_iva / 0.21) + custom_iva;

    // REM adjustment applied to recibo de haberes (frozen value)
    const sueldo_neto_original = toNum(financialData.recibo_haberes.sueldo_neto);
    const sueldo_neto_ajustado = sueldo_neto_original * rem_factor;
    const custom_haberes = sumCustomFields(financialData.custom_fields?.recibo_haberes);
    const base_haberes_anual = (sueldo_neto_ajustado * 12) + custom_haberes;

    // Venta propiedad está en USD, se convierte a pesos
    const venta_propiedad_pesos = toNum(financialData.otros.venta_propiedad) * dolar;

    const custom_otros = sumCustomFields(financialData.custom_fields?.otros);
    const base_otros =
      venta_propiedad_pesos +
      toNum(financialData.otros.arrendamiento) +
      toNum(financialData.otros.escriturasCesionesVentas) +
      toNum(financialData.otros.blanqueo) +
      custom_otros;

    // Bienes Personales (patrimonio)
    const custom_bienes_personales = sumCustomFields(financialData.custom_fields?.bienes_personales);
    const base_bienes_personales =
      toNum(financialData.bienes_personales.efectivo_pais) +
      toNum(financialData.bienes_personales.efectivo_exterior) +
      toNum(financialData.bienes_personales.exento_no_alcanzado) +
      custom_bienes_personales;

    // Certificación contable
    const custom_certificacion = sumCustomFields(financialData.custom_fields?.certificacion_contable);
    const base_certificacion = toNum(financialData.certificacion_contable.certificacion_firmada) + custom_certificacion;

    // Estados Contables (EECC) - Nueva lógica para PJ
    // Paso 1: Calcular Ingresos o Resultado Bruto según switch
    const ingresos = toNum(datosBalance.ingresos);
    const costos = toNum(datosBalance.costos);
    const resultado_bruto = ingresos - costos;
    const monto_ingresos_a_usar = estadoResultadosSettings.usar_resultado_bruto ? resultado_bruto : ingresos;

    // Paso 2: Aplicar ponderaciones (ensure percentages are valid numbers)
    const peso_caja = toNum(estadoResultadosSettings.peso_caja_bancos) || 70;
    const peso_ing = toNum(estadoResultadosSettings.peso_ingresos) || 30;
    const pct_patrimonio = toNum(estadoResultadosSettings.porcentaje_patrimonio_neto) || 10;

    const caja_bancos_ponderado = toNum(datosBalance.caja_y_bancos) * (peso_caja / 100);
    const ingresos_ponderado = monto_ingresos_a_usar * (peso_ing / 100);
    const suma_ponderada = caja_bancos_ponderado + ingresos_ponderado;

    // Paso 3: Calcular % del patrimonio neto
    const patrimonio_neto = toNum(datosBalance.patrimonio_neto);
    const porcentaje_patrimonio = patrimonio_neto * (pct_patrimonio / 100);

    // Custom fields para estado de resultados (PJ)
    const custom_estado_resultados = sumCustomFields(financialData.custom_fields?.estado_resultados);

    // Paso 4: El mayor entre suma ponderada y % patrimonio neto, más custom fields
    const base_datos_balance = (Math.max(suma_ponderada, porcentaje_patrimonio) || 0) + custom_estado_resultados;

    // Subtotals with weights
    const subtotal_ganancias = base_ganancias * (weights.ganancias / 100);
    const subtotal_monotributo = base_monotributo * (weights.monotributo / 100);
    const subtotal_iva = base_iva * (weights.iva / 100);
    const subtotal_haberes = base_haberes_anual * (weights.haberes / 100);
    const subtotal_otros = base_otros * (weights.otros / 100);
    const subtotal_bienes_personales = base_bienes_personales * (weights.bienes_personales / 100);
    const subtotal_certificacion = base_certificacion * (weights.certificacion_contable / 100);
    // Estados de Resultados uses 100% always (already internally weighted)
    const subtotal_datos_balance = base_datos_balance;

    // MONTO TOTAL A OPERAR (en pesos) = suma de todos los subtotales ponderados
    const monto_total_operar_ars =
      subtotal_ganancias +
      subtotal_monotributo +
      subtotal_iva +
      subtotal_haberes +
      subtotal_otros +
      subtotal_bienes_personales +
      subtotal_certificacion +
      subtotal_datos_balance;

    // MONTO TOTAL A OPERAR (en USD)
    const monto_total_operar_usd = monto_total_operar_ars / dolar;

    // Saldo a financiar = Importe - Aporte (en USD)
    const saldo_a_financiar_usd = Math.max(0,
      settings.simulacion.importe_operacion - settings.simulacion.aporte_operacion
    );

    // Cuota mensual en USD = Saldo a financiar / cantidad cuotas
    // CAC adjustment: installments are updated monthly with CAC index
    const cac_factor = 1 + (settings.simulacion.cac_percent / 100);
    const cuota_mensual_base_usd = settings.simulacion.cantidad_cuotas > 0
      ? saldo_a_financiar_usd / settings.simulacion.cantidad_cuotas
      : 0;
    // Apply CAC to get adjusted installment value
    const cuota_mensual_usd = cuota_mensual_base_usd * cac_factor;

    // SOLVENCIA EN MESES = Monto total USD / cuota mensual USD (con CAC)
    const solvencia_meses = cuota_mensual_usd > 0
      ? monto_total_operar_usd / cuota_mensual_usd
      : 0;

    // RATIO DE COBERTURA = Solvencia en meses / 12
    const ratio_cobertura = solvencia_meses / 12;

    // Status based on ratio ranges
    let status: string;
    let statusClass: string;
    if (ratio_cobertura > 2) {
      status = '¡Excelente!';
      statusClass = 'score-excellent';
    } else if (ratio_cobertura > 1.5) {
      status = 'Buena';
      statusClass = 'score-good';
    } else if (ratio_cobertura > 1.1) {
      status = 'Aceptable';
      statusClass = 'score-acceptable';
    } else if (ratio_cobertura > 1) {
      status = 'Precaución';
      statusClass = 'score-risk';
    } else {
      status = 'Riesgo';
      statusClass = 'score-insolvent';
    }

    return {
      dolar,
      rem_factor,
      cac_factor,
      bases: {
        ganancias: base_ganancias,
        monotributo: base_monotributo,
        monotributo_original: base_monotributo_original,
        iva: base_iva,
        haberes: base_haberes_anual,
        haberes_original: sueldo_neto_original * 12,
        otros: base_otros,
        bienes_personales: base_bienes_personales,
        datos_balance: base_datos_balance,
      },
      subtotals: {
        ganancias: subtotal_ganancias,
        monotributo: subtotal_monotributo,
        iva: subtotal_iva,
        haberes: subtotal_haberes,
        otros: subtotal_otros,
        bienes_personales: subtotal_bienes_personales,
        certificacion: subtotal_certificacion,
        datos_balance: subtotal_datos_balance,
      },
      // Valores intermedios para PJ
      pj_details: {
        caja_y_bancos: toNum(datosBalance.caja_y_bancos),
        patrimonio_neto,
        ingresos,
        costos,
        resultado_bruto,
        monto_ingresos_a_usar,
        caja_bancos_ponderado,
        ingresos_ponderado,
        suma_ponderada,
        porcentaje_patrimonio,
        usando_porcentaje_patrimonio: porcentaje_patrimonio > suma_ponderada,
      },
      monto_total_operar_ars,
      monto_total_operar_usd,
      saldo_a_financiar_usd,
      cuota_mensual_base_usd,
      cuota_mensual_usd,
      solvencia_meses,
      ratio_cobertura,
      cantidad_cuotas: settings.simulacion.cantidad_cuotas,
      status,
      statusClass,
    };
  }, [financialData, settings]);

  const updateFinancialField = (section: keyof FinancialData, field: string, value: string | number) => {
    setFinancialData(prev => ({
      ...prev,
      [section]: {
        ...(typeof prev[section] === 'object' && prev[section] !== null ? (prev[section] as Record<string, unknown>) : {}),
        [field]: value,
      },
    }));
  };

  const updateWeight = (category: keyof AnalysisSettings['weights'], value: number) => {
    setSettings(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [category]: value,
      },
    }));
  };

  const updateSimulation = (field: keyof AnalysisSettings['simulacion'], value: number) => {
    setSettings(prev => ({
      ...prev,
      simulacion: {
        ...prev.simulacion,
        [field]: value,
      },
    }));
  };

  // Custom fields management
  type CustomFieldSection = 'ganancias' | 'bienes_personales' | 'iva' | 'recibo_haberes' | 'monotributo' | 'certificacion_contable' | 'otros' | 'estado_resultados';

  const addCustomField = (section: CustomFieldSection) => {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      label: '',
      value: 0,
    };
    setFinancialData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [section]: [...(prev.custom_fields?.[section] || []), newField],
      },
    }));
  };

  const updateCustomField = (section: CustomFieldSection, fieldId: string, updates: Partial<CustomField>) => {
    setFinancialData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [section]: (prev.custom_fields?.[section] || []).map(f =>
          f.id === fieldId ? { ...f, ...updates } : f
        ),
      },
    }));
  };

  const removeCustomField = (section: CustomFieldSection, fieldId: string) => {
    setFinancialData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [section]: (prev.custom_fields?.[section] || []).filter(f => f.id !== fieldId),
      },
    }));
  };

  // Helper to sum custom fields for a section

  // ⚡ PERFORMANCE: generatePDF ahora usa dynamic import
  const generatePDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-AR');

    // Title
    doc.setFontSize(18);
    doc.text('Análisis de Origen de Fondos (UIF)', pageWidth / 2, 15, { align: 'center' });

    // Client Info
    doc.setFontSize(12);
    doc.text(`Cliente: ${client.name}`, 14, 25);
    doc.text(`CUIT: ${client.cuit || '-'}`, 14, 32);
    doc.text(`Fecha: ${dateStr}`, 14, 39);
    doc.text(`Tipo: ${client.person_type === 'PJ' ? 'Persona Jurídica' : 'Persona Física'}`, 14, 46);

    // Summary Table
    const summaryData = [
      ['Total Ingresos Declarados (ARS)', formatCurrency(calculations.monto_total_operar_ars)],
      ['Total Ingresos Declarados (USD)', formatUSD(calculations.monto_total_operar_usd)],
      ['Ratio de Cobertura', `${calculations.ratio_cobertura.toFixed(2)}x (${calculations.status})`],
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Concepto', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Subtotals by Category Table
    const subtotalData: [string, string, string][] = [];
    if (client.person_type === 'PF') {
      subtotalData.push(
        ['Ganancias', `${settings.weights.ganancias}%`, formatCurrency(calculations.subtotals.ganancias)],
        ['Monotributo', `${settings.weights.monotributo}%`, formatCurrency(calculations.subtotals.monotributo)],
        ['Recibo de Haberes', `${settings.weights.haberes}%`, formatCurrency(calculations.subtotals.haberes)],
        ['Certificación Contable', `${settings.weights.certificacion_contable}%`, formatCurrency(calculations.subtotals.certificacion)],
        ['Bienes Personales', `${settings.weights.bienes_personales}%`, formatCurrency(calculations.subtotals.bienes_personales)]
      );
    } else {
      subtotalData.push(['Estado de Resultados', '100%', formatCurrency(calculations.subtotals.datos_balance)]);
    }
    subtotalData.push(
      ['IVA', `${settings.weights.iva}%`, formatCurrency(calculations.subtotals.iva)],
      ['Otros Ingresos', `${settings.weights.otros}%`, formatCurrency(calculations.subtotals.otros)]
    );

    autoTable(doc, {
      startY: (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10,
      head: [['Origen de Fondos', 'Ponderación', 'Subtotal Computable']],
      body: subtotalData,
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94] },
    });

    // Simulation
    const simData: [string, string][] = [
      ['Importe Operación', formatUSD(settings.simulacion.importe_operacion)],
      ['Anticipo', formatUSD(settings.simulacion.aporte_operacion)],
      ['Saldo a Financiar', formatUSD(calculations.saldo_a_financiar_usd)],
      ['Cantidad de Cuotas', `${settings.simulacion.cantidad_cuotas} meses`],
      ['Cuota Base (sin ajuste)', formatUSD(calculations.cuota_mensual_base_usd)],
    ];

    // Add CAC info if active
    if (settings.simulacion.cac_percent > 0) {
      simData.push(
        ['Índice CAC', `${settings.simulacion.cac_percent}%`],
        ['Ajuste CAC/Cuota', `+ ${formatUSD(calculations.cuota_mensual_usd - calculations.cuota_mensual_base_usd)}`],
      );
    }

    simData.push(
      ['Cuota Mensual Final', formatUSD(calculations.cuota_mensual_usd)],
      ['Solvencia (Meses)', calculations.solvencia_meses.toFixed(1)],
    );

    autoTable(doc, {
      startY: (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10,
      head: [['Simulación de Operación', 'Valores (USD)']],
      body: simData,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] },
    });

    // Índices de Ajuste (REM + CAC)
    if (settings.simulacion.rem_percent > 0 || settings.simulacion.cac_percent > 0) {
      const indicesData: [string, string, string][] = [];

      if (settings.simulacion.rem_percent > 0) {
        const remImpactMonotributo = (calculations.bases.monotributo_original || 0) * (settings.simulacion.rem_percent / 100);
        const remImpactHaberes = (calculations.bases.haberes_original || 0) * (settings.simulacion.rem_percent / 100);
        indicesData.push(
          ['REM (Relevamiento Expectativas Mercado)', `${settings.simulacion.rem_percent}%`, 'Ajuste valores congelados'],
          ['  → Impacto en Monotributo', `+ ${formatCurrency(remImpactMonotributo)}`, `Total: ${formatCurrency(calculations.bases.monotributo || 0)}`],
          ['  → Impacto en RC Haberes', `+ ${formatCurrency(remImpactHaberes)}`, `Total: ${formatCurrency(calculations.bases.haberes || 0)}`],
        );
      }

      if (settings.simulacion.cac_percent > 0) {
        const cacImpact = calculations.cuota_mensual_usd - calculations.cuota_mensual_base_usd;
        indicesData.push(
          ['CAC (Coef. Ajuste Construcción)', `${settings.simulacion.cac_percent}%`, 'Actualización cuotas'],
          ['  → Impacto en Cuota Mensual', `+ ${formatUSD(cacImpact)}`, `Total: ${formatUSD(calculations.cuota_mensual_usd)}`],
        );
      }

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Índice de Ajuste', 'Porcentaje', 'Descripción']],
        body: indicesData,
        theme: 'striped',
        headStyles: { fillColor: [142, 68, 173] },
      });
    }

    // ============ DESGLOSE DETALLADO POR SECCIÓN ============
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Desglose Detallado por Sección', pageWidth / 2, 15, { align: 'center' });
    let currentY = 25;

    // Helper to add section
    const addSectionTable = (title: string, data: [string, string][], color: [number, number, number]) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 14, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Campo', 'Valor']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: color },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      currentY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10;
    };

    // GANANCIAS
    if (client.person_type === 'PF') {
      const ganData: [string, string][] = [
        ['Año Fiscal', financialData.ganancias.anio_fiscal || '-'],
        ['Fecha DJ', financialData.ganancias.fecha_declaracion_jurada || '-'],
        ['1ra Categoría (Renta del Suelo)', formatCurrency(financialData.ganancias.primera_cat)],
        ['2da Cat. (Acciones / Intereses)', formatCurrency(financialData.ganancias.segunda_cat_acciones)],
        ['2da Cat. (Instrumentos Financieros)', formatCurrency(financialData.ganancias.segunda_cat_instrumentos)],
        ['2da Cat. (Dividendos y Utilidades)', formatCurrency(financialData.ganancias.segunda_cat_dividendos)],
        ['3ra Categoría (Participaciones)', formatCurrency(financialData.ganancias.tercera_cat)],
        ['4ta Categoría (Trabajo Personal)', formatCurrency(financialData.ganancias.cuarta_cat)],
        ['Monto Consumido / Gastos', formatCurrency(financialData.ganancias.monto_consumido)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.ganancias)],
      ];
      addSectionTable('GANANCIAS', ganData, [41, 128, 185]);

      // MONOTRIBUTO
      const monoData: [string, string][] = [
        ['Categoría', financialData.monotributo.categoria || '-'],
        ['Tope Anual', formatCurrency(MONOTRIBUTO_CATEGORIES[financialData.monotributo.categoria?.toUpperCase()] || 0)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.monotributo)],
      ];
      addSectionTable('MONOTRIBUTO', monoData, [155, 89, 182]);

      // RECIBO DE HABERES
      const habData: [string, string][] = [
        ['Sueldo Neto Mensual (Total)', formatCurrency(financialData.recibo_haberes.sueldo_neto)],
        ['Proyección Anual (x12)', formatCurrency(financialData.recibo_haberes.sueldo_neto * 12)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.haberes)],
      ];
      // Add individual docs if multiple
      const recibosDocs = documents.filter(d => d.doc_type === 'ReciboHaberes' && d.status === 'Validado');
      if (recibosDocs.length > 1) {
        recibosDocs.forEach((d, i) => {
          const rd = d.reviewed_data as unknown as ReviewedData;
          const filename = d.original_filename || `Recibo ${i + 1}`;
          habData.splice(i, 0, [`  • ${filename}`, formatCurrency(Number(rd?.sueldo_neto) || 0)]);
        });
      }
      addSectionTable('RECIBO DE HABERES', habData, [46, 204, 113]);

      // CERTIFICACIÓN CONTABLE
      const certData: [string, string][] = [
        ['Monto Certificación Firmada', formatCurrency(financialData.certificacion_contable.certificacion_firmada)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.certificacion)],
      ];
      addSectionTable('CERTIFICACIÓN CONTABLE', certData, [52, 152, 219]);

      // BIENES PERSONALES
      const bienesData: [string, string][] = [
        ['Efectivo en el País', formatCurrency(financialData.bienes_personales.efectivo_pais)],
        ['Efectivo en el Exterior', formatCurrency(financialData.bienes_personales.efectivo_exterior)],
        ['Exento / No Alcanzado', formatCurrency(financialData.bienes_personales.exento_no_alcanzado)],
        ['Total Bienes', formatCurrency(calculations.bases.bienes_personales)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.bienes_personales)],
      ];
      addSectionTable('BIENES PERSONALES', bienesData, [241, 196, 15]);
    } else {
      // PJ - Estado de Resultados
      const balData: [string, string][] = [
        ['Caja y Bancos', formatCurrency(financialData.datos_balance?.caja_y_bancos || 0)],
        ['Títulos / Acciones / Bonos', formatCurrency(financialData.datos_balance?.titulos_acciones_bonos || 0)],
        ['Ingresos por Ventas / Fabricación', formatCurrency(financialData.datos_balance?.ingresos_venta_fabricacion || 0)],
        ['Otros (Patrimonio Neto)', formatCurrency(financialData.datos_balance?.otros_patrimonio_neto || 0)],
        ['Total Balance', formatCurrency(calculations.bases.datos_balance)],
        ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.datos_balance)],
      ];
      addSectionTable('ESTADO DE RESULTADOS', balData, [52, 73, 94]);
    }

    // IVA
    const ivaDebitos = financialData.iva.debitos_fiscales || [];
    const ivaData: [string, string][] = [
      ['Año Fiscal', financialData.iva.anio_fiscal || '-'],
      ['Fecha DJ', financialData.iva.fecha_declaracion_jurada || '-'],
      ['Cantidad de Meses', String(ivaDebitos.length)],
      ['Promedio Mensual', formatCurrency(ivaDebitos.length > 0 ? ivaDebitos.reduce((a, b) => a + b, 0) / ivaDebitos.length : 0)],
      ['Total Débitos', formatCurrency(ivaDebitos.reduce((a, b) => a + b, 0))],
      ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.iva)],
    ];
    addSectionTable('IVA (Débitos Fiscales)', ivaData, [230, 126, 34] as [number, number, number]);

    // OTROS
    const otrosData: [string, string][] = [
      ['Donación / Mutuo', formatCurrency(financialData.otros.venta_propiedad)],
      ['Arrendamiento', formatCurrency(financialData.otros.arrendamiento)],
      ['Escritura / Venta', formatCurrency(financialData.otros.escriturasCesionesVentas)],
      ['Blanqueo', formatCurrency(financialData.otros.blanqueo)],
      ['Total Otros', formatCurrency(calculations.bases.otros)],
      ['SUBTOTAL COMPUTABLE', formatCurrency(calculations.subtotals.otros)],
    ];
    addSectionTable('OTROS INGRESOS', otrosData, [149, 165, 166] as [number, number, number]);

    // DATOS GENERALES
    const datosData: [string, string][] = [
      ['Cotización Dólar', `$ ${financialData.datos.dolar}`],
      ['Nombre/Razón Social', financialData.datos.nombreYApellido || '-'],
    ];
    addSectionTable('DATOS GENERALES', datosData, [127, 140, 141] as [number, number, number]);

    return doc;
  };

  const handleDownloadUIF = async () => {
    setSaving(true);
    try {
      const doc = await generatePDF();
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const filename = `${client.name.replace(/\s+/g, '_')}_${dateStr}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPackage = async () => {
    setSaving(true);
    try {
      // ⚡ PERFORMANCE: Dynamic imports para JSZip y file-saver
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver'),
      ]);

      const zip = new JSZip();

      // Add PDF (await since generatePDF is now async)
      const doc = await generatePDF();
      const pdfBlob = doc.output('blob');
      const pdfDate = new Date();
      const pdfDateStr = `${pdfDate.getFullYear()}-${String(pdfDate.getMonth() + 1).padStart(2, '0')}-${String(pdfDate.getDate()).padStart(2, '0')}`;
      zip.file(`${client.name.replace(/\s+/g, '_')}_${pdfDateStr}.pdf`, pdfBlob);
      const downloadPromises = documents.map(async (d) => {
        if (!d.storage_path) return;

        const { data } = await supabase.storage
          .from(d.storage_bucket || 'documents')
          .download(d.storage_path);

        if (data) {
          const ext = d.storage_path.split('.').pop();
          const filename = `${d.doc_type}_${d.id.substring(0, 4)}.${ext}`;
          zip.file(filename, data);
        }
      });

      await Promise.all(downloadPromises);

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${client.name.replace(/\s+/g, '_')}_${dateStr}.zip`);

      toast({
        title: "Descarga completa",
        description: "El paquete se ha descargado correctamente."
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo generar el paquete.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate({
      financial_data: financialData,
      analysis_settings: settings,
    });

    if (success) {
      toast({
        title: 'Análisis guardado',
        description: 'Los datos se han guardado correctamente',
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3 h-[calc(100vh-180px)] overflow-hidden flex flex-col">
      {/* Top Section: Header + Simulator + Result */}
      <div className="flex-shrink-0">
        {/* Header with Dolar, REM, CAC and Save */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Dólar */}
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">Dólar:</Label>
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                inputMode="decimal"
                value={financialData.datos.dolar}
                onChange={(e) => updateFinancialField('datos', 'dolar', e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-20 h-7 text-xs input-currency [appearance:textfield]"
              />
            </div>

            {/* REM - Ajuste para valores congelados */}
            <div className="flex items-center gap-1" title="Ajuste para Monotributo y RC de Sueldo (valores congelados)">
              <Label className="text-xs text-muted-foreground">REM:</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={settings.simulacion.rem_percent}
                  onChange={(e) => {
                    const val = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                    setSettings(prev => ({
                      ...prev,
                      simulacion: { ...prev.simulacion, rem_percent: val }
                    }));
                  }}
                  className="w-14 h-7 text-xs pr-5 input-currency [appearance:textfield]"
                />
                <Percent className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
              </div>
            </div>

            {/* CAC - Índice actualización cuotas */}
            <div className="flex items-center gap-1" title="Índice para actualizar cuotas mensuales">
              <Label className="text-xs text-muted-foreground">CAC:</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={settings.simulacion.cac_percent}
                  onChange={(e) => {
                    const val = Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                    setSettings(prev => ({
                      ...prev,
                      simulacion: { ...prev.simulacion, cac_percent: val }
                    }));
                  }}
                  className="w-14 h-7 text-xs pr-5 input-currency [appearance:textfield]"
                />
                <Percent className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadUIF} title="Descargar solo el reporte">
              <Download className="mr-1 h-3 w-3" />
              UIF
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPackage} disabled={saving} title="Descargar reporte y adjuntos">
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Package className="mr-1 h-3 w-3" />}
              Paquete
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
              Guardar
            </Button>
          </div>
        </div>

        {/* Simulator + Result Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Simulator Card - wider */}
          <Card className="analysis-card card-simulator lg:col-span-3">
            <CardHeader className="py-2 px-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-3 w-3" />
                Simulador
              </CardTitle>
              <div className="flex items-center gap-2 bg-muted/50 p-0.5 rounded-lg border">
                <button
                  onClick={() => setSimCurrency('USD')}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded transition-all",
                    simCurrency === 'USD' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  USD
                </button>
                <button
                  onClick={() => setSimCurrency('ARS')}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded transition-all",
                    simCurrency === 'ARS' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ARS
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {/* Row 1: Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Importe ({simCurrency})</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyInput(settings.simulacion.importe_operacion, simCurrency, Number.parseFloat(financialData.datos.dolar) || 1)}
                    onChange={(e) => {
                      const val = parseCurrencyInput(e.target.value, simCurrency, Number.parseFloat(financialData.datos.dolar) || 1);
                      updateSimulation('importe_operacion', val);
                    }}
                    className="h-7 text-xs input-currency"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Anticipo ({simCurrency})</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyInput(settings.simulacion.aporte_operacion, simCurrency, Number.parseFloat(financialData.datos.dolar) || 1)}
                    onChange={(e) => {
                      const val = parseCurrencyInput(e.target.value, simCurrency, Number.parseFloat(financialData.datos.dolar) || 1);
                      updateSimulation('aporte_operacion', val);
                    }}
                    className="h-7 text-xs input-currency"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Cuotas</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={settings.simulacion.cantidad_cuotas}
                    onChange={(e) => updateSimulation('cantidad_cuotas', Number(e.target.value.replace(/\D/g, '')) || 0)}
                    className="h-7 text-xs input-currency"
                  />
                </div>
              </div>
              {/* Row 2: Results */}
              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-dashed">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Saldo ({simCurrency})</p>
                  <p className="text-sm font-mono font-semibold">
                    {simCurrency === 'USD'
                      ? formatUSD(calculations.saldo_a_financiar_usd)
                      : formatCurrency(calculations.saldo_a_financiar_usd * (Number.parseFloat(financialData.datos.dolar) || 1))}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Cuota/Mes</p>
                  <p className="text-sm font-mono font-semibold">
                    {simCurrency === 'USD'
                      ? formatUSD(calculations.cuota_mensual_usd)
                      : formatCurrency(calculations.cuota_mensual_usd * (Number.parseFloat(financialData.datos.dolar) || 1))}
                  </p>
                  {settings.simulacion.cac_percent > 0 && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400">
                      Base {formatUSD(calculations.cuota_mensual_base_usd)} + CAC {formatUSD(calculations.cuota_mensual_usd - calculations.cuota_mensual_base_usd)}
                    </p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Solvencia</p>
                  <p className="text-sm font-mono font-semibold">{calculations.solvencia_meses.toFixed(1)} meses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result Card - compact */}
          <Card className="analysis-card card-result">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ratio Cobertura</p>
                <p className={cn('text-3xl font-bold', calculations.statusClass)}>
                  {calculations.ratio_cobertura.toFixed(2)}x
                </p>
                <p className={cn('text-sm font-semibold', calculations.statusClass)}>
                  {calculations.status}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total ARS</span>
                  <span className="font-mono">{formatCurrency(calculations.monto_total_operar_ars)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total USD</span>
                  <span className="font-mono">{formatUSD(calculations.monto_total_operar_usd)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Visualization - Operation Duration vs Solvency */}
        {calculations.cantidad_cuotas > 0 && (
          <Card className="analysis-card mt-3">
            <CardContent className="py-2 px-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Línea de Tiempo
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  {settings.simulacion.rem_percent > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                      <TrendingUp className="h-3 w-3" />
                      REM +{settings.simulacion.rem_percent}%
                    </div>
                  )}
                  {settings.simulacion.cac_percent > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-700 dark:text-amber-300">
                      <TrendingUp className="h-3 w-3" />
                      CAC +{settings.simulacion.cac_percent}%
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* Operation Duration Bar (reference) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground">Plazo Operación</span>
                    <span className="font-mono font-medium">{calculations.cantidad_cuotas} meses</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full transition-all duration-500"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Solvency Bar (parallel comparison) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground">Cobertura Solvencia</span>
                    <span className={cn(
                      "font-mono font-medium",
                      calculations.solvencia_meses >= calculations.cantidad_cuotas ? "text-green-600" : "text-amber-600"
                    )}>
                      {calculations.solvencia_meses.toFixed(1)} meses ({((calculations.solvencia_meses / calculations.cantidad_cuotas) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full relative overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        calculations.solvencia_meses >= calculations.cantidad_cuotas
                          ? "bg-gradient-to-r from-green-400 to-green-500"
                          : calculations.solvencia_meses >= calculations.cantidad_cuotas * 0.75
                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                            : "bg-gradient-to-r from-red-400 to-red-500"
                      )}
                      style={{
                        width: `${Math.min(100, (calculations.solvencia_meses / calculations.cantidad_cuotas) * 100)}%`
                      }}
                    />
                    {/* 100% marker line */}
                    {calculations.solvencia_meses < calculations.cantidad_cuotas && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-500 dark:bg-slate-400"
                        style={{ left: '100%', transform: 'translateX(-1px)' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Status message */}
              <div className={cn(
                "mt-2 pt-2 border-t flex items-center justify-center gap-2 text-[10px] font-medium",
                calculations.solvencia_meses >= calculations.cantidad_cuotas
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              )}>
                {calculations.solvencia_meses >= calculations.cantidad_cuotas ? (
                  <>
                    <span>✓ Cobertura completa</span>
                    {calculations.solvencia_meses > calculations.cantidad_cuotas && (
                      <span className="text-muted-foreground">
                        (+{(calculations.solvencia_meses - calculations.cantidad_cuotas).toFixed(1)} meses adicionales)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span>⚠ Cobertura parcial</span>
                    <span className="text-muted-foreground">
                      (faltan {(calculations.cantidad_cuotas - calculations.solvencia_meses).toFixed(1)} meses)
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Income Cards Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-2 gap-2">
        {/* Row 1 */}
        {client.person_type === 'PF' && (
          <>
            <ExpandableCard
              title="Ganancias"
              weight={settings.weights.ganancias}
              onWeightChange={(v) => updateWeight('ganancias', v)}
              subtotal={calculations.subtotals.ganancias}
              className="col-span-2"
              sourceDocuments={documents
                .filter(d => d.doc_type === 'Ganancias' && d.status === 'Validado')
                .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: d.reviewed_data ? `Año: ${(d.reviewed_data as unknown as ReviewedData)?.anio_fiscal || 'N/A'}` : undefined }))}
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <CompactField label="Año Fiscal" value={financialData.ganancias.anio_fiscal} onChange={(v) => updateFinancialField('ganancias', 'anio_fiscal', v)} isText />
                <CompactField label="Fecha DJ" value={financialData.ganancias.fecha_declaracion_jurada} onChange={(v) => updateFinancialField('ganancias', 'fecha_declaracion_jurada', v)} isText />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CompactField label="1ra Categoría (Renta del Suelo)" value={financialData.ganancias.primera_cat} onChange={(v) => updateFinancialField('ganancias', 'primera_cat', v)} />
                <CompactField label="2da Cat. (Acciones / Intereses)" value={financialData.ganancias.segunda_cat_acciones} onChange={(v) => updateFinancialField('ganancias', 'segunda_cat_acciones', v)} />
                <CompactField label="2da Cat. (Instrumentos Financieros)" value={financialData.ganancias.segunda_cat_instrumentos} onChange={(v) => updateFinancialField('ganancias', 'segunda_cat_instrumentos', v)} />
                <CompactField label="2da Cat. (Dividendos y Utilidades)" value={financialData.ganancias.segunda_cat_dividendos} onChange={(v) => updateFinancialField('ganancias', 'segunda_cat_dividendos', v)} />
                <CompactField label="3ra Categoría (Participaciones)" value={financialData.ganancias.tercera_cat} onChange={(v) => updateFinancialField('ganancias', 'tercera_cat', v)} />
                <CompactField label="4ta Categoría (Trabajo Personal)" value={financialData.ganancias.cuarta_cat} onChange={(v) => updateFinancialField('ganancias', 'cuarta_cat', v)} />
              </div>

              <div className="mt-4 pt-4 border-t">
                <CompactField label="Monto Consumido / Gastos" value={financialData.ganancias.monto_consumido} onChange={(v) => updateFinancialField('ganancias', 'monto_consumido', v)} />
              </div>

              <CustomFieldsSection
                fields={financialData.custom_fields?.ganancias || []}
                onAdd={() => addCustomField('ganancias')}
                onUpdate={(id, updates) => updateCustomField('ganancias', id, updates)}
                onRemove={(id) => removeCustomField('ganancias', id)}
                dolarRate={calculations.dolar}
              />
            </ExpandableCard>


            {visibleSections.has('otros') && (
              <ExpandableCard
                title="Otros"
                weight={settings.weights.otros}
                onWeightChange={(v) => updateWeight('otros', v)}
                subtotal={calculations.subtotals.otros}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CompactField label="Donación / Mutuo (USD)" value={financialData.otros.venta_propiedad} onChange={(v) => updateFinancialField('otros', 'venta_propiedad', v)} />
                  <CompactField label="Arrendamiento" value={financialData.otros.arrendamiento} onChange={(v) => updateFinancialField('otros', 'arrendamiento', v)} />
                  <CompactField label="Escritura / Venta" value={financialData.otros.escriturasCesionesVentas} onChange={(v) => updateFinancialField('otros', 'escriturasCesionesVentas', v)} />
                  <CompactField label="Blanqueo / Moratoria" value={financialData.otros.blanqueo} onChange={(v) => updateFinancialField('otros', 'blanqueo', v)} />
                </div>

                <CustomFieldsSection
                  fields={financialData.custom_fields?.otros || []}
                  onAdd={() => addCustomField('otros')}
                  onUpdate={(id, updates) => updateCustomField('otros', id, updates)}
                  onRemove={(id) => removeCustomField('otros', id)}
                  dolarRate={calculations.dolar}
                />
              </ExpandableCard>
            )}

            <ExpandableCard
              title="Monotributo"
              weight={settings.weights.monotributo}
              onWeightChange={(v) => updateWeight('monotributo', v)}
              subtotal={calculations.subtotals.monotributo}
              sourceDocuments={documents
                .filter(d => d.doc_type === 'Monotributo' && d.status === 'Validado')
                .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: `Cat. ${(d.reviewed_data as unknown as ReviewedData)?.categoria || 'N/A'}` }))}
            >
              <div className="space-y-4 p-2 bg-secondary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Categoría Vigente</Label>
                  <select
                    className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
                    value={financialData.monotributo.categoria}
                    onChange={(e) => setFinancialData(prev => ({
                      ...prev,
                      monotributo: { ...prev.monotributo, categoria: e.target.value }
                    }))}
                  >
                    <option value="">- Seleccionar -</option>
                    {Object.keys(MONOTRIBUTO_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>Categoría {cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 bg-card p-3 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Tope Anual (Tabla)</span>
                    <span className="font-mono text-sm">
                      {formatCurrency(calculations.bases.monotributo_original || 0)}
                    </span>
                  </div>
                  {settings.simulacion.rem_percent > 0 && (
                    <>
                      <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                        <span className="text-xs">Ajuste REM (+{settings.simulacion.rem_percent}%)</span>
                        <span className="font-mono text-sm">
                          + {formatCurrency((calculations.bases.monotributo_original || 0) * (settings.simulacion.rem_percent / 100))}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center font-semibold">
                        <span className="text-xs">Subtotal Ajustado</span>
                        <span className="font-mono text-base text-green-600 dark:text-green-400">
                          {formatCurrency(calculations.bases.monotributo || 0)}
                        </span>
                      </div>
                    </>
                  )}
                  {settings.simulacion.rem_percent === 0 && (
                    <div className="text-[10px] text-muted-foreground italic pt-1 border-t">
                      Sin ajuste REM. Configure el % en el encabezado para aplicar ajuste.
                    </div>
                  )}
                </div>
              </div>

              <CustomFieldsSection
                fields={financialData.custom_fields?.monotributo || []}
                onAdd={() => addCustomField('monotributo')}
                onUpdate={(id, updates) => updateCustomField('monotributo', id, updates)}
                onRemove={(id) => removeCustomField('monotributo', id)}
                dolarRate={calculations.dolar}
              />
            </ExpandableCard>
          </>
        )}

        <ExpandableCard
          title="IVA"
          weight={settings.weights.iva}
          onWeightChange={(v) => updateWeight('iva', v)}
          subtotal={calculations.subtotals.iva}
          sourceDocuments={documents
            .filter(d => d.doc_type === 'IVA' && d.status === 'Validado')
            .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: `Año: ${(d.reviewed_data as unknown as ReviewedData)?.anio_fiscal || 'N/A'}` }))}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CompactField label="Año Fiscal" value={financialData.iva.anio_fiscal} onChange={(v) => updateFinancialField('iva', 'anio_fiscal', v)} isText />
              <CompactField label="Fecha DJ" value={financialData.iva.fecha_declaracion_jurada} onChange={(v) => updateFinancialField('iva', 'fecha_declaracion_jurada', v)} isText />
            </div>
            <div className="space-y-2 p-3 border rounded-lg bg-secondary/5">
              <Label className="text-sm font-medium">Débitos Fiscales Mensuales</Label>
              <p className="text-xs text-muted-foreground mb-2">Ingresa los valores separados por coma (ej: 1000, 2000, 1500)</p>
              <Input
                className="h-10 font-mono"
                value={(financialData.iva.debitos_fiscales || []).join(', ')}
                onChange={(e) => {
                  const val = e.target.value;
                  const numbers = val.split(',').map(s => {
                    const clean = s.trim();
                    return clean === '' ? Number.NaN : Number.parseFloat(clean);
                  }).filter(n => !Number.isNaN(n));

                  setFinancialData(prev => ({
                    ...prev,
                    iva: {
                      ...prev.iva,
                      debitos_fiscales: numbers
                    }
                  }));
                }}
                placeholder="Ej: 1500.50, 2000, 1800"
              />
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Cantidad Meses: <span className="font-medium text-foreground">{(financialData.iva.debitos_fiscales || []).length}</span></span>
                <span>Promedio Mensual: <span className="font-medium text-foreground">${
                  ((financialData.iva.debitos_fiscales || []).length > 0
                    ? (financialData.iva.debitos_fiscales || []).reduce((a, b) => a + b, 0) / (financialData.iva.debitos_fiscales || []).length
                    : 0
                  ).toLocaleString('es-AR', { maximumFractionDigits: 2 })
                }</span></span>
              </div>
            </div>
          </div>

          <CustomFieldsSection
            fields={financialData.custom_fields?.iva || []}
            onAdd={() => addCustomField('iva')}
            onUpdate={(id, updates) => updateCustomField('iva', id, updates)}
            onRemove={(id) => removeCustomField('iva', id)}
            dolarRate={calculations.dolar}
          />
        </ExpandableCard>

        {client.person_type === 'PF' && (
          <ExpandableCard
            title="Recibo de Haberes"
            weight={settings.weights.haberes}
            onWeightChange={(v) => updateWeight('haberes', v)}
            subtotal={calculations.subtotals.haberes}
            sourceDocuments={documents
              .filter(d => d.doc_type === 'ReciboHaberes' && d.status === 'Validado')
              .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: formatCurrency(Number((d.reviewed_data as unknown as ReviewedData)?.sueldo_neto) || 0) }))}
          >
            <div className="p-4 bg-secondary/10 rounded-lg space-y-4">
              <CompactField label="Total Sueldo Neto (Mensual)" value={financialData.recibo_haberes.sueldo_neto} onChange={(v) => updateFinancialField('recibo_haberes', 'sueldo_neto', v)} />
              <div className="space-y-2 pt-2 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Proyección Anual (x12)</span>
                  <span className="font-mono text-sm">{formatCurrency(calculations.bases.haberes_original || 0)}</span>
                </div>
                {settings.simulacion.rem_percent > 0 && (
                  <>
                    <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                      <span className="text-xs">Ajuste REM (+{settings.simulacion.rem_percent}%)</span>
                      <span className="font-mono text-sm">
                        + {formatCurrency((calculations.bases.haberes_original || 0) * (settings.simulacion.rem_percent / 100))}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-semibold">
                      <span className="text-xs">Subtotal Ajustado</span>
                      <span className="font-mono text-base text-green-600 dark:text-green-400">
                        {formatCurrency(calculations.bases.haberes || 0)}
                      </span>
                    </div>
                  </>
                )}
                {settings.simulacion.rem_percent === 0 && (
                  <div className="text-[10px] text-muted-foreground italic">
                    Sin ajuste REM. Configure el % en el encabezado para aplicar ajuste.
                  </div>
                )}
              </div>
            </div>

            <CustomFieldsSection
              fields={financialData.custom_fields?.recibo_haberes || []}
              onAdd={() => addCustomField('recibo_haberes')}
              onUpdate={(id, updates) => updateCustomField('recibo_haberes', id, updates)}
              onRemove={(id) => removeCustomField('recibo_haberes', id)}
              dolarRate={calculations.dolar}
            />
          </ExpandableCard>
        )}

        {/* Row 2 */}

        {client.person_type === 'PF' && (
          <>
            <ExpandableCard
              title="Certificación Contable"
              weight={settings.weights.certificacion_contable}
              onWeightChange={(v) => updateWeight('certificacion_contable', v)}
              subtotal={calculations.subtotals.certificacion}
              sourceDocuments={documents
                .filter(d => d.doc_type === 'CertificacionContable' && d.status === 'Validado')
                .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: formatCurrency(Number((d.reviewed_data as unknown as ReviewedData)?.certificacion_firmada) || 0) }))}
            >
              <div className="p-4 bg-secondary/10 rounded-lg">
                <CompactField label="Monto Certificación Firmada" value={financialData.certificacion_contable.certificacion_firmada} onChange={(v) => updateFinancialField('certificacion_contable', 'certificacion_firmada', v)} />
              </div>

              <CustomFieldsSection
                fields={financialData.custom_fields?.certificacion_contable || []}
                onAdd={() => addCustomField('certificacion_contable')}
                onUpdate={(id, updates) => updateCustomField('certificacion_contable', id, updates)}
                onRemove={(id) => removeCustomField('certificacion_contable', id)}
                dolarRate={calculations.dolar}
              />
            </ExpandableCard>

            <ExpandableCard
              title="Bienes Personales"
              weight={settings.weights.bienes_personales}
              onWeightChange={(v) => updateWeight('bienes_personales', v)}
              subtotal={calculations.subtotals.bienes_personales}
              sourceDocuments={documents
                .filter(d => d.doc_type === 'BienesPersonales' && d.status === 'Validado')
                .map(d => {
                  const rd = d.reviewed_data as unknown as ReviewedData;
                  const total = (Number(rd?.efectivo_pais) || 0) + (Number(rd?.efectivo_exterior) || 0) + (Number(rd?.exento_no_alcanzado) || 0);
                  return { id: d.id, filename: d.original_filename, formattedValue: formatCurrency(total) };
                })}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CompactField label="Efectivo en el País" value={financialData.bienes_personales.efectivo_pais} onChange={(v) => updateFinancialField('bienes_personales', 'efectivo_pais', v)} />
                <CompactField label="Efectivo en el Exterior" value={financialData.bienes_personales.efectivo_exterior} onChange={(v) => updateFinancialField('bienes_personales', 'efectivo_exterior', v)} />
                <CompactField label="Exento / No Alcanzado" value={financialData.bienes_personales.exento_no_alcanzado} onChange={(v) => updateFinancialField('bienes_personales', 'exento_no_alcanzado', v)} />
              </div>
              <div className="mt-4 pt-4 border-t text-right">
                <span className="text-sm text-muted-foreground mr-2">Total Bienes: </span>
                <span className="text-lg font-mono font-medium">{formatCurrency(calculations.bases.bienes_personales)}</span>
              </div>

              <CustomFieldsSection
                fields={financialData.custom_fields?.bienes_personales || []}
                onAdd={() => addCustomField('bienes_personales')}
                onUpdate={(id, updates) => updateCustomField('bienes_personales', id, updates)}
                onRemove={(id) => removeCustomField('bienes_personales', id)}
                dolarRate={calculations.dolar}
              />
            </ExpandableCard>
          </>
        )}

        {client.person_type === 'PJ' && (
          <ExpandableCard
            title="Estado de Resultados"
            weight={100}
            onWeightChange={() => { }}
            subtotal={calculations.subtotals.datos_balance}
            hideWeight={true}
            sourceDocuments={documents
              .filter(d => (d.doc_type === 'EECC' || d.doc_type === 'Otros') && d.status === 'Validado')
              .map(d => ({ id: d.id, filename: d.original_filename, formattedValue: d.doc_type }))}
          >
            {/* Datos del Balance */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CompactField label="Caja y Bancos" value={financialData.datos_balance?.caja_y_bancos || 0} onChange={(v) => updateFinancialField('datos_balance', 'caja_y_bancos', v)} />
                <CompactField label="Patrimonio Neto" value={financialData.datos_balance?.patrimonio_neto || 0} onChange={(v) => updateFinancialField('datos_balance', 'patrimonio_neto', v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CompactField label="Ingresos" value={financialData.datos_balance?.ingresos || 0} onChange={(v) => updateFinancialField('datos_balance', 'ingresos', v)} />
                <CompactField label="Costos" value={financialData.datos_balance?.costos || 0} onChange={(v) => updateFinancialField('datos_balance', 'costos', v)} />
              </div>

              {/* Switch Ingresos / Resultado Bruto */}
              <div className="p-3 border rounded-lg bg-secondary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Usar para cálculo:</Label>
                  <div className="flex items-center gap-2 bg-muted/50 p-0.5 rounded-lg border">
                    <button
                      onClick={() => setFinancialData(prev => ({
                        ...prev,
                        estado_resultados_settings: {
                          ...DEFAULT_ESTADO_RESULTADOS_SETTINGS,
                          ...prev.estado_resultados_settings,
                          usar_resultado_bruto: false
                        }
                      }))}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-all",
                        financialData.estado_resultados_settings?.usar_resultado_bruto
                          ? "text-muted-foreground hover:text-foreground"
                          : "bg-background shadow-sm text-foreground"
                      )}
                    >
                      Ingresos
                    </button>
                    <button
                      onClick={() => setFinancialData(prev => ({
                        ...prev,
                        estado_resultados_settings: {
                          ...DEFAULT_ESTADO_RESULTADOS_SETTINGS,
                          ...prev.estado_resultados_settings,
                          usar_resultado_bruto: true
                        }
                      }))}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-all",
                        financialData.estado_resultados_settings?.usar_resultado_bruto
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Resultado Bruto
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData.estado_resultados_settings?.usar_resultado_bruto
                    ? `Resultado Bruto = Ingresos - Costos = ${formatCurrency(calculations.pj_details.resultado_bruto)}`
                    : `Ingresos = ${formatCurrency(calculations.pj_details.ingresos)}`
                  }
                </p>
              </div>

              {/* Sliders de Porcentajes */}
              <div className="p-3 border rounded-lg bg-secondary/10 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ponderaciones</p>

                {/* Peso Caja y Bancos */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Peso Caja y Bancos</Label>
                    <span className="text-xs font-mono font-medium">{financialData.estado_resultados_settings?.peso_caja_bancos || 70}%</span>
                  </div>
                  <Slider
                    value={[financialData.estado_resultados_settings?.peso_caja_bancos || 70]}
                    onValueChange={([v]) => setFinancialData(prev => ({
                      ...prev,
                      estado_resultados_settings: {
                        ...DEFAULT_ESTADO_RESULTADOS_SETTINGS,
                        ...prev.estado_resultados_settings,
                        peso_caja_bancos: v
                      }
                    }))}
                    max={100}
                    step={5}
                    className="h-2"
                  />
                </div>

                {/* Peso Ingresos */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Peso {financialData.estado_resultados_settings?.usar_resultado_bruto ? 'Resultado Bruto' : 'Ingresos'}</Label>
                    <span className="text-xs font-mono font-medium">{financialData.estado_resultados_settings?.peso_ingresos || 30}%</span>
                  </div>
                  <Slider
                    value={[financialData.estado_resultados_settings?.peso_ingresos || 30]}
                    onValueChange={([v]) => setFinancialData(prev => ({
                      ...prev,
                      estado_resultados_settings: {
                        ...DEFAULT_ESTADO_RESULTADOS_SETTINGS,
                        ...prev.estado_resultados_settings,
                        peso_ingresos: v
                      }
                    }))}
                    max={100}
                    step={5}
                    className="h-2"
                  />
                </div>

                {/* Porcentaje Patrimonio Neto */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">% del Patrimonio Neto (mínimo)</Label>
                    <span className="text-xs font-mono font-medium">{financialData.estado_resultados_settings?.porcentaje_patrimonio_neto || 10}%</span>
                  </div>
                  <Slider
                    value={[financialData.estado_resultados_settings?.porcentaje_patrimonio_neto || 10]}
                    onValueChange={([v]) => setFinancialData(prev => ({
                      ...prev,
                      estado_resultados_settings: {
                        ...DEFAULT_ESTADO_RESULTADOS_SETTINGS,
                        ...prev.estado_resultados_settings,
                        porcentaje_patrimonio_neto: v
                      }
                    }))}
                    max={100}
                    step={1}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Desglose del Cálculo */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cálculo</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>Caja × {financialData.estado_resultados_settings?.peso_caja_bancos || 70}%</span>
                    <span className="font-mono">{formatCurrency(calculations.pj_details.caja_bancos_ponderado)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>{financialData.estado_resultados_settings?.usar_resultado_bruto ? 'R.Bruto' : 'Ingresos'} × {financialData.estado_resultados_settings?.peso_ingresos || 30}%</span>
                    <span className="font-mono">{formatCurrency(calculations.pj_details.ingresos_ponderado)}</span>
                  </div>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded text-sm">
                  <span className="font-medium">Suma Ponderada</span>
                  <span className="font-mono font-semibold">{formatCurrency(calculations.pj_details.suma_ponderada)}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded text-sm">
                  <span className="font-medium">{financialData.estado_resultados_settings?.porcentaje_patrimonio_neto || 10}% Patrimonio Neto</span>
                  <span className="font-mono font-semibold">{formatCurrency(calculations.pj_details.porcentaje_patrimonio)}</span>
                </div>
                <div className={cn(
                  "flex justify-between p-3 rounded text-sm font-semibold",
                  calculations.pj_details.usando_porcentaje_patrimonio
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                )}>
                  <span>
                    {calculations.pj_details.usando_porcentaje_patrimonio
                      ? '→ Usa % Patrimonio (mayor)'
                      : '→ Usa Suma Ponderada (mayor)'}
                  </span>
                  <span className="font-mono">{formatCurrency(calculations.bases.datos_balance)}</span>
                </div>
              </div>

              {/* Custom Fields Section */}
              <CustomFieldsSection
                fields={financialData.custom_fields?.estado_resultados || []}
                onAdd={() => addCustomField('estado_resultados')}
                onUpdate={(id, updates) => updateCustomField('estado_resultados', id, updates)}
                onRemove={(id) => removeCustomField('estado_resultados', id)}
                dolarRate={calculations.dolar}
              />
            </div>
          </ExpandableCard>
        )}

      </div>
    </div>
  );
}

// Compact field for inputs - Updated for Dialog usage
interface CompactFieldProps {
  label: string;
  value: number | string;
  onChange: (value: string | number) => void;
  isText?: boolean;
}

function CompactField({ label, value, onChange, isText }: Readonly<CompactFieldProps>) {
  // Format number with commas as thousand separators
  const formatWithCommas = (num: number | string): string => {
    const n = typeof num === 'string' ? Number.parseFloat(num.replace(/,/g, '')) : num;
    if (Number.isNaN(n) || n === 0) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Parse string with commas back to number
  const parseFromCommas = (str: string): number => {
    const clean = str.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return Number.parseFloat(clean) || 0;
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="relative">
        <Input
          type="text"
          inputMode={isText ? 'text' : 'decimal'}
          value={isText ? value : formatWithCommas(value)}
          onChange={(e) => {
            if (isText) {
              onChange(e.target.value);
            } else {
              onChange(parseFromCommas(e.target.value));
            }
          }}
          className="h-9 text-sm font-medium bg-background"
        />
        {!isText && (
          <div className="absolute right-3 top-2.5 pointer-events-none">
            <span className="text-xs text-muted-foreground font-mono">{formatCurrency(Number(value) || 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
