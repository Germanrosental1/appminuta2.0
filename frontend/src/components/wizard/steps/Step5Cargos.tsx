import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { validateStep } from "@/utils/validation";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormaPago } from "@/types/wizard";

// Usamos un tipo interno para manejar "Bonificado" sin modificar el tipo FormaPago
type FormaPagoInternal = FormaPago | "Bonificado";

export const Step5Cargos: React.FC = () => {
  const { data, setData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value.replaceAll(",", "."));
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setData({ [field]: numValue });

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  // Manejar cambio en forma de pago
  const handleFormaPagoChange = (field: string, value: FormaPagoInternal, cargoField: string, moneda: "ARS" | "USD") => {
    // Si es bonificado, poner el cargo en 0 y guardar "-" como forma de pago
    if (value === "Bonificado") {
      setData({
        [field]: "-", // Usamos "-" como valor en la base de datos
        [cargoField]: 0
      });
    } else {
      // Para cualquier otro valor, simplemente actualizar la forma de pago
      setData({ [field]: value as FormaPago });
    }
  };

  const handleBlur = () => {
    const validation = validateStep(4, data);
    if (!validation.valid) {
      setErrors(validation.errors);
    }
  };

  // Calcular precio total (unidad principal + cocheras + baulera)
  const calcularPrecioTotal = () => {
    // Precio de la unidad principal
    let total = data.precioNegociado || 0;

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

  // Calcular montos financiados por categoría
  const calcularMontoFinanciado = (monto: number | undefined, pagoSeleccionado: string, targetPago: string) => {
    return pagoSeleccionado === targetPago ? (monto || 0) : 0;
  };

  // Calcular totales de cargos financiados
  useEffect(() => {
    const baseFinanciarArs = data.valorArsConIVA || 0;
    const baseFinanciarUsd = data.valorUsdConIVA || 0;

    // Restar anticipos
    const baseFinanciarArsConAnticipos = baseFinanciarArs - (data.anticipoArsA || 0) - (data.anticipoArsB || 0);
    const baseFinanciarUsdConAnticipos = baseFinanciarUsd - (data.anticipoUsdA || 0) - (data.anticipoUsdB || 0);

    const tcValor = data.tcValor || 1;

    // Calcular montos financiados A (ARS/USD) y B (ARS/USD)
    let cargosFinanciadosAArs =
      calcularMontoFinanciado(data.certificacionFirmas, data.certificacionFirmasPago, "Financiado A") +
      calcularMontoFinanciado(data.selladoMonto, data.selladoPago, "Financiado A");

    let cargosFinanciadosBArs =
      calcularMontoFinanciado(data.certificacionFirmas, data.certificacionFirmasPago, "Financiado B") +
      calcularMontoFinanciado(data.selladoMonto, data.selladoPago, "Financiado B");

    let cargosFinanciadosAUsd =
      calcularMontoFinanciado(data.alhajamiemtoMonto, data.alhajamiemtoPago, "Financiado A") +
      calcularMontoFinanciado(data.planosUnidadMonto, data.planosUnidadPago, "Financiado A") +
      calcularMontoFinanciado(data.planosCocheraMonto, data.planosCocheraPago, "Financiado A") +
      calcularMontoFinanciado(data.otrosGastos, data.otrosGastosPago, "Financiado A");

    let cargosFinanciadosBUsd =
      calcularMontoFinanciado(data.alhajamiemtoMonto, data.alhajamiemtoPago, "Financiado B") +
      calcularMontoFinanciado(data.planosUnidadMonto, data.planosUnidadPago, "Financiado B") +
      calcularMontoFinanciado(data.planosCocheraMonto, data.planosCocheraPago, "Financiado B") +
      calcularMontoFinanciado(data.otrosGastos, data.otrosGastosPago, "Financiado B");

    // Calcular total a financiar ARS
    let totalFinanciarArs = baseFinanciarArsConAnticipos + cargosFinanciadosAArs + (cargosFinanciadosAUsd * tcValor);

    // Calcular total a financiar USD según moneda B
    let totalFinanciarUsd = baseFinanciarUsdConAnticipos;

    if (data.monedaB === "ARS") {
      totalFinanciarArs += cargosFinanciadosBArs + (cargosFinanciadosBUsd * tcValor);
    } else if (data.monedaB === "USD") {
      totalFinanciarUsd += (cargosFinanciadosBArs / tcValor) + cargosFinanciadosBUsd;
    } else if (data.monedaB === "MIX") {
      totalFinanciarArs += cargosFinanciadosBArs;
      totalFinanciarUsd += cargosFinanciadosBUsd;
    }

    if (totalFinanciarArs !== data.totalFinanciarArs || totalFinanciarUsd !== data.totalFinanciarUsd) {
      setData({ totalFinanciarArs, totalFinanciarUsd });
    }
  }, [
    data.valorArsConIVA, data.valorUsdConIVA,
    data.anticipoArsA, data.anticipoArsB, data.anticipoUsdA, data.anticipoUsdB,
    data.tcValor, data.monedaB,
    data.certificacionFirmas, data.certificacionFirmasPago,
    data.selladoMonto, data.selladoPago,
    data.alhajamiemtoMonto, data.alhajamiemtoPago,
    data.planosUnidadMonto, data.planosUnidadPago,
    data.planosCocheraMonto, data.planosCocheraPago,
    data.otrosGastos, data.otrosGastosPago,
    data.totalFinanciarArs, data.totalFinanciarUsd
  ]);

  // Calcular montos basados en porcentajes y otros valores
  useEffect(() => {
    // Asegurar que los valores existan y sean números
    const valorArsConIVA = data.valorArsConIVA || 0;
    const selladoPorcentaje = data.selladoPorcentaje || 0;
    const alhajamiemtoPorcentaje = data.alhajamiemtoPorcentaje || 0;
    const planosUnidadValorM2 = data.planosUnidadValorM2 || 0;
    const planosUnidadM2 = data.planosUnidadM2 || 0;
    const planosCocheraValor = data.planosCocheraValor || 0;
    const certificacionFirmas = data.certificacionFirmas || 0;
    const otrosGastos = data.otrosGastos || 0;

    // Calcular sellado (porcentaje sobre la parte A en ARS)
    const selladoMonto = valorArsConIVA * (selladoPorcentaje / 100);

    // Calcular alhajamiento (porcentaje sobre el precio total)
    const precioTotal = calcularPrecioTotal();
    const alhajamiemtoMonto = precioTotal * (alhajamiemtoPorcentaje / 100);

    // Calcular planos unidad (valor por m2 * m2)
    const planosUnidadMonto = planosUnidadValorM2 * planosUnidadM2;

    // Calcular planos cochera (valor por cochera * cantidad de cocheras)
    const cantidadCocheras = (data.cocheras || []).length;
    const planosCocheraMonto = planosCocheraValor * cantidadCocheras;

    // Calcular totales
    const totalCargosArs = certificacionFirmas + selladoMonto;
    const totalCargosUsd = alhajamiemtoMonto + planosUnidadMonto + planosCocheraMonto + otrosGastos;

    if (
      selladoMonto !== data.selladoMonto ||
      alhajamiemtoMonto !== data.alhajamiemtoMonto ||
      planosUnidadMonto !== data.planosUnidadMonto ||
      planosCocheraMonto !== data.planosCocheraMonto ||
      totalCargosArs !== data.totalCargosArs ||
      totalCargosUsd !== data.totalCargosUsd
    ) {
      setData({
        selladoMonto,
        alhajamiemtoMonto,
        planosUnidadMonto,
        planosCocheraMonto,
        totalCargosArs,
        totalCargosUsd
      });
    }
  }, [
    data.certificacionFirmas,
    data.selladoPorcentaje,
    data.valorArsConIVA,
    data.alhajamiemtoPorcentaje,
    data.planosUnidadValorM2,
    data.planosUnidadM2,
    data.planosCocheraValor,
    data.cocheras,
    data.otrosGastos
  ]);

  // Formato de moneda
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.00";
    return value.toLocaleString("es-AR", { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-primary/10 p-4">
          <h3 className="text-lg font-semibold">06. Cargos</h3>
        </div>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              {/* Certificación Firmas */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Certificación Firmas:</td>
                <td className="p-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.certificacionFirmas || ""}
                    onChange={(e) => handleChange("certificacionFirmas", e.target.value)}
                    onBlur={handleBlur}
                  />
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.certificacionFirmas)} ARS
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.certificacionFirmasPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("certificacionFirmasPago", value, "certificacionFirmas", "ARS")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Sellado */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Sellado:</td>
                <td className="p-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.selladoPorcentaje || ""}
                    onChange={(e) => handleChange("selladoPorcentaje", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <div className="text-xs text-muted-foreground mt-1">% sobre Parte A (ARS)</div>
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.selladoMonto)} ARS
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.selladoPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("selladoPago", value, "selladoPorcentaje", "ARS")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Alhajamiento */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Alhajamiento:</td>
                <td className="p-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.alhajamiemtoPorcentaje || ""}
                    onChange={(e) => handleChange("alhajamiemtoPorcentaje", e.target.value)}
                    onBlur={handleBlur}
                  />
                  <div className="text-xs text-muted-foreground mt-1">% sobre Precio Total</div>
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.alhajamiemtoMonto)} USD
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.alhajamiemtoPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("alhajamiemtoPago", value, "alhajamiemtoPorcentaje", "USD")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Planos Unidad */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Planos Unidad:</td>
                <td className="p-4">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.planosUnidadValorM2 || ""}
                      onChange={(e) => handleChange("planosUnidadValorM2", e.target.value)}
                      onBlur={handleBlur}
                    />
                    <span>USD</span>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.planosUnidadM2 || ""}
                      onChange={(e) => handleChange("planosUnidadM2", e.target.value)}
                      onBlur={handleBlur}
                      className="border-pink-100 bg-pink-50"
                    />
                    <span>m²</span>
                  </div>
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.planosUnidadMonto)} USD
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.planosUnidadPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("planosUnidadPago", value, "planosUnidadM2", "USD")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Planos Cochera */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Planos Cochera:</td>
                <td className="p-4">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.planosCocheraValor || ""}
                      onChange={(e) => handleChange("planosCocheraValor", e.target.value)}
                      onBlur={handleBlur}
                    />
                    <span>USD</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      Cocheras: {(data.cocheras || []).length}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.planosCocheraMonto)} USD
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.planosCocheraPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("planosCocheraPago", value, "planosCocheraValor", "USD")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Otros gastos */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Otros gastos</td>
                <td className="p-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.otrosGastos || ""}
                    onChange={(e) => handleChange("otrosGastos", e.target.value)}
                    onBlur={handleBlur}
                  />
                </td>
                <td className="p-4 text-right font-medium">
                  {formatCurrency(data.otrosGastos)} USD
                </td>
                <td className="p-4 text-right">
                  <Select
                    value={data.otrosGastosPago}
                    onValueChange={(value: FormaPagoInternal) => handleFormaPagoChange("otrosGastosPago", value, "otrosGastos", "USD")}
                  >
                    <SelectTrigger className="w-[180px] text-blue-500">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Firma de Boleto">Pago: Firma de Boleto</SelectItem>
                      <SelectItem value="Fecha Posesión A">Pago: Fecha Posesión A</SelectItem>
                      <SelectItem value="Fecha Posesión B">Pago: Fecha Posesión B</SelectItem>
                      <SelectItem value="Financiado A">Financiado A</SelectItem>
                      <SelectItem value="Financiado B">Financiado B</SelectItem>
                      <SelectItem value="Bonificado">Bonificado</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              {/* Total cargos ARS */}
              <tr className="border-b border-border bg-blue-50">
                <td colSpan={2} className="p-4 font-bold text-blue-600">
                  Total cargos ARS
                </td>
                <td colSpan={2} className="p-4 text-right font-bold text-blue-600">
                  {formatCurrency(data.totalCargosArs)} ARS
                </td>
              </tr>

              {/* Total cargos USD */}
              <tr className="bg-blue-50">
                <td colSpan={2} className="p-4 font-bold text-blue-600">
                  Total cargos USD
                </td>
                <td colSpan={2} className="p-4 text-right font-bold text-blue-600">
                  {formatCurrency(data.totalCargosUsd)} USD
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>
          Complete los campos resaltados en amarillo. Los montos se calcularán automáticamente.
          El sellado se calcula como porcentaje de la parte A en ARS, el alhajamiento como porcentaje del precio total,
          los planos de unidad según los metros cuadrados, y los planos de cocheras según la cantidad de cocheras.
        </p>
      </div>
    </div>
  );
};
