import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Car, Package, Percent, Building, Store, Warehouse } from "lucide-react";
import { TipoDescuento, UnidadSeleccionada } from "@/types/wizard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const Step2Comercial: React.FC = () => {
  const { data, updateData } = useWizard();


  // Estado para las unidades seleccionadas
  const [unidades, setUnidades] = useState<UnidadSeleccionada[]>(data.unidades || []);

  // Inicializar unidades desde el contexto cuando cambia data.unidades
  useEffect(() => {
    if (data.unidades && data.unidades.length > 0) {
      setUnidades(data.unidades);
    }
  }, [data.unidades]);

  // Actualizar el contexto cuando cambian las unidades locales
  useEffect(() => {
    if (unidades.length > 0) {
      updateData({ unidades });
    }
  }, [unidades]);

  // Función para obtener el icono según el tipo de unidad
  const getIconForTipoUnidad = (tipo: string) => {
    switch (tipo) {
      case "Departamento":
        return <Building className="w-5 h-5" />;
      case "Cochera":
        return <Car className="w-5 h-5" />;
      case "Baulera":
        return <Package className="w-5 h-5" />;
      case "Local":
        return <Store className="w-5 h-5" />;
      case "Nave":
        return <Warehouse className="w-5 h-5" />;
      default:
        return <Building className="w-5 h-5" />;
    }
  };

  // Manejar cambio en el tipo de descuento de una unidad
  const handleTipoDescuentoChange = (index: number, value: TipoDescuento) => {
    const nuevasUnidades = [...unidades];
    nuevasUnidades[index].tipoDescuento = value;

    // Resetear siempre valores al cambiar el tipo
    nuevasUnidades[index].valorDescuento = 0;
    nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista;

    setUnidades(nuevasUnidades);
  };

  // Manejar cambio en el valor del descuento de una unidad
  const handleValorDescuentoChange = (index: number, value: string) => {
    const numValue = value === "" ? 0 : Number.parseFloat(value.replaceAll(",", "."));
    if (!Number.isNaN(numValue)) {
      const nuevasUnidades = [...unidades];
      nuevasUnidades[index].valorDescuento = numValue;

      // Recalcular precio negociado
      if (nuevasUnidades[index].tipoDescuento === "porcentaje" && numValue > 0) {
        // Aplicar descuento porcentual
        nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista * (1 - numValue / 100);
      } else if (nuevasUnidades[index].tipoDescuento === "importe" && numValue > 0) {
        // Aplicar descuento de importe fijo
        nuevasUnidades[index].precioNegociado = Math.max(nuevasUnidades[index].precioLista - numValue, 0);
      }

      setUnidades(nuevasUnidades);
    }
  };

  // Manejar cambio en el precio negociado de una unidad
  const handlePrecioNegociadoChange = (index: number, value: string) => {
    const numValue = value === "" ? 0 : Number.parseFloat(value);
    if (!Number.isNaN(numValue)) {
      const nuevasUnidades = [...unidades];
      nuevasUnidades[index].precioNegociado = numValue;

      // Recalcular valor del descuento si es por importe
      if (nuevasUnidades[index].tipoDescuento === "importe") {
        nuevasUnidades[index].valorDescuento = Math.max(nuevasUnidades[index].precioLista - numValue, 0);
      }

      setUnidades(nuevasUnidades);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Unidades Seleccionadas</h2>
      </div>

      {unidades.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Building className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No hay unidades agregadas</p>
          <p className="text-sm text-muted-foreground mt-2">Regrese al paso anterior para agregar unidades</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-4">
            {unidades.map((unidad, index) => (
              <Card key={unidad.id || `unidad-${index}`} className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getIconForTipoUnidad(unidad.tipo)}
                      <CardTitle className="text-base">
                        {unidad.tipo}: {unidad.descripcion}
                      </CardTitle>
                    </div>
                    <Badge variant="outline">
                      {unidad.proyecto} - {unidad.etapa}
                    </Badge>
                  </div>
                  <CardDescription>
                    Sector: {unidad.sector}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Precio Lista */}
                    <div className={unidad.tipoDescuento === "ninguno" ? "md:col-span-4" : "md:col-span-3"}>
                      <Label htmlFor={`precioLista-${index}`} className="text-xs mb-1.5 block">
                        Precio de Lista
                      </Label>
                      <CurrencyInput
                        id={`precioLista-${index}`}
                        value={unidad.precioLista}
                        onChange={() => { }}
                        prefix="$"
                        className="bg-muted h-9 text-sm"
                        disabled
                      />
                    </div>

                    {/* Tipo de Descuento */}
                    <div className={unidad.tipoDescuento === "ninguno" ? "md:col-span-4" : "md:col-span-3"}>
                      <Label htmlFor={`tipoDescuento-${index}`} className="text-xs mb-1.5 block">
                        Tipo de Descuento
                      </Label>
                      <Select
                        value={unidad.tipoDescuento}
                        onValueChange={(value: TipoDescuento) => handleTipoDescuentoChange(index, value)}
                      >
                        <SelectTrigger id={`tipoDescuento-${index}`} className="h-9 text-sm">
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Sin descuento</SelectItem>
                          <SelectItem value="porcentaje">Porcentaje %</SelectItem>
                          <SelectItem value="importe">Importe $</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor Descuento (Condicional) */}
                    {unidad.tipoDescuento !== "ninguno" && (
                      <div className="md:col-span-3">
                        <Label htmlFor={`valorDescuento-${index}`} className="text-xs mb-1.5 block">
                          {unidad.tipoDescuento === "porcentaje" ? "% Descuento" : "$ Descuento"}
                        </Label>
                        <div className="relative">
                          {unidad.tipoDescuento === "porcentaje" ? (
                            <>
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                id={`valorDescuento-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={unidad.valorDescuento || ""}
                                onChange={(e) => handleValorDescuentoChange(index, e.target.value)}
                                className="pl-8 h-9 text-sm"
                                placeholder="0.00"
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                            </>
                          ) : (
                            <CurrencyInput
                              id={`valorDescuento-${index}`}
                              value={unidad.valorDescuento}
                              onChange={(value) => handleValorDescuentoChange(index, value.toString())}
                              prefix="$"
                              min={0}
                              className={`h-9 text-sm ${unidad.tipoDescuento === "importe" ? "bg-muted font-bold text-slate-900" : ""}`}
                              disabled={unidad.tipoDescuento === "importe"}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Precio Negociado */}
                    <div className={unidad.tipoDescuento === "ninguno" ? "md:col-span-4" : "md:col-span-3"}>
                      <Label htmlFor={`precioNegociado-${index}`} className="text-xs mb-1.5 block">
                        Precio Negociado
                      </Label>
                      <CurrencyInput
                        id={`precioNegociado-${index}`}
                        value={unidad.precioNegociado}
                        onChange={(value) => handlePrecioNegociadoChange(index, value.toString())}
                        prefix="$"
                        className={`h-9 text-sm ${unidad.tipoDescuento === "importe" ? "" : "bg-muted font-bold text-slate-900"}`}
                        disabled={unidad.tipoDescuento !== "importe"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Total General */}
      {data.unidades && data.unidades.length > 0 && (
        <Card className="mt-4 bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="text-sm font-medium text-slate-600">
              Total ({data.unidades.length} unidades seleccionadas)
            </div>
            <div className="text-xl font-bold text-slate-900">
              USD {(data.unidades.reduce((acc: number, curr: any) => acc + (curr.precioNegociado || 0), 0)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground mt-6">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Configure los descuentos o edite el precio negociado directamente (solo para descuento por importe).</p>
      </div>
    </div>
  );
};
