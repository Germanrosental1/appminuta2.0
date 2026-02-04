import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateStep } from "@/utils/validation";
import { Check, CreditCard } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Step4Pago: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const handleChange = (field: string, value: any) => {
    updateData({ [field]: value });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleBlur = () => {
    const validation = validateStep(3, data);
    if (!validation.valid) {
      setErrors(validation.errors);
    }
  };

  // Esta función ha sido eliminada ya que los valores no son editables

  // Calcular precio total de todas las unidades seleccionadas
  const calcularPrecioTotal = () => {
    let total = 0;

    // Sumar precios de todas las unidades en el nuevo modelo
    if (data.unidades && data.unidades.length > 0) {
      data.unidades.forEach(unidad => {
        total += unidad.precioNegociado || 0;
      });
      return total;
    }

    // Fallback al modelo antiguo si no hay unidades en el nuevo modelo
    // Precio de la unidad principal
    total = data.precioNegociado || 0;

    // Sumar precios de cocheras
    const cocheras = data.cocheras || [];
    if (cocheras.length > 0) {
      cocheras.forEach(cochera => {
        total += cochera.precioNegociado || 0;
      });
    }

    // Sumar precio de baulera si existe
    if (data.baulera) {
      total += data.baulera.precioNegociado || 0;
    }

    return total;
  };

  // Calcular valores de composición F/SB basados en el precio total
  const calcularComposicionAB = (precioTotal: number) => {
    let valorA = 0;
    let valorB = 0;

    if (data.modoA === "porcentaje") {
      // Si es por porcentaje, calcular según los porcentajes definidos
      valorA = (precioTotal * data.porcA) / 100;
      valorB = precioTotal - valorA;
    } else {
      // Si es por importe, usar el importe A definido
      valorA = data.impA;
      valorB = precioTotal - valorA;
    }

    // Importante: Tanto valorA como valorB están en USD en este punto

    // Convertir el valor A según su moneda (si es ARS, convertir desde USD)
    if ((!data.monedaA || data.monedaA === 'ARS') && data.tcValor > 0) {
      valorA = valorA * data.tcValor;
    }

    // Ajustar el valor B según la moneda seleccionada
    if (data.monedaB === "ARS" && data.tcValor > 0) {
      // Si la moneda B es ARS, convertir de USD a ARS usando el tipo de cambio
      valorB = valorB * data.tcValor;
    }
    // Si es USD o MIX, dejamos el valor B en USD

    return { valorA, valorB };
  };

  // Inicializar valores basados en el precio total y la composición A/B cuando el componente se monta
  useEffect(() => {
    // Siempre recalcular los valores basados en la composición actual
    const precioTotal = calcularPrecioTotal();
    const { valorA, valorB } = calcularComposicionAB(precioTotal);

    // Función auxiliar para calcular total a financiar SB según moneda
    const calcularTotalFinanciarSB = (valorSB: number, anticipoArs: number, anticipoUsd: number, tc: number, moneda: string) => {
      if (moneda === "ARS") {
        // Si SB está en ARS, convertir anticipos USD a ARS
        const anticipoUsdEnArs = anticipoUsd * tc;
        return Math.max(valorSB - anticipoArs - anticipoUsdEnArs, 0);
      } else {
        // Si SB está en USD, convertir anticipos ARS a USD
        const anticipoArsEnUsd = anticipoArs / tc;
        return Math.max(valorSB - anticipoUsd - anticipoArsEnUsd, 0);
      }
    };

    // Solo inicializar si no hay valores previos o si es la primera vez
    if (initialized) {
      // Recalculate if values changed (standard logic + IVA check)
      // data.montoIVA viene en USD desde Step3.5
      const tc = data.tcValor || 1;

      let montoIvaEnMonedaA = data.montoIVA || 0;

      // Si la moneda A es ARS, convertimos el IVA a ARS usando el TC actual
      if ((!data.monedaA || data.monedaA === 'ARS') && tc > 0) {
        montoIvaEnMonedaA = montoIvaEnMonedaA * tc;
      }

      const valorAConIVA = valorA + montoIvaEnMonedaA;

      if (data.valorArsConIVA !== valorAConIVA || data.valorUsdConIVA !== valorB) {
        // Si los valores han cambiado debido a cambios en la composición, actualizarlos
        updateData({
          valorArsConIVA: valorAConIVA,
          valorUsdConIVA: valorB,
          // Actualizar totales a financiar
          totalFinanciarArs: Math.max(valorAConIVA - (data.anticipoArsA || 0) - ((data.anticipoUsdA || 0) * tc), 0),
          totalFinanciarUsd: calcularTotalFinanciarSB(valorB, data.anticipoArsB || 0, data.anticipoUsdB || 0, tc, data.monedaB)
        });
      }
    } else {
      const tcValorDefault = 1100; // Valor por defecto si no hay uno configurado
      const tc = data.tcValor || tcValorDefault;

      // Preservar los anticipos existentes o inicializar a cero si no existen
      const anticipoArsA = data.anticipoArsA ?? 0;
      const anticipoUsdA = data.anticipoUsdA ?? 0;
      const anticipoArsB = data.anticipoArsB ?? 0;
      const anticipoUsdB = data.anticipoUsdB ?? 0;

      // Add IVA if applicable (only to Part F / Valor A)
      // data.montoIVA viene en USD desde Step3.5
      let montoIvaEnMonedaA = data.montoIVA || 0;

      // Si la moneda A es ARS, convertimos el IVA a ARS usando el TC actual
      if ((!data.monedaA || data.monedaA === 'ARS') && tc > 0) {
        montoIvaEnMonedaA = montoIvaEnMonedaA * tc;
      }

      const valorAConIVA = valorA + montoIvaEnMonedaA;

      updateData({
        valorArsConIVA: valorAConIVA,
        valorUsdConIVA: valorB,
        tcValor: tc,
        // Preservar los anticipos existentes
        anticipoArsA,
        anticipoUsdA,
        anticipoArsB,
        anticipoUsdB,
        // Inicializar totales a financiar considerando los anticipos y la moneda
        totalFinanciarArs: Math.max(valorAConIVA - anticipoArsA - (anticipoUsdA * tc), 0),
        totalFinanciarUsd: calcularTotalFinanciarSB(valorB, anticipoArsB, anticipoUsdB, tc, data.monedaB)
      });

      setInitialized(true);
    }
  }, [data.precioNegociado, data.cocheras, data.baulera, data.modoA, data.porcA, data.impA, data.monedaB, data.tcValor, data.unidades, initialized, data.montoIVA]);

  // Este efecto ya no es necesario ya que manejamos la conversión en calcularComposicionAB
  // y los valores no son editables

  // Calcular totales a financiar en tiempo real
  useEffect(() => {
    const tcValor = data.tcValor || 1;

    // Para la parte F:
    let totalArs = 0;
    if (!data.monedaA || data.monedaA === 'ARS') {
      // Si F está en ARS
      const anticipoUsdAEnArs = (data.anticipoUsdA || 0) * tcValor;
      totalArs = Math.max((data.valorArsConIVA || 0) - (data.anticipoArsA || 0) - anticipoUsdAEnArs, 0);
    } else {
      // Si F está en USD
      const anticipoArsAEnUsd = (data.anticipoArsA || 0) / tcValor;
      totalArs = Math.max((data.valorArsConIVA || 0) - (data.anticipoUsdA || 0) - anticipoArsAEnUsd, 0);
    }

    // Para la parte SB: depende de la moneda seleccionada
    let totalUsd = 0;
    if (data.monedaB === "ARS") {
      // Si SB está en ARS, trabajamos en ARS
      // - Restar anticipo en ARS directamente
      // - Convertir anticipo en USD a ARS y restarlo
      const anticipoUsdBEnArs = (data.anticipoUsdB || 0) * tcValor;
      totalUsd = Math.max((data.valorUsdConIVA || 0) - (data.anticipoArsB || 0) - anticipoUsdBEnArs, 0);
    } else {
      // Si SB está en USD (o MIX), trabajamos en USD
      // - Convertir anticipo en ARS a USD y restarlo
      // - Restar anticipo en USD directamente
      const anticipoArsBEnUsd = (data.anticipoArsB || 0) / tcValor;
      totalUsd = Math.max((data.valorUsdConIVA || 0) - (data.anticipoUsdB || 0) - anticipoArsBEnUsd, 0);
    }

    if (totalArs !== data.totalFinanciarArs || totalUsd !== data.totalFinanciarUsd) {
      updateData({
        totalFinanciarArs: totalArs,
        totalFinanciarUsd: totalUsd,
      });
    }
  }, [data.valorArsConIVA, data.valorUsdConIVA, data.anticipoArsA, data.anticipoUsdA, data.anticipoArsB, data.anticipoUsdB, data.tcValor, data.monedaB]);

  return (
    <div className="space-y-6">
      {/* Referencia al precio total */}
      <div className="rounded-lg bg-[#0f131a] border border-[#334366] p-4">
        <div className="flex items-center gap-2">

          <div className="w-full">
            {(() => {
              const precioBase = calcularPrecioTotal();
              // data.montoIVA ya viene en USD desde Step3.5
              const ivaUSD = (data.ivaProyecto === "no incluido" && data.montoIVA) ? data.montoIVA : 0;
              const tieneIVA = ivaUSD > 0;
              const precioFinal = precioBase + ivaUSD;

              return (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium text-white">Precio total (unidad + adicionales)</p>
                    {tieneIVA && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        CON IVA
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-bold text-blue-400">
                    USD {precioFinal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>

                  {tieneIVA && (
                    <div className="mt-1 text-sm text-slate-200 flex items-center gap-2">
                      <span>Incluye IVA ({data.porcentajeIVA}%): USD {ivaUSD.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-200 mt-2 pt-2 border-t border-[#334366]">
                    {data.unidades && data.unidades.length > 0 ? (
                      // Mostrar todas las unidades del nuevo modelo
                      <>
                        {data.unidades.map((unidad, index) => (
                          <p key={unidad.id || index}>
                            {unidad.tipo}: {unidad.descripcion} - ${(unidad.precioNegociado || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </p>
                        ))}
                      </>
                    ) : (
                      // Fallback al modelo antiguo
                      <>
                        <p>Unidad principal: ${(data.precioNegociado || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                        {(data.cocheras?.length || 0) > 0 && (
                          <p>Cocheras ({data.cocheras?.length || 0}): ${
                            (data.cocheras || []).reduce((sum, cochera) => sum + (cochera.precioNegociado || 0), 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                          }</p>
                        )}
                        {data.baulera && (
                          <p>Baulera: ${(data.baulera.precioNegociado || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                        )}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Tipo de pago */}
      <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4 space-y-4">
        <h3 className="font-semibold text-white">Tipo de pago</h3>

        <RadioGroup
          value={data.tipoPago}
          onValueChange={(val: "contado" | "financiado") => handleChange("tipoPago", val)}
          className="flex flex-col space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="contado" id="tipo-contado" className="border-white text-white" />
            <Label htmlFor="tipo-contado" className="flex items-center cursor-pointer text-white">
              <Check className="w-4 h-4 mr-2" />
              Pago de contado
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="financiado" id="tipo-financiado" className="border-white text-white" />
            <Label htmlFor="tipo-financiado" className="flex items-center cursor-pointer text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Pago financiado
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Tipo de cambio */}
      <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4 space-y-4">
        <h3 className="font-semibold text-white">Tipo de cambio</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tcFuente" className="text-white">
              Fuente <span className="text-red-400">*</span>
            </Label>
            <Select
              value={data.tcFuente}
              onValueChange={(val: "MEP" | "BNA" | "Acordado" | "Otro") => handleChange("tcFuente", val)}
            >
              <SelectTrigger id="tcFuente" className="bg-[#0f131a] border-[#334366] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                <SelectItem value="MEP">MEP</SelectItem>
                <SelectItem value="BNA">BNA</SelectItem>
                <SelectItem value="Acordado">Acordado</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tcValor" className="text-white">
              Valor ($/USD) <span className="text-red-400">*</span>
            </Label>
            <CurrencyInput
              id="tcValor"
              value={data.tcValor}
              onChange={(value) => handleChange("tcValor", value)}
              onBlur={handleBlur}
              error={!!errors.tcValor}
              decimals={0}
              className="bg-[#0f131a] border-[#334366] text-white"
            />
            {errors.tcValor && <p className="text-sm text-red-400">{errors.tcValor}</p>}
          </div>
        </div>
      </div>

      {/* Valores a financiar (IVA incluido) */}
      <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-white">Valores a financiar (IVA incluido)</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valorArsConIVA" className="flex items-center gap-2 text-white">
              Valor F <span className="text-slate-200">({data.monedaA || "ARS"})</span>
            </Label>
            <CurrencyInput
              id="valorArsConIVA"
              value={data.valorArsConIVA}
              onChange={() => { }}
              disabled={true}
              prefix="$"
              className="bg-[#0f131a] border-[#334366] text-white opacity-100 cursor-default"
            />
            <div className="flex justify-between text-xs text-slate-200">
              <span>IVA incluido</span>
              <span className="font-medium text-white">{data.modoA === "porcentaje" ? `${data.porcA}% ` : ""}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorUsdConIVA" className="flex items-center gap-2 text-white">
              Valor SB <span className="text-slate-200">({data.monedaB})</span>
            </Label>
            <CurrencyInput
              id="valorUsdConIVA"
              value={data.valorUsdConIVA}
              onChange={() => { }}
              disabled={true}
              prefix="$"
              className="bg-[#0f131a] border-[#334366] text-white opacity-100 cursor-default"
            />
            <div className="flex justify-between text-xs text-slate-200">
              <span>IVA incluido</span>
              <span className="font-medium text-white">{data.modoA === "porcentaje" ? `${100 - data.porcA}% ` : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anticipo al boleto - Solo visible si es financiado */}
      {data.tipoPago === "financiado" && (
        <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4 space-y-4">
          <h3 className="font-semibold text-white">Anticipo al boleto</h3>

          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2"></th>
                  <th className="text-center p-2 font-medium text-slate-200">Anticipo F</th>
                  <th className="text-center p-2 font-medium text-slate-200">Anticipo SB</th>
                </tr>
              </thead>
              <tbody>
                {/* Fila para ARS */}
                <tr>
                  <td className="p-2 font-medium text-slate-200">ARS</td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <CurrencyInput
                        id="anticipoArsA"
                        value={data.anticipoArsA}
                        onChange={(value) => handleChange("anticipoArsA", value)}
                        onBlur={handleBlur}
                        error={!!errors.anticipoArsA}
                        prefix="$"
                        className="bg-[#0f131a] border-[#334366] text-white"
                      />
                      {errors.anticipoArsA && <p className="text-sm text-red-400">{errors.anticipoArsA}</p>}
                    </div>

                  </td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <CurrencyInput
                        id="anticipoArsB"
                        value={data.anticipoArsB}
                        onChange={(value) => handleChange("anticipoArsB", value)}
                        onBlur={handleBlur}
                        error={!!errors.anticipoArsB}
                        prefix="$"
                        className="bg-[#0f131a] border-[#334366] text-white"
                      />
                      {errors.anticipoArsB && <p className="text-sm text-red-400">{errors.anticipoArsB}</p>}
                    </div>

                  </td>
                </tr>

                {/* Fila para USD */}
                <tr>
                  <td className="p-2 font-medium text-slate-200">USD</td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <CurrencyInput
                        id="anticipoUsdA"
                        value={data.anticipoUsdA}
                        onChange={(value) => handleChange("anticipoUsdA", value)}
                        onBlur={handleBlur}
                        error={!!errors.anticipoUsdA}
                        prefix="$"
                        suffix="USD"
                        className="bg-[#0f131a] border-[#334366] text-white"
                      />
                      {errors.anticipoUsdA && <p className="text-sm text-red-400">{errors.anticipoUsdA}</p>}
                    </div>

                  </td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <CurrencyInput
                        id="anticipoUsdB"
                        value={data.anticipoUsdB}
                        onChange={(value) => handleChange("anticipoUsdB", value)}
                        onBlur={handleBlur}
                        error={!!errors.anticipoUsdB}
                        prefix="$"
                        suffix="USD"
                        className="bg-[#0f131a] border-[#334366] text-white"
                      />
                      {errors.anticipoUsdB && <p className="text-sm text-red-400">{errors.anticipoUsdB}</p>}
                    </div>

                  </td>
                </tr>
              </tbody >
            </table >
          </div >
        </div >
      )}

      {/* Totales a financiar - Solo visible si es financiado */}
      {
        data.tipoPago === "financiado" && (
          <div className="rounded-lg bg-[#0f131a] border border-[#334366] p-4 space-y-3">
            <h3 className="font-semibold text-white">Totales a financiar</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-200">A financiar F ({data.monedaA || "ARS"})</p>
                <p className="text-2xl font-bold text-white">
                  ${data.totalFinanciarArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-slate-200">A financiar SB ({data.monedaB})</p>
                <p className="text-2xl font-bold text-white">
                  ${data.totalFinanciarUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* Fechas */}
      <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4 space-y-4">
        <h3 className="font-semibold text-white">Fechas</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fechaBaseCAC" className="text-white">
              Base CAC (mes/año) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="fechaBaseCAC"
              type="month"
              value={data.fechaBaseCAC}
              onChange={(e) => handleChange("fechaBaseCAC", e.target.value)}
              onBlur={handleBlur}
              placeholder="YYYY-MM"
              className={`bg-[#0f131a] border-[#334366] text-white hover:bg-[#1a2233] h-12 [color-scheme:dark] ${errors.fechaBaseCAC ? "border-red-400" : ""}`}
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            {errors.fechaBaseCAC && <p className="text-sm text-red-400">{errors.fechaBaseCAC}</p>}
            <p className="text-xs text-slate-200">Mes y año de referencia para CAC</p>
          </div>
        </div>
      </div>

      {/* Resumen compacto - Solo visible si es financiado */}
      {
        data.tipoPago === "financiado" && (
          <div className="rounded-lg bg-[#1a2233] p-4 border border-[#334366]">
            <p className="text-sm font-medium mb-2 text-white">Resumen</p>
            <p className="text-sm text-slate-200">
              <span className="font-medium text-white">Anticipo F:</span> ARS ${(data.anticipoArsA || 0).toLocaleString("es-AR")} / USD ${(data.anticipoUsdA || 0).toLocaleString("es-AR")} <br />
              <span className="font-medium text-white">Anticipo SB:</span> ARS ${(data.anticipoArsB || 0).toLocaleString("es-AR")} / USD ${(data.anticipoUsdB || 0).toLocaleString("es-AR")} <br />
              <span className="font-medium text-white">Saldo:</span> F ({data.monedaA || "ARS"}) ${data.totalFinanciarArs.toLocaleString("es-AR")} / SB ({data.monedaB}) ${data.totalFinanciarUsd.toLocaleString("es-AR")}
            </p>
          </div>
        )
      }

      {/* Resumen de pago de contado - Solo visible si es contado */}
      {
        data.tipoPago === "contado" && (() => {
          const precioBase = calcularPrecioTotal();
          const ivaUSD = (data.ivaProyecto === "no incluido" && data.montoIVA) ? data.montoIVA : 0;
          const precioConIVA = precioBase + ivaUSD;
          const tieneIVA = ivaUSD > 0;

          return (
            <div className="rounded-lg bg-emerald-900/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">Pago de contado</p>
                {tieneIVA && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    CON IVA
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                USD {precioConIVA.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              {tieneIVA && (
                <p className="text-sm text-emerald-400/80 mt-1">
                  Incluye IVA ({data.porcentajeIVA}%): USD {ivaUSD.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              )}
              <p className="text-sm text-emerald-400/80 mt-1">
                No se requieren anticipos ni financiamiento adicional.
              </p>
            </div>
          );
        })()
      }

      {/* Tip */}
      <div className="rounded-lg bg-blue-900/10 border border-blue-900/30 p-4 text-sm text-slate-300">
        <div className="flex gap-2 items-start">
          <span className="text-blue-400 mt-0.5">💡</span>
          <div>
            <p className="font-medium mb-1 text-white">Tip:</p>
            <p>
              Los valores a financiar se inicializan automáticamente con el precio total, que incluye todas las unidades seleccionadas en el paso 1. El cálculo de totales a financiar descuenta los anticipos y se usará en la minuta final.
            </p>
            <p className="mt-2">
              Puedes modificar manualmente los valores o usar el botón "Restablecer" para volver al precio total original.
            </p>
          </div>
        </div>
      </div>
    </div >
  );
};
