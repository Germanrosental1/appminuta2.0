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

      {/* Paso 1: Proyecto & Unidades */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">1. Proyecto & Unidades</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Mostrar todas las unidades seleccionadas */}
            {displayData.unidades && displayData.unidades.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Unidades seleccionadas ({displayData.unidades.length}):
                </p>
                {displayData.unidades.map((unidad, index) => (
                  <div key={unidad.id || index} className="border rounded-md p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{unidad.tipo}</Badge>
                      <span className="font-medium">{unidad.descripcion}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Proyecto: </span>
                        <span className="font-medium">{unidad.proyecto || displayData.proyecto}</span>
                      </div>
                      {unidad.etapa && (
                        <div>
                          <span className="text-muted-foreground">Etapa: </span>
                          <span className="font-medium">{unidad.etapa}</span>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Fallback para compatibilidad con datos antiguos
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proyecto:</p>
                  <p className="font-medium">{displayData.proyecto || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidad:</p>
                  <p className="font-medium">{displayData.unidadDescripcion || displayData.unidad || "-"}</p>
                </div>
              </div>
            )}

            {/* Fecha de posesión siempre visible */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Fecha de Posesión:</p>
              <p className="font-medium">{formatDate(displayData.fechaPosesion)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 2: Estructura Comercial */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">2. Acuerdo Comercial</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Precio total de todas las unidades */}
            <div className="rounded-lg bg-primary/5 p-3">
              <p className="text-sm text-muted-foreground">Precio Total Negociado (todas las unidades):</p>
              <p className="text-xl font-bold text-primary">${formatCurrency(precioTotal)}</p>
              {displayData.unidades && displayData.unidades.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Suma de {displayData.unidades.length} unidades seleccionadas
                </p>
              )}
            </div>

            {/* Desglose por unidades */}
            {displayData.unidades && displayData.unidades.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Desglose por unidad:</h4>
                {displayData.unidades.map((unidad, index) => {
                  const m2 = unidad.m2 || 0;
                  const precioM2Lista = m2 > 0 ? (unidad.precioLista / m2) : 0;
                  const precioM2Negociado = m2 > 0 ? (unidad.precioNegociado / m2) : 0;

                  return (
                    <div key={index} className="bg-muted/30 p-3 rounded-md text-sm space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{unidad.tipo}</Badge>
                        <span className="font-medium truncate">{unidad.descripcion}</span>
                        {m2 > 0 && <span className="text-xs text-muted-foreground ml-auto">({m2} m²)</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold">Precio Lista (USD):</span>
                            <span>${formatCurrency(unidad.precioLista)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="font-bold">USD/m² Lista:</span>
                            <span className="text-muted-foreground">{m2 > 0 ? `$${formatCurrency(precioM2Lista)}` : "-"}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold">Precio Negociado (USD):</span>
                            <span className="text-primary">${formatCurrency(unidad.precioNegociado)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="font-bold">USD/m² Negociado:</span>
                            <span className="text-primary">{m2 > 0 ? `$${formatCurrency(precioM2Negociado)}` : "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Descuento por unidad */}
                      {unidad.precioLista > 0 && (
                        <div className="mt-3 text-right">
                          <span className="text-sm text-green-600">
                            <span className="font-bold">Descuento:</span> {Math.max(0, ((unidad.precioLista - unidad.precioNegociado) / unidad.precioLista) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Detalle por tipo si hay modelo antiguo con cocheras/baulera separadas */}
            {(cocherasCant > 0 || displayData.baulera) && !displayData.unidades?.length && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Unidad Principal:</p>
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paso 3: Composición F/SB */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">3. Estructura de pago</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {/* Modo de Composición - Full Width */}
            <div className="border-b pb-4">
              <p className="text-sm text-muted-foreground">Composición por:</p>
              <p className="font-medium text-lg">{displayData.modoA === "porcentaje" ? "Porcentaje" : "Importe Fijo"}</p>
            </div>

            {/* Columnas F y SB */}
            <div className="grid grid-cols-2 gap-8">
              {/* Columna Parte F */}
              <div className="space-y-4">
                <h4 className="font-semibold text-primary border-b border-primary/20 pb-2">Parte F</h4>
                <div>
                  <p className="text-sm text-muted-foreground">Porcentaje:</p>
                  <p className="font-medium text-lg">{displayData.porcA || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor F:</p>
                  <p className="font-medium text-lg">${formatCurrency(
                    displayData.modoA === "porcentaje"
                      ? (precioTotal * (displayData.porcA || 0)) / 100
                      : displayData.impA || displayData.valorArsConIVA
                  )}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moneda:</p>
                  <Badge variant={displayData.monedaA === "USD" ? "secondary" : "default"}>{displayData.monedaA || "-"}</Badge>
                </div>
              </div>

              {/* Columna Parte SB */}
              <div className="space-y-4">
                <h4 className="font-semibold text-purple-600 border-b border-purple-200 pb-2">Parte SB</h4>
                <div>
                  <p className="text-sm text-muted-foreground">Porcentaje:</p>
                  <p className="font-medium text-lg">{porcB}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor SB:</p>
                  <p className="font-medium text-lg">${formatCurrency(
                    displayData.modoA === "porcentaje"
                      ? (precioTotal * porcB) / 100
                      : (precioTotal - (displayData.impA || 0)) || displayData.valorUsdConIVA
                  )}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moneda:</p>
                  <Badge variant={displayData.monedaB === "USD" ? "secondary" : "default"}>{displayData.monedaB || "-"}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 4: Pago */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-lg">4. Forma de pago</CardTitle>
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
              <p className="text-sm text-muted-foreground">A financiar F ({displayData.monedaA || "ARS"}):</p>
              <p className="font-medium">${formatCurrency(displayData.totalFinanciarArs)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A financiar SB ({displayData.monedaB || "USD"}):</p>
              <p className="font-medium">${formatCurrency(displayData.totalFinanciarUsd)}</p>
            </div>
            {displayData.fechaFirmaBoleto && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha Firma Boleto:</p>
                <p className="font-medium">{formatDate(displayData.fechaFirmaBoleto)}</p>
              </div>
            )}
            {displayData.fechaBaseCAC && (
              <div>
                <p className="text-sm text-muted-foreground">Base CAC:</p>
                <p className="font-medium">{formatDate(displayData.fechaBaseCAC)}</p>
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
              <p className="text-sm font-bold">Total Cargos ARS:</p>
              <p className="font-medium">${formatCurrency(displayData.totalCargosArs)}</p>
            </div>
            <div>
              <p className="text-sm font-bold">Total Cargos USD:</p>
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
                    <p className="text-sm font-bold">Total financiado F:</p>
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
                    <p className="text-sm font-bold">Total financiado SB:</p>
                    <p className="font-medium">${formatCurrency(totalReglasB)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay reglas de financiación para la Parte SB</p>
              )}
            </div>

            {(() => {
              const porcentaje = displayData.porcentajePagadoFechaPosesion || 0;
              const isGood = porcentaje >= 50;
              return (
                <div className={`mt-4 p-3 rounded-md ${isGood ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <p className="text-sm font-medium">% financiado a fecha Posesión:</p>
                  <p className="text-xl font-bold">{porcentaje}%</p>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Paso 7: Datos del Cliente */}
      {displayData.clienteInteresado && (
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-lg">7. Datos del Cliente Interesado</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">DNI:</p>
                <p className="font-medium">{displayData.clienteInteresado.dni || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre y Apellido:</p>
                <p className="font-medium">{displayData.clienteInteresado.nombreApellido || "-"}</p>
              </div>
              {displayData.clienteInteresado.telefono && (
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono:</p>
                  <p className="font-medium">{displayData.clienteInteresado.telefono}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
