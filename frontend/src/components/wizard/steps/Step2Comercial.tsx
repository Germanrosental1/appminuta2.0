import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { validateStep } from "@/utils/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Plus, Trash, Car, Package, Percent, Building, Store, Warehouse } from "lucide-react";
import { CocheraData, BauleraData, TipoDescuento, UnidadSeleccionada } from "@/types/wizard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const Step2Comercial: React.FC = () => {
  const { data, setData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado para las unidades seleccionadas
  const [unidades, setUnidades] = useState<UnidadSeleccionada[]>(data.unidades || []);
  const [unidadEditando, setUnidadEditando] = useState<number>(-1);

  // Para mantener compatibilidad con código existente
  const [cocheraErrors, setCocheraErrors] = useState<Record<string, Record<string, string>>>({});
  const [bauleraErrors, setBauleraErrors] = useState<Record<string, string>>({});

  // Inicializar unidades desde el contexto cuando cambia data.unidades
  useEffect(() => {
    if (data.unidades && data.unidades.length > 0) {
      setUnidades(data.unidades);
    }
  }, [data.unidades]);

  // Actualizar el contexto cuando cambian las unidades locales
  useEffect(() => {
    if (unidades.length > 0) {
      setData({ unidades });
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

    // Si cambiamos a "ninguno", resetear el valor del descuento
    if (value === "ninguno") {
      nuevasUnidades[index].valorDescuento = 0;
      nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista;
    }

    setUnidades(nuevasUnidades);
  };

  // Manejar cambio en el valor del descuento de una unidad
  const handleValorDescuentoChange = (index: number, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value.replace(/,/g, "."));
    if (!isNaN(numValue)) {
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

  const handleCocheraChange = (index: number, field: keyof CocheraData, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value.replace(/,/g, "."));
    if (!isNaN(numValue)) {
      const updatedCocheras = [...data.cocheras];

      // Para mantener compatibilidad, si actualizamos precioNegociado, también actualizamos precioLista
      if (field === "precioNegociado") {
        updatedCocheras[index] = {
          ...updatedCocheras[index],
          precioNegociado: numValue,
          precioLista: numValue // Mantener sincronizado para compatibilidad
        };
      } else {
        updatedCocheras[index] = {
          ...updatedCocheras[index],
          [field]: numValue
        };
      }

      setData({ cocheras: updatedCocheras });

      if (cocheraErrors[index]?.[field]) {
        setCocheraErrors((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: "" }
        }));
      }
    }
  };

  const handleBauleraChange = (field: keyof BauleraData, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value.replace(/,/g, "."));
    if (!isNaN(numValue)) {
      let updatedBaulera;

      // Para mantener compatibilidad, si actualizamos precioNegociado, también actualizamos precioLista
      if (field === "precioNegociado") {
        updatedBaulera = data.baulera
          ? { ...data.baulera, precioNegociado: numValue, precioLista: numValue }
          : { precioNegociado: numValue, precioLista: numValue };
      } else {
        updatedBaulera = data.baulera
          ? { ...data.baulera, [field]: numValue }
          : { precioLista: 0, precioNegociado: 0 };

        // Asignar el valor al campo específico
        updatedBaulera[field] = numValue;
      }

      setData({ baulera: updatedBaulera });

      if (bauleraErrors[field]) {
        setBauleraErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  const handleBlur = () => {
    const validation = validateStep(1, data);
    if (!validation.valid) {
      setErrors(validation.errors);
    }
  };

  const validateCochera = (index: number) => {
    // Asegurarse de que cocheras existe
    const cocheras = data.cocheras || [];
    if (!cocheras[index]) {
      return false;
    }

    const cochera = cocheras[index];
    const errors: Record<string, string> = {};

    if ((cochera.precioNegociado || 0) < 0) {
      errors.precioNegociado = "El precio negociado no puede ser negativo";
    }

    setCocheraErrors((prev) => ({ ...prev, [index]: errors }));
    return Object.keys(errors).length === 0;
  };

  const validateBaulera = () => {
    if (!data.baulera) return true;

    const errors: Record<string, string> = {};

    if ((data.baulera.precioNegociado || 0) < 0) {
      errors.precioNegociado = "El precio negociado no puede ser negativo";
    }

    setBauleraErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addCochera = () => {
    // Asegurarse de que cocheras existe antes de verificar su longitud
    const cocheras = data.cocheras || [];
    if (cocheras.length < 3) {
      const newCochera: CocheraData = { precioLista: 0, precioNegociado: 0 };
      setData({ cocheras: [...cocheras, newCochera] });
    }
  };

  const removeCochera = (index: number) => {
    // Asegurarse de que cocheras existe
    const cocheras = data.cocheras || [];
    const updatedCocheras = [...cocheras];
    updatedCocheras.splice(index, 1);
    setData({ cocheras: updatedCocheras });

    // Limpiar errores para esta cochera
    const updatedErrors = { ...cocheraErrors };
    delete updatedErrors[index];
    setCocheraErrors(updatedErrors);
  };

  const addBaulera = () => {
    if (!data.baulera) {
      setData({ baulera: { precioLista: 0, precioNegociado: 0 } });
    }
  };

  const removeBaulera = () => {
    setData({ baulera: null });
    setBauleraErrors({});
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
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {unidades.map((unidad, index) => (
              <Card key={index} className="mb-4">
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
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={`precioLista-${index}`}>
                      Precio de Lista
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id={`precioLista-${index}`}
                        type="number"
                        step="0.01"
                        value={unidad.precioLista || ""}
                        className="pl-9 bg-muted"
                        placeholder="0.00"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tipoDescuento-${index}`}>
                      Tipo de Descuento
                    </Label>
                    <Select
                      value={unidad.tipoDescuento}
                      onValueChange={(value: TipoDescuento) => handleTipoDescuentoChange(index, value)}
                    >
                      <SelectTrigger id={`tipoDescuento-${index}`}>
                        <SelectValue placeholder="Seleccione tipo de descuento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ninguno">Sin descuento</SelectItem>
                        <SelectItem value="porcentaje">Descuento por porcentaje</SelectItem>
                        <SelectItem value="importe">Descuento por importe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {unidad.tipoDescuento !== "ninguno" && (
                    <div className="space-y-2">
                      <Label htmlFor={`valorDescuento-${index}`}>
                        {unidad.tipoDescuento === "porcentaje" ? "Porcentaje de Descuento" : "Importe de Descuento"}
                      </Label>
                      <div className="relative">
                        {unidad.tipoDescuento === "porcentaje" ? (
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        ) : (
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        )}
                        <Input
                          id={`valorDescuento-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={unidad.valorDescuento || ""}
                          onChange={(e) => handleValorDescuentoChange(index, e.target.value)}
                          className="pl-9"
                          placeholder="0.00"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`precioNegociado-${index}`}>
                      Precio Negociado
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id={`precioNegociado-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={unidad.precioNegociado || ""}
                        className="pl-9 bg-muted"
                        placeholder="0.00"
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground mt-6">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Configure los descuentos para cada unidad. El precio negociado se calcula automáticamente.</p>
      </div>
    </div>
  );
};
