import React from "react";
import { useWizard } from "@/context/WizardContext";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const ResumenCard: React.FC = () => {
  const { data } = useWizard();

  const porcB = 100 - (data.porcA || 0);
  const impB = (data.precioNegociado || 0) - (data.impA || 0);
  
  // Manejar propiedades que pueden no existir en el tipo WizardData
  const cocherasCant = data.cocheras?.length || 0;
  const totalCocheras = data.cocheras?.reduce((sum, cochera) => sum + (cochera.precioNegociado || 0), 0) || 0;
  
  // Usar las propiedades correctas según WizardData
  const selladoMonto = data.selladoMonto || 0;
  const alhajamiemtoMonto = data.alhajamiemtoMonto || 0;

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.00";
    return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-primary">Propiedad</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proyecto:</span>
              <span className="font-medium">{data.proyecto || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidad:</span>
              <span className="font-medium">{data.unidad || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha Posesión:</span>
              <span className="font-medium">{data.fechaPosesion || "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-primary">Precios</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio Lista:</span>
              <span className="font-medium">${formatCurrency(data.precioLista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio Negociado:</span>
              <span className="font-bold text-success">${formatCurrency(data.precioNegociado)}</span>
            </div>
            {data.precioLista > 0 && data.precioNegociado > 0 && (
              <div className="flex justify-between text-xs pt-1">
                <span className="text-muted-foreground">Descuento:</span>
                <span className="text-success">
                  {(((data.precioLista - data.precioNegociado) / data.precioLista) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-primary">Composición A/B</h4>
          <div className="space-y-2 text-sm">
            {data.modoA === "porcentaje" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parte A:</span>
                  <span className="font-medium">{data.porcA}% ({data.monedaA})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parte B:</span>
                  <span className="font-medium">{porcB.toFixed(2)}% ({data.monedaB})</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importe A:</span>
                  <span className="font-medium">${formatCurrency(data.impA)} {data.monedaA}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importe B:</span>
                  <span className="font-medium">${formatCurrency(impB)} {data.monedaB}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-primary">Composición del Financiamiento</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">TC ({data.tcFuente}):</span>
              <span className="font-medium">${formatCurrency(data.tcValor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Anticipo ARS:</span>
              <span className="font-medium">${formatCurrency(data.anticipoArs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Anticipo USD:</span>
              <span className="font-medium">${formatCurrency(data.anticipoUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">A financiar ARS:</span>
              <span className="font-bold text-primary">${formatCurrency(data.totalFinanciarArs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">A financiar USD:</span>
              <span className="font-bold text-primary">${formatCurrency(data.totalFinanciarUsd)}</span>
            </div>
            {data.fechaFirmaBoleto && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firma Boleto:</span>
                <span className="font-medium">{data.fechaFirmaBoleto}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-primary">Cargos Adicionales</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sellado ({data.selladoPorcentaje || 0}%):</span>
              <span className="font-medium">${formatCurrency(selladoMonto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alhajamiento:</span>
              <span className="font-medium">${formatCurrency(alhajamiemtoMonto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cargos ARS:</span>
              <span className="font-medium">${formatCurrency(data.totalCargosArs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cargos USD:</span>
              <span className="font-medium">${formatCurrency(data.totalCargosUsd)}</span>
            </div>
            {cocherasCant > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cocheras ({cocherasCant}):</span>
                <span className="font-medium">${formatCurrency(totalCocheras)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo de Cambio:</span>
              <span className="font-medium">1 USD = ${formatCurrency(data.dolarRef)} ARS</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold">Formato de salida:</span>
              <span className="text-lg font-bold text-primary">{data.formatoSalida}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
