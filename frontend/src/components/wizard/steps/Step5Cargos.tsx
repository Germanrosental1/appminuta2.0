import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { validateStep } from "@/utils/validation";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormaPago } from "@/types/wizard";

// Usamos un tipo interno para manejar "Bonificado" sin modificar el tipo FormaPago
type FormaPagoInternal = FormaPago | "Bonificado";

export const Step5Cargos: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    const numValue = value === "" ? 0 : Number.parseFloat(value.replaceAll(",", "."));
    if (!Number.isNaN(numValue) && numValue >= 0) {
      updateData({ [field]: numValue });

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  // Manejar cambio en forma de pago
  const handleFormaPagoChange = (field: string, value: FormaPagoInternal, cargoField: string, moneda: "ARS" | "USD") => {
    // Si es bonificado, poner el cargo en 0 y guardar "-" como forma de pago
    if (value === "Bonificado") {
      updateData({
        [field]: "-", // Usamos "-" como valor en la base de datos
        [cargoField]: 0
      });
    } else {
      // Para cualquier otro valor, simplemente actualizar la forma de pago
      updateData({ [field]: value as FormaPago });
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

    // -- CORRECCIÓN CRÍTICA --
    // Mantener separadas las Partes F y SB en sus respectivas variables de salida
    // totalFinanciarArs -> Representará TOTAL F (en moneda A)
    // totalFinanciarUsd -> Representará TOTAL SB (en moneda B)
    // Los nombres de las variables son legados, pero su uso lógico será este.

    let totalF = 0;
    let totalSB = 0;

    // 1. BASE DE DEUDA
    // data.valorArsConIVA ya viene en la Moneda A (sea ARS o USD) desde Step 4
    // data.valorUsdConIVA ya viene en la Moneda B (sea ARS, USD o MIX) desde Step 4

    // Calcular Base F (restando anticipos en la misma moneda)
    const anticipoA_MismoMoneda = data.monedaA === "USD" ? (data.anticipoUsdA || 0) : (data.anticipoArsA || 0);
    const anticipoA_OtraMoneda = data.monedaA === "USD" ? (data.anticipoArsA || 0) : (data.anticipoUsdA || 0);

    // Si la otra moneda es ARS y yo estoy en USD -> Dividir por TC
    // Si la otra moneda es USD y yo estoy en ARS -> Multiplicar por TC
    const anticipoA_Convertido = data.monedaA === "USD"
      ? anticipoA_OtraMoneda / (tcValor || 1)
      : anticipoA_OtraMoneda * (tcValor || 1);

    const baseF = Math.max(0, (data.valorArsConIVA || 0) - anticipoA_MismoMoneda - anticipoA_Convertido);
    totalF += baseF;

    // Calcular Base SB
    const anticipoB_MismoMoneda = data.monedaB === "ARS" ? (data.anticipoArsB || 0) : (data.anticipoUsdB || 0);
    const anticipoB_OtraMoneda = data.monedaB === "ARS" ? (data.anticipoUsdB || 0) : (data.anticipoArsB || 0);

    const anticipoB_Convertido = data.monedaB === "ARS"
      ? anticipoB_OtraMoneda * (tcValor || 1)  // Estoy en ARS, anticipo viene en USD -> * TC
      : anticipoB_OtraMoneda / (tcValor || 1); // Estoy en USD, anticipo viene en ARS -> / TC

    const baseSB = Math.max(0, (data.valorUsdConIVA || 0) - anticipoB_MismoMoneda - anticipoB_Convertido);
    totalSB += baseSB;


    // 2. CARGOS ADICIONALES
    // Los cargos tienen una moneda de origen fija:
    // - Certif, Sellado -> ARS (cargosFinanciadosAArs, cargosFinanciadosBArs)
    // - Alhaj, Planos -> USD (cargosFinanciadosAUsd, cargosFinanciadosBUsd)

    // Sumar a Parte F (totalF) - Moneda Destino: data.monedaA
    if (data.monedaA === "USD") {
      // Destino USD
      totalF += cargosFinanciadosAUsd; // USD -> USD (Directo)
      totalF += cargosFinanciadosAArs / (tcValor || 1); // ARS -> USD (Dividir)
    } else {
      // Destino ARS
      totalF += cargosFinanciadosAArs; // ARS -> ARS (Directo)
      totalF += cargosFinanciadosAUsd * (tcValor || 1); // USD -> ARS (Multiplicar)
    }

    // Sumar a Parte SB (totalSB) - Moneda Destino: data.monedaB
    if (data.monedaB === "ARS") {
      // Destino ARS
      totalSB += cargosFinanciadosBArs; // ARS -> ARS (Directo)
      totalSB += cargosFinanciadosBUsd * (tcValor || 1); // USD -> ARS (Multiplicar)
    } else {
      // Destino USD
      totalSB += cargosFinanciadosBUsd; // USD -> USD (Directo)
      totalSB += cargosFinanciadosBArs / (tcValor || 1); // ARS -> USD (Dividir)
    }

    // Actualizar estado usando las variables legadas pero con la nueva lógica semántica
    // totalFinanciarArs = TOTAL F
    // totalFinanciarUsd = TOTAL SB
    if (totalF !== data.totalFinanciarArs || totalSB !== data.totalFinanciarUsd) {
      updateData({
        totalFinanciarArs: totalF,
        totalFinanciarUsd: totalSB
      });
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
    // Usamos la cantidad manual si está definida, sino calculamos (y actualizamos si es la primera vez)
    let cantidadCocheras = data.cantidadCocheras;

    // Si no está inicializado (es 0) pero detectamos cocheras en el array, sugerimos ese valor inicialmente
    if (!cantidadCocheras) {
      const cocherasNuevas = (data.unidades || []).filter(u => u.tipo === "Cochera").length;
      const cocherasLegacy = (data.cocheras || []).length;
      cantidadCocheras = cocherasNuevas > 0 ? cocherasNuevas : cocherasLegacy;
    }

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
      updateData({
        selladoMonto,
        alhajamiemtoMonto,
        planosUnidadMonto,
        planosCocheraMonto,
        totalCargosArs,
        totalCargosUsd,
        cantidadCocheras // Guardamos también la cantidad calculada si estaba en 0
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
    data.unidades,
    data.cantidadCocheras,
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
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-3 text-left font-medium text-sm">Concepto</th>
                <th className="p-3 text-left font-medium text-sm">Valor/%</th>
                <th className="p-3 text-right font-medium text-sm">Monto</th>
                <th className="p-3 text-right font-medium text-sm">Forma de Pago</th>
              </tr>
            </thead>
            <tbody>
              {/* Certificación Firmas */}
              <tr className="border-b border-border">
                <td className="p-4 font-medium">Certificación Firmas:</td>
                <td className="p-4">
                  <CurrencyInput
                    value={data.certificacionFirmas}
                    onChange={(value) => handleChange("certificacionFirmas", value.toString())}
                    onBlur={handleBlur}
                    prefix="$"
                    min={0}
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
                    <CurrencyInput
                      value={data.planosUnidadValorM2}
                      onChange={(value) => handleChange("planosUnidadValorM2", value.toString())}
                      onBlur={handleBlur}
                      prefix="$"
                      min={0}
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
                    <CurrencyInput
                      value={data.planosCocheraValor}
                      onChange={(value) => handleChange("planosCocheraValor", value.toString())}
                      onBlur={handleBlur}
                      prefix="$"
                      min={0}
                    />
                    <span>USD</span>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={data.cantidadCocheras || 0}
                      onChange={(e) => handleChange("cantidadCocheras", e.target.value)}
                      onBlur={handleBlur}
                      className="border-pink-100 bg-pink-50 w-20"
                    />
                    <span className="text-sm">Cocheras</span>
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
                  <CurrencyInput
                    value={data.otrosGastos}
                    onChange={(value) => handleChange("otrosGastos", value.toString())}
                    onBlur={handleBlur}
                    prefix="$"
                    min={0}
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
