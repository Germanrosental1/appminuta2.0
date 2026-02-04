import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateStep } from "@/utils/validation";

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

  return (
    <div className="space-y-6">
      {/* Referencia al precio total */}
      {/* Referencia al precio total */}
      <div className="rounded-lg bg-[#0f131a] border border-[#334366] p-4">
        <div className="flex items-center gap-2">

          <div>
            <p className="text-sm font-medium text-white">Precio total (unidad + adicionales)</p>
            <p className="text-2xl font-bold text-blue-400">
              USD {precioTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <div className="text-xs text-[#92a4c8] mt-1 space-y-1">
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
      <div className="rounded-lg border border-[#334366] p-4 bg-[#1a2233]">
        <Label className="text-sm font-medium mb-3 block text-white">Composición por:</Label>
        <RadioGroup
          value={data.modoA}
          onValueChange={(val: "porcentaje" | "importe") => handleModoChange(val)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="porcentaje" id="modo-porcentaje" className="border-white text-white" />
            <Label htmlFor="modo-porcentaje" className="cursor-pointer text-white">Porcentaje</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="importe" id="modo-importe" className="border-white text-white" />
            <Label htmlFor="modo-importe" className="cursor-pointer text-white">Importe Fijo</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Tabla unificada de composición */}
      <div className="rounded-lg border border-[#334366] overflow-hidden bg-[#1a2233]">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0f131a] border-b border-[#334366]">
              <th className="p-4 text-left font-medium text-sm w-1/4 text-white">Concepto</th>
              <th className="p-4 text-center font-medium text-sm w-1/4 text-white">
                {data.modoA === "porcentaje" ? "Porcentaje" : "Importe"}
              </th>
              <th className="p-4 text-center font-medium text-sm w-1/4 text-white">Moneda</th>
              <th className="p-4 text-right font-medium text-sm w-1/4 text-white">Monto</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila Parte F */}
            <tr className="border-b border-[#334366]">
              <td className="p-4 font-medium text-blue-400">
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
                        className={`text-center pr-6 h-9 bg-[#0f131a] border-[#334366] text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.porcA ? "border-destructive" : ""}`}
                        placeholder="0"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#92a4c8] text-sm">%</span>
                    </div>
                  ) : (
                    <CurrencyInput
                      value={data.impA}
                      onChange={(val) => updateData({ impA: val })}
                      prefix="$"
                      suffix="USD"
                      className="w-40 bg-[#0f131a] border-[#334366] text-white"
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
                    <SelectTrigger className="w-24 h-9 bg-[#0f131a] border-[#334366] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </td>
              <td className="p-4 text-right font-bold text-blue-400">
                {data.modoA === "porcentaje"
                  ? ((precioTotal * data.porcA) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : (data.impA || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                } USD
              </td>
            </tr>

            {/* Fila Parte SB */}
            <tr>
              <td className="p-4 font-medium text-purple-400">
                Total a Pagar SB
              </td>
              <td className="p-4 text-center text-sm text-white">
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
                    <SelectTrigger className="w-24 h-9 bg-[#0f131a] border-[#334366] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </td>
              <td className="p-4 text-right font-bold text-purple-400">
                {data.modoA === "porcentaje"
                  ? ((precioTotal * porcB) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : impB.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                } USD
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Distribution Bar */}
      <div className="rounded-lg border border-[#334366] bg-[#1a2233] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Distribución Visual</h3>
          <div className="flex items-center gap-1">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20">
              <span className="text-green-400 text-xs">✓</span>
            </span>
            <span className="text-sm font-medium text-green-400">Total 100%</span>
          </div>
        </div>

        <div className="flex items-center gap-0 h-3 rounded-lg overflow-hidden">
          <div
            className="h-full bg-blue-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${data.modoA === "porcentaje" ? data.porcA : (data.impA / precioTotal) * 100}%` }}
          >
            <span className="text-white text-sm font-bold px-2">
              {data.modoA === "porcentaje" ? `${data.porcA}%` : `${((data.impA / precioTotal) * 100).toFixed(1)}%`}
            </span>
          </div>
          <div
            className="h-full bg-purple-500 flex items-center justify-center transition-all duration-300"
            style={{ width: `${data.modoA === "porcentaje" ? porcB : ((impB / precioTotal) * 100)}%` }}
          >
            <span className="text-white text-sm font-bold px-2">
              {data.modoA === "porcentaje" ? `${porcB}%` : `${((impB / precioTotal) * 100).toFixed(1)}%`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-white">Parte F</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-white">Parte SB</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-900/10 border border-blue-900/30 p-4 text-sm text-slate-300">
        <div className="flex gap-2 items-start">
          <span className="text-blue-400 mt-0.5">💡</span>
          <div>
            <p className="font-medium mb-1 text-white">Tip:</p>
            <p>
              {data.modoA === "porcentaje"
                ? "Defina el porcentaje para la parte F y seleccione la moneda. La parte SB se calculará automáticamente."
                : "Ingrese el importe fijo para la parte F. La parte SB se calculará automáticamente como la diferencia con el precio total."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
