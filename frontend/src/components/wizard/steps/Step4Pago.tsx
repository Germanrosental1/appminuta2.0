import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateStep } from "@/utils/validation";
import { Button } from "@/components/ui/button";
import { Pencil, DollarSign, Check, CreditCard } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

export const Step4Pago: React.FC = () => {
  const { data, setData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const handleChange = (field: string, value: any) => {
    setData({ [field]: value });

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

    // Convertir el valor A a ARS (siempre es en ARS)
    if (data.tcValor > 0) {
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

    // Solo inicializar si no hay valores previos o si es la primera vez
    if (!initialized) {
      const tcValorDefault = 1100; // Valor por defecto si no hay uno configurado

      // Preservar los anticipos existentes o inicializar a cero si no existen
      const anticipoArsA = data.anticipoArsA ?? 0;
      const anticipoUsdA = data.anticipoUsdA ?? 0;
      const anticipoArsB = data.anticipoArsB ?? 0;
      const anticipoUsdB = data.anticipoUsdB ?? 0;

      console.log("Inicializando valores en Step4Pago:");
      console.log("Anticipos ARS A:", anticipoArsA);
      console.log("Anticipos USD A:", anticipoUsdA);
      console.log("Anticipos ARS B:", anticipoArsB);
      console.log("Anticipos USD B:", anticipoUsdB);

      setData({
        valorArsConIVA: valorA,
        valorUsdConIVA: valorB,
        tcValor: data.tcValor || tcValorDefault,
        // Preservar los anticipos existentes
        anticipoArsA,
        anticipoUsdA,
        anticipoArsB,
        anticipoUsdB,
        // Inicializar totales a financiar considerando los anticipos
        totalFinanciarArs: Math.max(valorA - anticipoArsA - (anticipoUsdA * (data.tcValor || tcValorDefault)), 0),
        totalFinanciarUsd: Math.max(valorB - anticipoUsdB - (anticipoArsB / (data.tcValor || tcValorDefault)), 0)
      });

      setInitialized(true);
    } else if (data.valorArsConIVA !== valorA || data.valorUsdConIVA !== valorB) {
      // Si los valores han cambiado debido a cambios en la composición, actualizarlos
      setData({
        valorArsConIVA: valorA,
        valorUsdConIVA: valorB,
        // Actualizar totales a financiar
        totalFinanciarArs: Math.max(valorA - (data.anticipoArsA || 0) - ((data.anticipoUsdA || 0) * (data.tcValor || 1)), 0),
        totalFinanciarUsd: Math.max(valorB - (data.anticipoUsdB || 0) - ((data.anticipoArsB || 0) / (data.tcValor || 1)), 0)
      });
    }
  }, [data.precioNegociado, data.cocheras, data.baulera, data.modoA, data.porcA, data.impA, data.monedaB, data.tcValor, data.unidades, initialized]);

  // Este efecto ya no es necesario ya que manejamos la conversión en calcularComposicionAB
  // y los valores no son editables

  // Calcular totales a financiar en tiempo real
  useEffect(() => {
    // Convertir anticipos en USD a ARS para la parte A
    const anticipoUsdAEnArs = (data.anticipoUsdA || 0) * (data.tcValor || 1);
    // Convertir anticipos en ARS a USD para la parte B
    const anticipoArsBEnUsd = (data.anticipoArsB || 0) / (data.tcValor || 1);

    const totalArs = Math.max(data.valorArsConIVA - (data.anticipoArsA || 0) - anticipoUsdAEnArs, 0);
    const totalUsd = Math.max(data.valorUsdConIVA - (data.anticipoUsdB || 0) - anticipoArsBEnUsd, 0);

    if (totalArs !== data.totalFinanciarArs || totalUsd !== data.totalFinanciarUsd) {
      setData({
        totalFinanciarArs: totalArs,
        totalFinanciarUsd: totalUsd,
      });
    }
  }, [data.valorArsConIVA, data.valorUsdConIVA, data.anticipoArsA, data.anticipoUsdA, data.anticipoArsB, data.anticipoUsdB, data.tcValor]);

  return (
    <div className="space-y-6">
      {/* Referencia al precio total */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Precio total (unidad + adicionales)</p>
            <p className="text-2xl font-bold text-primary">
              ${calcularPrecioTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
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
          </div>
        </div>
      </div>
      {/* Tipo de pago */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Tipo de pago</h3>

        <RadioGroup
          value={data.tipoPago}
          onValueChange={(val: "contado" | "financiado") => handleChange("tipoPago", val)}
          className="flex flex-col space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="contado" id="tipo-contado" />
            <Label htmlFor="tipo-contado" className="flex items-center cursor-pointer">
              <Check className="w-4 h-4 mr-2" />
              Pago de contado
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="financiado" id="tipo-financiado" />
            <Label htmlFor="tipo-financiado" className="flex items-center cursor-pointer">
              <CreditCard className="w-4 h-4 mr-2" />
              Pago financiado
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Tipo de cambio */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Tipo de cambio</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tcFuente">
              Fuente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.tcFuente}
              onValueChange={(val: "MEP" | "BNA" | "Acordado" | "Otro") => handleChange("tcFuente", val)}
            >
              <SelectTrigger id="tcFuente">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEP">MEP</SelectItem>
                <SelectItem value="BNA">BNA</SelectItem>
                <SelectItem value="Acordado">Acordado</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tcValor">
              Valor ($/USD) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tcValor"
              type="number"
              min="0"
              step="0.01"
              value={data.tcValor || ""}
              onChange={(e) => handleChange("tcValor", Number.parseFloat(e.target.value) || 0)}
              onBlur={handleBlur}
              className={errors.tcValor ? "border-destructive" : ""}
              placeholder="0.00"
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            {errors.tcValor && <p className="text-sm text-destructive">{errors.tcValor}</p>}
          </div>
        </div>
      </div>

      {/* Valores a financiar (IVA incluido) */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Valores a financiar (IVA incluido)</h3>
          <p className="text-xs text-muted-foreground">Basado en el precio total: ${calcularPrecioTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valorArsConIVA" className="flex items-center gap-2">
              Valor F <span className="text-muted-foreground">(ARS)</span>
            </Label>
            <Input
              id="valorArsConIVA"
              type="number"
              min="0"
              step="0.01"
              value={data.valorArsConIVA || ""}
              disabled={true}
              className="opacity-100 cursor-default"
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>IVA incluido</span>
              <span className="font-medium">{data.modoA === "porcentaje" ? `${data.porcA}%` : ""}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorUsdConIVA" className="flex items-center gap-2">
              Valor SB <span className="text-muted-foreground">({data.monedaB})</span>
            </Label>
            <Input
              id="valorUsdConIVA"
              type="number"
              min="0"
              step="0.01"
              value={data.valorUsdConIVA || ""}
              disabled={true}
              className="opacity-100 cursor-default"
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>IVA incluido</span>
              <span className="font-medium">{data.modoA === "porcentaje" ? `${100 - data.porcA}%` : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anticipo al boleto - Solo visible si es financiado */}
      {data.tipoPago === "financiado" && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Anticipo al boleto</h3>

          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2"></th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Anticipo F</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Anticipo SB</th>
                </tr>
              </thead>
              <tbody>
                {/* Fila para ARS */}
                <tr>
                  <td className="p-2 font-medium text-muted-foreground">ARS</td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <Input
                        id="anticipoArsA"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.anticipoArsA || ""}
                        onChange={(e) => handleChange("anticipoArsA", parseFloat(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className={errors.anticipoArsA ? "border-destructive" : ""}
                        placeholder="0.00"
                        onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
                      />
                      {errors.anticipoArsA && <p className="text-sm text-destructive">{errors.anticipoArsA}</p>}
                      {data.anticipoArsA > 0 && data.tcValor > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${(data.anticipoArsA / data.tcValor).toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <Input
                        id="anticipoArsB"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.anticipoArsB || ""}
                        onChange={(e) => handleChange("anticipoArsB", parseFloat(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className={errors.anticipoArsB ? "border-destructive" : ""}
                        placeholder="0.00"
                        onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
                      />
                      {errors.anticipoArsB && <p className="text-sm text-destructive">{errors.anticipoArsB}</p>}
                      {data.anticipoArsB > 0 && data.tcValor > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${(data.anticipoArsB / data.tcValor).toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD
                        </p>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Fila para USD */}
                <tr>
                  <td className="p-2 font-medium text-muted-foreground">USD</td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <Input
                        id="anticipoUsdA"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.anticipoUsdA || ""}
                        onChange={(e) => handleChange("anticipoUsdA", parseFloat(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className={errors.anticipoUsdA ? "border-destructive" : ""}
                        placeholder="0.00"
                        onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
                      />
                      {errors.anticipoUsdA && <p className="text-sm text-destructive">{errors.anticipoUsdA}</p>}
                      {data.anticipoUsdA > 0 && data.tcValor > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${(data.anticipoUsdA * data.tcValor).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <Input
                        id="anticipoUsdB"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.anticipoUsdB || ""}
                        onChange={(e) => handleChange("anticipoUsdB", parseFloat(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className={errors.anticipoUsdB ? "border-destructive" : ""}
                        placeholder="0.00"
                        onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
                      />
                      {errors.anticipoUsdB && <p className="text-sm text-destructive">{errors.anticipoUsdB}</p>}
                      {data.anticipoUsdB > 0 && data.tcValor > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${(data.anticipoUsdB * data.tcValor).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totales a financiar - Solo visible si es financiado */}
      {data.tipoPago === "financiado" && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Totales a financiar</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total F (ARS)</p>
              <p className="text-2xl font-bold text-primary">
                ${data.totalFinanciarArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total SB ({data.monedaB})</p>
              <p className="text-2xl font-bold text-primary">
                ${data.totalFinanciarUsd.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fechas */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Fechas</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fechaFirmaBoleto">
              Fecha Firma Boleto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fechaFirmaBoleto"
              type="date"
              value={data.fechaFirmaBoleto}
              onChange={(e) => handleChange("fechaFirmaBoleto", e.target.value)}
              onBlur={handleBlur}
              className={errors.fechaFirmaBoleto ? "border-destructive" : ""}
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            {errors.fechaFirmaBoleto && <p className="text-sm text-destructive">{errors.fechaFirmaBoleto}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaBaseCAC">Base CAC (mes/año)</Label>
            <Input
              id="fechaBaseCAC"
              type="month"
              value={data.fechaBaseCAC}
              onChange={(e) => handleChange("fechaBaseCAC", e.target.value)}
              placeholder="YYYY-MM"
              onWheel={(e) => e.currentTarget.blur()} // Evitar cambios con la rueda del mouse
            />
            <p className="text-xs text-muted-foreground">Mes y año de referencia para CAC</p>
          </div>
        </div>
      </div>

      {/* Resumen compacto - Solo visible si es financiado */}
      {data.tipoPago === "financiado" && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium mb-2">Resumen</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Anticipo F:</span> ARS ${(data.anticipoArsA || 0).toLocaleString("es-AR")} / USD ${(data.anticipoUsdA || 0).toLocaleString("es-AR")} <br />
            <span className="font-medium">Anticipo SB:</span> ARS ${(data.anticipoArsB || 0).toLocaleString("es-AR")} / USD ${(data.anticipoUsdB || 0).toLocaleString("es-AR")} <br />
            <span className="font-medium">Saldo:</span> F (ARS) ${data.totalFinanciarArs.toLocaleString("es-AR")} / SB ({data.monedaB}) ${data.totalFinanciarUsd.toLocaleString("es-AR")}
          </p>
        </div>
      )}

      {/* Resumen de pago de contado - Solo visible si es contado */}
      {data.tipoPago === "contado" && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-success" />
            <p className="text-sm font-medium">Pago de contado</p>
          </div>
          <p className="text-2xl font-bold text-success">
            ${calcularPrecioTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            No se requieren anticipos ni financiamiento adicional.
          </p>
        </div>
      )}

      {/* Tip */}
      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>
          Los valores a financiar se inicializan automáticamente con el precio total, que incluye todas las unidades seleccionadas en el paso 1. El cálculo de totales a financiar descuenta los anticipos y se usará en la minuta final.
        </p>
        <p className="mt-2">
          Puedes modificar manualmente los valores o usar el botón "Restablecer" para volver al precio total original.
        </p>
      </div>
    </div>
  );
};
