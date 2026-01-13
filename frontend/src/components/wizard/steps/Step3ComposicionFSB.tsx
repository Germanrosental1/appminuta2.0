import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateStep } from "@/utils/validation";
import { DollarSign } from "lucide-react";

export const Step3ComposicionFSB: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const precioTotal = calcularPrecioTotal();
  const porcB = 100 - data.porcA;
  const impB = precioTotal - data.impA;

  // Asegurar que la moneda A siempre sea ARS (ELIMINADO para permitir selección)
  // useEffect(() => {
  //   if (data.monedaA !== "ARS") {
  //     updateData({ monedaA: "ARS" });
  //   }
  // }, []);

  useEffect(() => {
    // Validate when values change
    const validation = validateStep(2, data);
    if (validation.valid) {
      setErrors({});
    } else {
      setErrors(validation.errors);
    }
  }, [data.modoA, data.porcA, data.impA, data.precioNegociado, data.cocheras, data.baulera, data.unidades]);

  const handleModoChange = (modo: "porcentaje" | "importe") => {
    updateData({ modoA: modo });
  };

  const handlePorcAChange = (value: string) => {
    // Permitir campo vacío (para poder borrar y escribir)
    if (value === '') {
      updateData({ porcA: 0 });
      return;
    }

    const num = Number.parseFloat(value);
    // Solo validar si es un número válido
    if (!Number.isNaN(num)) {
      // pero limitar al guardar
      if (num >= 0 && num <= 100) {
        updateData({ porcA: num });
      }
    }
  };

  const handleImpAChange = (value: string) => {
    const val = Number.parseFloat(value.replaceAll(/[^0-9.-]+/g, ""));
    if (Number.isNaN(val)) {
      if (value.trim() === "") {
        updateData({ impA: 0 });
      }
      return;
    }
    if (val >= 0 && val <= precioTotal) {
      updateData({ impA: val });
    }
  };

  return (
    <div className="space-y-6">
      {/* Referencia al precio total */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
        <div className="flex items-center gap-2">

          <div>
            <p className="text-sm font-medium">Precio total (unidad + adicionales)</p>
            <p className="text-2xl font-bold text-primary">
              USD {precioTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
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


      {/* Selector de Modo de Composición */}
      <div className="rounded-lg border border-border p-4">
        <Label className="text-sm font-medium mb-3 block">Composición por:</Label>
        <RadioGroup
          value={data.modoA}
          onValueChange={(val: "porcentaje" | "importe") => handleModoChange(val)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="porcentaje" id="modo-porcentaje" />
            <Label htmlFor="modo-porcentaje" className="cursor-pointer">Porcentaje</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="importe" id="modo-importe" />
            <Label htmlFor="modo-importe" className="cursor-pointer">Importe Fijo</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Tabla unificada de composición */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-4 text-left font-medium text-sm w-1/4">Concepto</th>
              <th className="p-4 text-center font-medium text-sm w-1/4">
                {data.modoA === "porcentaje" ? "Porcentaje" : "Importe"}
              </th>
              <th className="p-4 text-center font-medium text-sm w-1/4">Moneda</th>
              <th className="p-4 text-right font-medium text-sm w-1/4">Monto</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila Parte F */}
            <tr className="border-b border-border">
              <td className="p-4 font-medium text-blue-600">
                Total a Pagar F
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center">
                  {data.modoA === "porcentaje" ? (
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={data.porcA === 0 ? '' : data.porcA}
                        onChange={(e) => handlePorcAChange(e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '') updateData({ porcA: 0 });
                        }}
                        className={`text-center pr-6 h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.porcA ? "border-destructive" : ""}`}
                        placeholder="0"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  ) : (
                    <CurrencyInput
                      value={data.impA}
                      onChange={(val) => updateData({ impA: val })}
                      prefix="$"
                      suffix="USD"
                      className="w-40"
                    />
                  )}
                </div>
              </td>
              <td className="p-4">
                <div className="flex justify-center">
                  <Select
                    value={data.monedaA || "ARS"}
                    onValueChange={(val: "USD" | "ARS") => updateData({ monedaA: val })}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </td>
              <td className="p-4 text-right font-bold text-blue-600">
                {data.modoA === "porcentaje"
                  ? ((precioTotal * data.porcA) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : (data.impA || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                } USD
              </td>
            </tr>

            {/* Fila Parte SB */}
            <tr>
              <td className="p-4 font-medium text-purple-600">
                Total a Pagar SB
              </td>
              <td className="p-4 text-center text-sm">
                {data.modoA === "porcentaje"
                  ? `${Number.isInteger(porcB) ? porcB.toFixed(0) : porcB.toFixed(2)}%`
                  : `${impB.toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD`
                }
              </td>
              <td className="p-4">
                <div className="flex justify-center">
                  <Select
                    value={data.monedaB || "ARS"}
                    onValueChange={(val: "USD" | "ARS") => updateData({ monedaB: val })}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </td>
              <td className="p-4 text-right font-bold text-purple-600">
                {data.modoA === "porcentaje"
                  ? ((precioTotal * porcB) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : impB.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                } USD
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>
          {data.modoA === "porcentaje"
            ? "Defina el porcentaje para la parte F y seleccione la moneda. La parte SB se calculará automáticamente."
            : "Ingrese el importe fijo para la parte F. La parte SB se calculará automáticamente como la diferencia con el precio total."
          }
        </p>
      </div>
    </div>
  );
};
