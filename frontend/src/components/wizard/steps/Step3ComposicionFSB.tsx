import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateStep } from "@/utils/validation";
import { DollarSign } from "lucide-react";

export const Step3ComposicionFSB: React.FC = () => {
  const { data, setData } = useWizard();
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

  // Asegurar que la moneda A siempre sea ARS
  useEffect(() => {
    if (data.monedaA !== "ARS") {
      setData({ monedaA: "ARS" });
    }
  }, []);

  useEffect(() => {
    // Validate when values change
    const validation = validateStep(2, data);
    if (!validation.valid) {
      setErrors(validation.errors);
    } else {
      setErrors({});
    }
  }, [data.modoA, data.porcA, data.impA, data.precioNegociado, data.cocheras, data.baulera, data.unidades]);

  const handleModoChange = (modo: "porcentaje" | "importe") => {
    setData({ modoA: modo });
  };

  const handlePorcAChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setData({ porcA: num });
    }
  };

  const handleImpAChange = (value: string) => {
    const val = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (Number.isNaN(val)) {
      // If the parsed value is NaN, we might want to clear the input or set it to 0
      // For now, we'll just not update the state if it's not a valid number.
      // Or, if the user clears the input, we can set it to 0.
      if (value.trim() === "") {
        setData({ impA: 0 });
      }
      return;
    }
    if (val >= 0 && val <= precioTotal) {
      setData({ impA: val });
    }
  };

  return (
    <div className="space-y-6">
      {/* Referencia al precio total */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Precio total (unidad + adicionales)</p>
            <p className="text-2xl font-bold text-primary">
              ${precioTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              {data.unidades && data.unidades.length > 0 ? (
                // Mostrar todas las unidades del nuevo modelo
                <>
                  {data.unidades.map((unidad, index) => (
                    <p key={index}>
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
      <div className="space-y-3">
        <Label>Modo de Composición</Label>
        <RadioGroup value={data.modoA} onValueChange={handleModoChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="porcentaje" id="modo-porcentaje" />
            <Label htmlFor="modo-porcentaje" className="font-normal cursor-pointer">
              Por Porcentaje
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="importe" id="modo-importe" />
            <Label htmlFor="modo-importe" className="font-normal cursor-pointer">
              Por Importe
            </Label>
          </div>
        </RadioGroup>
      </div>

      {data.modoA === "porcentaje" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="porcA">Porcentaje F (%)</Label>
            <Input
              id="porcA"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.porcA}
              onChange={(e) => handlePorcAChange(e.target.value)}
              className={errors.porcA ? "border-destructive" : ""}
            />
            {errors.porcA && <p className="text-sm text-destructive">{errors.porcA}</p>}
          </div>

          <div className="rounded-lg bg-secondary p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Porcentaje SB (calculado)</span>
              <span className="text-lg font-bold text-primary">{porcB.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="impA">Importe F</Label>
            <Input
              id="impA"
              type="number"
              min="0"
              max={precioTotal}
              step="0.01"
              value={data.impA || ""}
              onChange={(e) => handleImpAChange(e.target.value)}
              className={errors.impA ? "border-destructive" : ""}
              placeholder="0.00"
            />
            {errors.impA && <p className="text-sm text-destructive">{errors.impA}</p>}
            <p className="text-xs text-muted-foreground">
              Máximo: ${precioTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-lg bg-secondary p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Importe SB (calculado)</span>
              <span className="text-lg font-bold text-primary">
                ${impB.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monedaB">Moneda SB</Label>
          <Select value={data.monedaB} onValueChange={(val: "USD" | "ARS" | "MIX") => setData({ monedaB: val, monedaA: "ARS" })}>
            <SelectTrigger id="monedaB">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="MIX">MIX</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">En este paso los totales siempre se muestran en USD</p>
        </div>
      </div>

      {/* Resumen de totales a pagar */}
      <div className="rounded-lg border border-border overflow-hidden mt-6">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border">
              <td className="p-3 font-medium text-blue-500">
                Total a Pagar F
              </td>
              <td className="p-3 text-center">
                {data.modoA === "porcentaje" ? `${data.porcA}%` : ""}
              </td>
              <td className="p-3 text-right font-bold text-blue-500">
                {data.modoA === "porcentaje"
                  ? `${((precioTotal * data.porcA) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD`
                  : `${data.impA.toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD`}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-blue-500">
                Total a Pagar SB
              </td>
              <td className="p-3 text-center">
                {data.modoA === "porcentaje" ? `${porcB}%` : ""}
              </td>
              <td className="p-3 text-right font-bold text-blue-500">
                {data.modoA === "porcentaje"
                  ? `${((precioTotal * porcB) / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD`
                  : `${impB.toLocaleString("es-AR", { minimumFractionDigits: 2 })} USD`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>
          Defina cómo se divide el pago entre dos partes (F y SB), ya sea por porcentaje o por importe específico.
          El sistema calculará automáticamente la parte SB.
        </p>
      </div>
    </div>
  );
};
