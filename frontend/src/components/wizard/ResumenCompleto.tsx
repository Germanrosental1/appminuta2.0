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

  // Calcular precio total de todas las unidades seleccionadas
  const calcularPrecioTotal = () => {
    let total = 0;

    // Sumar precios de todas las unidades en el nuevo modelo
    if (displayData.unidades && displayData.unidades.length > 0) {
      displayData.unidades.forEach(unidad => {
        total += unidad.precioNegociado || 0;
      });
      return total;
    }

    // Fallback al modelo antiguo si no hay unidades en el nuevo modelo
    total = displayData.precioNegociado || 0;

    // Sumar precios de cocheras del modelo antiguo
    const cocheras = displayData.cocheras || [];
    if (cocheras.length > 0) {
      cocheras.forEach(cochera => {
        total += cochera.precioNegociado || 0;
      });
    }

    // Sumar precio de baulera si existe
    if (displayData.baulera) {
      total += displayData.baulera.precioNegociado || 0;
    }

    return total;
  };

  // Cálculos
  const precioTotal = calcularPrecioTotal();
  const porcB = 100 - (displayData.porcA || 0);

  const cocherasCant = displayData.cocheras?.length || 0;
  const totalCocheras = displayData.cocheras?.reduce((sum, cochera) => sum + (cochera.precioNegociado || 0), 0) || 0;
  const totalReglasA = (displayData.reglasFinanciacionA || []).reduce((sum, regla) => {
    // Si la regla está en USD, convertir a ARS
    if (regla.moneda === "USD") {
      return sum + (regla.saldoFinanciar * (displayData.tcValor || 1));
    }
    return sum + regla.saldoFinanciar;
  }, 0);

  const totalReglasB = (displayData.reglasFinanciacionB || []).reduce((sum, regla) => {
    // Si Part B es ARS y la regla es USD, convertir a ARS
    if (displayData.monedaB === "ARS" && regla.moneda === "USD") {
      return sum + (regla.saldoFinanciar * (displayData.tcValor || 1));
    }
    // Si Part B es USD y la regla es ARS, convertir a USD
    if (displayData.monedaB === "USD" && regla.moneda === "ARS") {
      return sum + (regla.saldoFinanciar / (displayData.tcValor || 1));
    }
    return sum + regla.saldoFinanciar;
  }, 0);


  return (
    <div className={`space-y-6 ${forPDF ? 'pdf-content bg-white p-8' : ''}`}>

      {/* Grid Layout for Top Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Paso 1: Proyecto & Unidades */}
        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <CardTitle className="text-base font-bold text-card-foreground">1. Proyecto & Unidades</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-4">
              {/* Mostrar todas las unidades seleccionadas */}
              {displayData.unidades && displayData.unidades.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                    {displayData.unidades.length} Unidad{displayData.unidades.length !== 1 ? 'es' : ''} seleccionada{displayData.unidades.length !== 1 ? 's' : ''}
                  </p>
                  {displayData.unidades.map((unidad, index) => (
                    <div key={unidad.id || index} className="border border-border rounded-md p-3 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-card-foreground border-border text-xs px-1.5 py-0">{unidad.tipo}</Badge>
                        <span className="font-medium text-card-foreground text-sm">{unidad.descripcion}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Proyecto: </span>
                          <span className="font-medium text-card-foreground">{unidad.proyecto || displayData.proyecto}</span>
                        </div>
                        {unidad.etapa && (
                          <div>
                            <span className="text-slate-400">Etapa: </span>
                            <span className="font-medium text-white">{unidad.etapa}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Proyecto:</p>
                    <p className="font-medium text-card-foreground text-sm">{displayData.proyecto || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unidad:</p>
                    <p className="font-medium text-card-foreground text-sm">{displayData.unidadDescripcion || displayData.unidad || "-"}</p>
                  </div>
                </div>
              )}

              <div className="pt-3 mt-auto border-t border-border">
                <p className="text-xs text-muted-foreground">Fecha de Posesión:</p>
                <p className="font-medium text-card-foreground">{formatDate(displayData.fechaPosesion)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paso 2: Estructura Comercial */}
        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <CardTitle className="text-base font-bold text-card-foreground">2. Acuerdo Comercial</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-4">
              {/* Precio total */}
              <div className="rounded-lg bg-muted/10 border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Precio Total Negociado</p>
                <p className="text-2xl font-bold text-blue-500">${formatCurrency(precioTotal)}</p>
              </div>

              {/* Desglose simplificado */}
              {displayData.unidades && displayData.unidades.length > 0 && (
                <div className="space-y-3">
                  {/* Solo mostrar las primeras 2 unidades si hay muchas para no explotar el layout */}
                  {displayData.unidades.slice(0, 3).map((unidad, index) => (
                    <div key={unidad.id || `unit-detail-${index}`} className="flex justify-between items-center text-xs border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="text-card-foreground font-medium block">{unidad.descripcion}</span>
                        <span className="text-muted-foreground text-[10px]">Lista: ${formatCurrency(unidad.precioLista)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-300 font-bold block">${formatCurrency(unidad.precioNegociado)}</span>
                        {unidad.precioLista > 0 && (
                          <span className="text-green-500 text-[10px]">-{Math.max(0, ((unidad.precioLista - unidad.precioNegociado) / unidad.precioLista) * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {displayData.unidades.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground italic">... y {displayData.unidades.length - 3} más</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Layout for Payment Structure & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Paso 3: Estructura de pago */}
        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <CardTitle className="text-base font-bold text-card-foreground">3. Estructura de pago</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Modo:</span>
              <Badge variant="outline" className="text-card-foreground border-border bg-muted/10">{displayData.modoA === "porcentaje" ? "Porcentaje" : "Importe Fijo"}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/10 p-3 rounded border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold text-blue-500">Parte F</span>
                </div>
                <p className="text-lg font-bold text-card-foreground mb-1">${formatCurrency(
                  displayData.modoA === "porcentaje"
                    ? (precioTotal * (displayData.porcA || 0)) / 100
                    : displayData.impA || displayData.valorArsConIVA
                )}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{displayData.porcA || 0}%</span>
                  <span className="text-muted-foreground badge px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30">{displayData.monedaA || "-"}</span>
                </div>
              </div>

              <div className="bg-muted/10 p-3 rounded border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-xs font-bold text-purple-500">Parte SB</span>
                </div>
                <p className="text-lg font-bold text-card-foreground mb-1">${formatCurrency(
                  displayData.modoA === "porcentaje"
                    ? (precioTotal * porcB) / 100
                    : (precioTotal - (displayData.impA || 0)) || displayData.valorUsdConIVA
                )}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{porcB}%</span>
                  <span className="text-muted-foreground badge px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">{displayData.monedaB || "-"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paso 4: Forma de pago Details */}
        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <CardTitle className="text-base font-bold text-card-foreground">4. Forma de pago</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <div className="col-span-2 flex justify-between pb-2 border-b border-border">
                <span className="text-muted-foreground">Tipo de Pago:</span>
                <span className="text-card-foreground font-medium capitalize">{displayData.tipoPago || "-"}</span>
              </div>

              <div>
                <p className="text-slate-500 mb-0.5">Anticipo F (ARS):</p>
                <p className="text-white font-medium">${formatCurrency(displayData.anticipoArsA || 0)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Anticipo SB (ARS):</p>
                <p className="text-white font-medium">${formatCurrency(displayData.anticipoArsB || 0)}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-0.5">Anticipo F (USD):</p>
                <p className="text-white font-medium">${formatCurrency(displayData.anticipoUsdA || 0)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Anticipo SB (USD):</p>
                <p className="text-white font-medium">${formatCurrency(displayData.anticipoUsdB || 0)}</p>
              </div>

              <div className="col-span-2 border-t border-border pt-2 mt-1"></div>

              <div>
                <p className="text-muted-foreground mb-0.5">Anticipo F (ARS):</p>
                <p className="text-card-foreground font-medium">${formatCurrency(displayData.anticipoArsA || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Anticipo SB (ARS):</p>
                <p className="text-card-foreground font-medium">${formatCurrency(displayData.anticipoArsB || 0)}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-0.5">Anticipo F (USD):</p>
                <p className="text-card-foreground font-medium">${formatCurrency(displayData.anticipoUsdA || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Anticipo SB (USD):</p>
                <p className="text-card-foreground font-medium">${formatCurrency(displayData.anticipoUsdB || 0)}</p>
              </div>

              <div className="col-span-2 border-t border-border pt-2 mt-1"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paso 5 & 7 Side by Side if client data exists, otherwise Cargos full width */}
      <div className={`grid grid-cols-1 ${displayData.clienteInteresado ? "md:grid-cols-2" : ""} gap-6`}>
        {/* Paso 5: Cargos & Extras */}
        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="bg-muted/30 border-b border-border py-3">
            <CardTitle className="text-base font-bold text-card-foreground">5. Cargos & Extras</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-4 text-xs">
              {/* Summary of Cargos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded bg-muted/10 border-border p-2">
                  <p className="text-muted-foreground mb-1">Total Cargos ARS</p>
                  <p className="text-card-foreground font-bold text-base">${formatCurrency(displayData.totalCargosArs)}</p>
                </div>
                <div className="border rounded bg-muted/10 border-border p-2">
                  <p className="text-muted-foreground mb-1">Total Cargos USD</p>
                  <p className="text-card-foreground font-bold text-base">${formatCurrency(displayData.totalCargosUsd)}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between border-b border-border pb-1 border-dashed">
                  <span className="text-muted-foreground">Sellado ({displayData.selladoPorcentaje}%)</span>
                  <span className="text-card-foreground">${formatCurrency(displayData.selladoMonto)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1 border-dashed">
                  <span className="text-muted-foreground">Alhajamiento</span>
                  <span className="text-card-foreground">${formatCurrency(displayData.alhajamiemtoMonto)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1 border-dashed">
                  <span className="text-muted-foreground">Planos</span>
                  <span className="text-card-foreground">${formatCurrency((displayData.planosUnidadMonto || 0) + (displayData.planosCocheraMonto || 0))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paso 7: Datos del Cliente */}
        {displayData.clienteInteresado && (
          <Card className="bg-card border-border flex flex-col h-full">
            <CardHeader className="bg-muted/30 border-b border-border py-3">
              <CardTitle className="text-base font-bold text-card-foreground">7. Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                    <span className="font-bold text-lg">{displayData.clienteInteresado.nombreApellido?.charAt(0) || "C"}</span>
                  </div>
                  <div>
                    <p className="text-card-foreground font-medium">{displayData.clienteInteresado.nombreApellido || "-"}</p>
                    <p className="text-xs text-muted-foreground">Cliente Interesado</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="bg-muted/10 p-2.5 rounded border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">DNI</p>
                    <p className="text-card-foreground font-mono text-sm">{displayData.clienteInteresado.dni || "-"}</p>
                  </div>
                  <div className="bg-muted/10 p-2.5 rounded border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Contacto</p>
                    <p className="text-card-foreground font-mono text-sm">{displayData.clienteInteresado.telefono || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Paso 6: Reglas de Financiación - Full Width usually better for scrolling tables/lists */}
      <Card className="bg-card border-border">
        <CardHeader className="bg-muted/30 border-b border-border py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold text-card-foreground">6. Reglas de Financiación</CardTitle>
            {(() => {
              const porcentaje = displayData.porcentajePagadoFechaPosesion || 0;
              const isGood = porcentaje >= 50;
              return (
                <Badge className={`${isGood ? "bg-green-900/50 text-green-400 border-green-800" : "bg-red-900/50 text-red-400 border-red-800"}`}>
                  {porcentaje}% a Posesión
                </Badge>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Columna A */}
            <div className="p-4">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                Parte F ({displayData.monedaA})
                <span className="text-card-foreground normal-case font-normal">${formatCurrency(totalReglasA)} total</span>
              </h4>

              <div className="space-y-2">
                {(displayData.reglasFinanciacionA || []).length > 0 ? (
                  (displayData.reglasFinanciacionA || []).map((regla, i) => (
                    <div key={i} className="bg-muted/10 border border-border rounded p-2 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-card-foreground block font-medium">{regla.numCuotas} x ${formatCurrency(regla.importeCuota)}</span>
                        <span className="text-muted-foreground text-[10px]">{regla.periodicidad}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-500 block font-bold">${formatCurrency(regla.saldoFinanciar)}</span>
                        <span className="text-muted-foreground text-[10px]">{regla.primerVencimiento}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">Sin reglas definidas.</p>
                )}
              </div>
            </div>

            {/* Columna B */}
            <div className="p-4">
              <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                Parte SB ({displayData.monedaB})
                <span className="text-card-foreground normal-case font-normal">${formatCurrency(totalReglasB)} total</span>
              </h4>

              <div className="space-y-2">
                {(displayData.reglasFinanciacionB || []).length > 0 ? (
                  (displayData.reglasFinanciacionB || []).map((regla, i) => (
                    <div key={i} className="bg-muted/10 border border-border rounded p-2 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-card-foreground block font-medium">{regla.numCuotas} x ${formatCurrency(regla.importeCuota)}</span>
                        <span className="text-muted-foreground text-[10px]">{regla.periodicidad}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-purple-500 block font-bold">${formatCurrency(regla.saldoFinanciar)}</span>
                        <span className="text-muted-foreground text-[10px]">{regla.primerVencimiento}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">Sin reglas definidas.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
