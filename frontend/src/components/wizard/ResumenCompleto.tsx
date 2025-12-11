import React from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { WizardData } from '@/types/wizard';

interface ResumenCompletoProps {
  forPDF?: boolean;
  wizardData?: WizardData;
}

export const ResumenCompleto: React.FC<ResumenCompletoProps> = ({ forPDF = false, wizardData }) => {
  const { data } = useWizard();

  // Usar los datos proporcionados o los del contexto
  const displayData = wizardData || data;

  // Formateo de moneda
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.00";
    return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Formateo de fecha
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return dateString;
  };

  // Cálculos
  const porcB = 100 - (displayData.porcA || 0);

  const cocherasCant = displayData.cocheras?.length || 0;
  const totalCocheras = displayData.cocheras?.reduce((sum, cochera) => sum + (cochera.precioNegociado || 0), 0) || 0;
  const totalReglasA = (displayData.reglasFinanciacionA || []).reduce((sum, regla) => sum + regla.saldoFinanciar, 0);
  const totalReglasB = (displayData.reglasFinanciacionB || []).reduce((sum, regla) => sum + regla.saldoFinanciar, 0);

  return (
    <div className={`space-y-6 ${forPDF ? 'pdf-content bg-white p-8' : ''}`}>

      {/* Paso 1: Proyecto & Unidad */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">1. Proyecto & Unidad</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Proyecto:</p>
              <p className="font-medium">{displayData.proyecto || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unidad:</p>
              <p className="font-medium">{displayData.unidadDescripcion || displayData.unidad || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Posesión:</p>
              <p className="font-medium">{formatDate(displayData.fechaPosesion)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 2: Estructura Comercial */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">2. Estructura Comercial</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Precio Negociado:</p>
              <p className="font-medium">${formatCurrency(displayData.precioNegociado)}</p>
            </div>
            {cocherasCant > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Cocheras ({cocherasCant}):</p>
                <p className="font-medium">${formatCurrency(totalCocheras)}</p>
              </div>
            )}
            {displayData.baulera && (
              <div>
                <p className="text-sm text-muted-foreground">Baulera:</p>
                <p className="font-medium">${formatCurrency(displayData.baulera.precioNegociado)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paso 3: Composición F/SB */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">3. Composición F/SB</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Modo F:</p>
              <p className="font-medium">{displayData.modoA === "porcentaje" ? "Porcentaje" : "Importe"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Porcentaje F:</p>
              <p className="font-medium">{displayData.porcA || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Porcentaje SB:</p>
              <p className="font-medium">{porcB}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor F ({displayData.monedaA}):</p>
              <p className="font-medium">${formatCurrency(displayData.valorArsConIVA)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor SB ({displayData.monedaB}):</p>
              <p className="font-medium">${formatCurrency(displayData.valorUsdConIVA)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Moneda F:</p>
              <p className="font-medium">{displayData.monedaA || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Moneda SB:</p>
              <p className="font-medium">{displayData.monedaB || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 4: Pago */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">4. Pago F/SB</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Pago:</p>
              <p className="font-medium capitalize">{displayData.tipoPago || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Cambio ({displayData.tcFuente}):</p>
              <p className="font-medium">${formatCurrency(displayData.tcValor)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anticipo ARS F:</p>
              <p className="font-medium">${formatCurrency(displayData.anticipoArsA || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anticipo ARS SB:</p>
              <p className="font-medium">${formatCurrency(displayData.anticipoArsB || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anticipo USD F:</p>
              <p className="font-medium">${formatCurrency(displayData.anticipoUsdA || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anticipo USD SB:</p>
              <p className="font-medium">${formatCurrency(displayData.anticipoUsdB || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A financiar ARS:</p>
              <p className="font-medium">${formatCurrency(displayData.totalFinanciarArs)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A financiar USD:</p>
              <p className="font-medium">${formatCurrency(displayData.totalFinanciarUsd)}</p>
            </div>
            {displayData.fechaFirmaBoleto && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha Firma Boleto:</p>
                <p className="font-medium">{formatDate(displayData.fechaFirmaBoleto)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paso 5: Cargos & Extras */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">5. Cargos & Extras</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Certificación de Firmas:</p>
              <p className="font-medium">${formatCurrency(displayData.certificacionFirmas)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.certificacionFirmasPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sellado ({displayData.selladoPorcentaje}%):</p>
              <p className="font-medium">${formatCurrency(displayData.selladoMonto)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.selladoPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alhajamiento:</p>
              <p className="font-medium">${formatCurrency(displayData.alhajamiemtoMonto)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.alhajamiemtoPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planos Unidad:</p>
              <p className="font-medium">${formatCurrency(displayData.planosUnidadMonto)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.planosUnidadPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planos Cochera:</p>
              <p className="font-medium">${formatCurrency(displayData.planosCocheraMonto)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.planosCocheraPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Otros Gastos:</p>
              <p className="font-medium">${formatCurrency(displayData.otrosGastos)}</p>
              <p className="text-xs text-muted-foreground">Pago: {displayData.otrosGastosPago}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cargos ARS:</p>
              <p className="font-medium">${formatCurrency(displayData.totalCargosArs)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cargos USD:</p>
              <p className="font-medium">${formatCurrency(displayData.totalCargosUsd)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 6: Reglas de Financiación */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">6. Reglas de Financiación F/SB</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Parte F ({displayData.monedaA})</h3>
              {displayData.reglasFinanciacionA && displayData.reglasFinanciacionA.length > 0 ? (
                <div className="space-y-3">
                  {displayData.reglasFinanciacionA.map((regla, index) => (
                    <div key={regla.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline">Regla {index + 1}</Badge>
                        <Badge variant={regla.moneda === "USD" ? "secondary" : "default"}>{regla.moneda}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Saldo a financiar:</p>
                          <p className="font-medium">${formatCurrency(regla.saldoFinanciar)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cuotas:</p>
                          <p className="font-medium">{regla.numCuotas} ({regla.periodicidad})</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Importe cuota:</p>
                          <p className="font-medium">${formatCurrency(regla.importeCuota)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Primer vencimiento:</p>
                          <p className="font-medium">{regla.primerVencimiento}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Total financiado F:</p>
                    <p className="font-medium">${formatCurrency(totalReglasA)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay reglas de financiación para la Parte F</p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">Parte SB ({displayData.monedaB})</h3>
              {displayData.reglasFinanciacionB && displayData.reglasFinanciacionB.length > 0 ? (
                <div className="space-y-3">
                  {displayData.reglasFinanciacionB.map((regla, index) => (
                    <div key={regla.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline">Regla {index + 1}</Badge>
                        <Badge variant={regla.moneda === "USD" ? "secondary" : "default"}>{regla.moneda}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Saldo a financiar:</p>
                          <p className="font-medium">${formatCurrency(regla.saldoFinanciar)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cuotas:</p>
                          <p className="font-medium">{regla.numCuotas} ({regla.periodicidad})</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Importe cuota:</p>
                          <p className="font-medium">${formatCurrency(regla.importeCuota)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Primer vencimiento:</p>
                          <p className="font-medium">{regla.primerVencimiento}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Total financiado SB:</p>
                    <p className="font-medium">${formatCurrency(totalReglasB)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay reglas de financiación para la Parte SB</p>
              )}
            </div>

            <div className="mt-4 p-3 bg-primary/5 rounded-md">
              <p className="text-sm font-medium">% financiado a fecha Posesión:</p>
              <p className="text-xl font-bold">{displayData.porcentajePagadoFechaPosesion || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
