import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Package, Percent, Building, Store, Warehouse, TrendingDown, Sparkles } from "lucide-react";
import { TipoDescuento, UnidadSeleccionada } from "@/types/wizard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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

    // Resetear valores al cambiar el tipo - sin descuento
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

      // Recalcular precio negociado SOLO si hay un descuento > 0
      if (nuevasUnidades[index].tipoDescuento === "porcentaje") {
        if (numValue > 0) {
          // Aplicar descuento porcentual
          nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista * (1 - numValue / 100);
        } else {
          // Sin descuento, mantener precio lista
          nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista;
        }
      } else if (nuevasUnidades[index].tipoDescuento === "importe") {
        if (numValue > 0) {
          // Aplicar descuento de importe fijo
          nuevasUnidades[index].precioNegociado = Math.max(nuevasUnidades[index].precioLista - numValue, 0);
        } else {
          // Sin descuento, mantener precio lista
          nuevasUnidades[index].precioNegociado = nuevasUnidades[index].precioLista;
        }
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


  // Calcular ahorro total
  const totalAhorro = unidades.reduce((acc, u) => acc + (u.precioLista - u.precioNegociado), 0);
  const totalPrecioLista = unidades.reduce((acc, u) => acc + u.precioLista, 0);
  const totalNegociado = unidades.reduce((acc, u) => acc + u.precioNegociado, 0);
  const porcentajeAhorro = totalPrecioLista > 0 ? ((totalAhorro / totalPrecioLista) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header Section - Más espacioso */}
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Condiciones Comerciales
            </h2>
          </div>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl">
            Configure los precios de lista y aplique los descuentos correspondientes a cada unidad seleccionada para la minuta.
          </p>
        </div>
        {unidades.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 shadow-lg shadow-amber-500/10"
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Unidades</p>
              <p className="text-sm font-black text-white">
                {unidades.length}
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {unidades.length === 0 ? (
        <section className="border-2 border-dashed border-[#334366] rounded-xl bg-[#1a2233] overflow-hidden flex flex-col min-h-[300px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-[#92a4c8]"
          >
            <div className="w-20 h-20 rounded-full bg-[#0f131a] flex items-center justify-center mb-6">
              <Building className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-white text-xl font-bold mb-2">No hay unidades agregadas</p>
            <p className="text-base text-slate-400">Regrese al paso anterior para agregar unidades</p>
          </motion.div>
        </section>
      ) : (
        <>
          {/* Total General - Destacado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-2 border-amber-500/50 bg-[#1a2233] shadow-xl shadow-amber-500/10 rounded-xl">
              <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-9 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                      <div>
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">
                          RESUMEN DE LA OPERACIÓN
                        </p>
                        <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                          Total Negociado
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs text-[#92a4c8] pl-3">
                      {data.unidades.length} {data.unidades.length === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total</p>
                      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400" style={{ fontFamily: 'Playfair Display, serif' }}>
                        <span className="mr-3">USD</span> {totalNegociado.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {totalAhorro > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                        <TrendingDown className="w-5 h-5 text-green-400" />
                        <div className="text-right">
                          <p className="text-[10px] text-green-300 font-semibold uppercase tracking-wider">Ahorro Total</p>
                          <p className="text-lg font-black text-green-400">
                            USD {totalAhorro.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-green-400/80 font-medium">
                            {porcentajeAhorro.toFixed(2)}% de descuento
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Lista de Unidades */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <h3 className="text-white text-base font-bold">Unidades Seleccionadas</h3>
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                {unidades.length}
              </span>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {unidades.map((unidad, index) => {
                  const ahorro = unidad.precioLista - unidad.precioNegociado;
                  const porcentajeDesc = unidad.precioLista > 0 ? ((ahorro / unidad.precioLista) * 100) : 0;

                  return (
                    <motion.div
                      key={unidad.id || `unidad-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <Card className="overflow-hidden border-2 border-[#334366] bg-[#1a2233] hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 rounded-xl">
                        {/* Header con gradiente decorativo */}
                        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>

                        <CardHeader className="p-4 border-b border-[#334366]">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Icono con efecto glow */}
                              <div className={`p-4 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-105 ${unidad.tipo.includes("Cochera")
                                ? "bg-emerald-500/10 text-emerald-400" :
                                unidad.tipo.includes("Baulera")
                                  ? "bg-orange-500/10 text-orange-400" :
                                  "bg-amber-500/10 text-amber-400"
                                }`}>
                                {getIconForTipoUnidad(unidad.tipo)}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-lg font-bold text-white" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                                    {unidad.descripcion}
                                  </CardTitle>
                                  {ahorro > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold">
                                      <TrendingDown className="w-3.5 h-3.5" />
                                      -{porcentajeDesc.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[#92a4c8]">
                                  <span className="font-medium">{unidad.tipo}</span>
                                  <span className="w-1 h-1 rounded-full bg-[#92a4c8]/30"></span>
                                  <span>Sector {unidad.sector}</span>
                                  <span className="w-1 h-1 rounded-full bg-[#92a4c8]/30"></span>
                                  <span className="text-amber-400 font-semibold">{unidad.etapa}</span>
                                </div>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className="border-[#334366] text-white bg-[#0f131a] px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                            >
                              {unidad.proyecto}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 gap-4">
                            {/* Fila superior: Precios principales */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Precio Lista */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-white uppercase tracking-wider">
                                  PRECIO DE LISTA
                                </Label>
                                <CurrencyInput
                                  id={`precioLista-${index}`}
                                  value={unidad.precioLista}
                                  onChange={() => { }}
                                  prefix="USD "
                                  className="pl-16 bg-[#0f131a] border-[#334366] h-11 text-base font-bold text-slate-400 disabled:opacity-100 disabled:cursor-not-allowed rounded-lg"
                                  disabled
                                />
                              </div>

                              {/* Precio Negociado - Destacado */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                  PRECIO NEGOCIADO
                                  {unidad.tipoDescuento === "importe" && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                      EDITABLE
                                    </span>
                                  )}
                                </Label>
                                <CurrencyInput
                                  id={`precioNegociado-${index}`}
                                  value={unidad.precioNegociado}
                                  onChange={(value) => handlePrecioNegociadoChange(index, value.toString())}
                                  prefix="USD "
                                  className={`pl-16 bg-[#0f131a] border-2 border-amber-500/40 h-11 text-base font-black text-amber-400 rounded-lg hover:border-amber-500/60 transition-colors ${unidad.tipoDescuento === "importe" ? "" : "disabled:opacity-100"
                                    }`}
                                  disabled={unidad.tipoDescuento !== "importe"}
                                />
                                {ahorro > 0 && (
                                  <p className="text-xs text-green-400 font-bold flex items-center gap-1.5">
                                    <TrendingDown className="w-3 h-3" />
                                    Ahorro: USD {ahorro.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Fila inferior: Controles de descuento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#334366]">
                              {/* Tipo de Descuento */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-white uppercase tracking-wider">
                                  TIPO DE DESCUENTO
                                </Label>
                                <Select
                                  value={unidad.tipoDescuento}
                                  onValueChange={(value: TipoDescuento) => handleTipoDescuentoChange(index, value)}
                                >
                                  <SelectTrigger className="h-10 text-sm bg-[#0f131a] border-[#334366] text-white hover:bg-[#1a2233] transition-colors rounded-lg">
                                    <SelectValue placeholder="Seleccione tipo" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                                    <SelectItem value="ninguno" className="focus:bg-primary/20 focus:text-white">Sin descuento</SelectItem>
                                    <SelectItem value="porcentaje" className="focus:bg-primary/20 focus:text-white">Porcentaje %</SelectItem>
                                    <SelectItem value="importe" className="focus:bg-primary/20 focus:text-white">Importe Fijo $</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Valor Descuento (Condicional) */}
                              <AnimatePresence mode="wait">
                                {unidad.tipoDescuento === "porcentaje" && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3"
                                  >
                                    <Label className="text-xs font-semibold text-white uppercase tracking-wider">
                                      {unidad.tipoDescuento === "porcentaje" ? "% DESCUENTO" : "$ DESCUENTO"}
                                    </Label>
                                    <div className="relative">
                                      {unidad.tipoDescuento === "porcentaje" ? (
                                        <>
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 z-10" />
                                          <Input
                                            id={`valorDescuento-${index}`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={unidad.valorDescuento || ""}
                                            onChange={(e) => handleValorDescuentoChange(index, e.target.value)}
                                            className="pl-10 h-10 text-base font-bold bg-[#0f131a] border-[#334366] text-white focus:border-amber-500/50 rounded-lg"
                                            placeholder="0.00"
                                            onWheel={(e) => e.currentTarget.blur()}
                                          />
                                        </>
                                      ) : (
                                        <CurrencyInput
                                          id={`valorDescuento-${index}`}
                                          value={unidad.valorDescuento}
                                          onChange={(value) => handleValorDescuentoChange(index, value.toString())}
                                          prefix="USD "
                                          min={0}
                                          className="h-12 text-base font-bold border-[#334366] text-slate-400 bg-[#0f131a] rounded-lg"
                                          disabled
                                        />
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Info tip */}
            <div className="rounded-xl bg-blue-500/5 border-2 border-blue-500/20 p-6 text-sm text-slate-300 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-300 mb-2 text-base">💡 Consejo Profesional</p>
                <p className="text-[#92a4c8] leading-relaxed">
                  Configure los descuentos por <span className="text-white font-semibold">porcentaje</span> o <span className="text-white font-semibold">importe fijo</span>. Si elige descuento por importe, podrá editar directamente el precio negociado final.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
