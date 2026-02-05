import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, Building, Car, Package, Store, Warehouse, Pencil, Lock, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { UnidadSeleccionada, TipoUnidad } from "@/types/wizard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnidadFilters } from "@/hooks/useUnidadFilters";
import { useProyectos, useTipos, useEtapas } from "@/hooks/useUnidades";
import { UnidadFormulario } from "./UnidadFormulario";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Step1ProyectoUnidad: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom hook para manejar filtros en cascada
  const filters = useUnidadFilters();

  // Cargar proyectos disponibles con metadata completa
  const [proyectosFull, setProyectosFull] = useState<any[]>([]);
  const { data: proyectosDisponibles = [], isLoading: loadingProyectos } = useProyectos();

  // Fetch full projects data to get IVA
  useEffect(() => {
    import("@/services/proyectos").then(({ getProyectosActivos }) => {
      getProyectosActivos().then(proyectos => {
        setProyectosFull(proyectos);
      });
    });
  }, []);

  // Estado para el proyecto seleccionado a nivel global
  const [proyectoGlobal, setProyectoGlobal] = useState<string>(data.proyecto || "");

  // Cargar tipos disponibles para el proyecto seleccionado
  const { data: tiposDelProyecto = [], isLoading: loadingTipos } = useTipos(proyectoGlobal);

  // Cargar etapas del proyecto global (para el formulario)
  const { data: etapasProyecto = [] } = useEtapas(proyectoGlobal);

  // Estados para la selección múltiple de unidades
  const [tipoUnidadSeleccionado, setTipoUnidadSeleccionado] = useState<string>("");
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<UnidadSeleccionada[]>(data.unidades || []);
  const [unidadActual, setUnidadActual] = useState<UnidadSeleccionada | null>(null);
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [indiceEdicion, setIndiceEdicion] = useState<number>(-1);
  const [mostrarFormularioUnidad, setMostrarFormularioUnidad] = useState<boolean>(false);

  // Determinar si el proyecto está bloqueado (hay unidades agregadas)
  const proyectoBloqueado = unidadesSeleccionadas.length > 0;

  // Actualizar tipo seleccionado cuando cambian los tipos disponibles
  useEffect(() => {
    if (tiposDelProyecto.length > 0 && !tipoUnidadSeleccionado) {
      setTipoUnidadSeleccionado(tiposDelProyecto[0]);
    }
  }, [tiposDelProyecto, tipoUnidadSeleccionado]);

  const clearAllErrors = () => setErrors({});

  const handleProyectoGlobalChange = (value: string) => {
    setProyectoGlobal(value);

    // Find project and set IVA status
    const selectedProject = proyectosFull.find(p => p.Nombre === value);
    const ivaStatus = selectedProject?.Iva || "incluido";

    updateData({
      proyecto: value,
      ivaProyecto: ivaStatus
    });
    // Resetear tipo cuando cambia el proyecto
    setTipoUnidadSeleccionado("");
    clearAllErrors();
  };

  const handleUnidadChange = (unidadId: string) => {
    filters.setUnidadSeleccionada(unidadId);

    const unidad = filters.unidades.find(u => u.id.toString() === unidadId);
    if (unidad) {
      setUnidadActual({
        id: unidadId,
        tipo: tipoUnidadSeleccionado as TipoUnidad,
        descripcion: unidad.descripcion,
        proyecto: proyectoGlobal,
        etapa: filters.etapaSeleccionada,
        sector: filters.sectorSeleccionado,
        precioLista: unidad.precioUSD || 0,
        precioNegociado: unidad.precioUSD || 0,
        tipoDescuento: "ninguno",
        valorDescuento: 0,
        m2: unidad.metrosTotales || 0,
      });

      updateData({
        unidad: unidadId,
        unidadDescripcion: unidad.descripcion,
        precioLista: unidad.precioUSD || 0,
        precioNegociado: unidad.precioUSD || 0
      });

      clearAllErrors();
    }
  };

  const mostrarFormulario = () => {
    if (!proyectoGlobal) {
      setErrors({ proyecto: "Seleccione un proyecto primero" });
      return;
    }
    if (!tipoUnidadSeleccionado) {
      setErrors({ tipo: "Seleccione un tipo de unidad" });
      return;
    }

    setMostrarFormularioUnidad(true);
    setModoEdicion(false);
    setIndiceEdicion(-1);

    // Pre-seleccionar proyecto y tipo en los filtros SIN cascade reset
    filters.setAllFilters({
      tipo: tipoUnidadSeleccionado,
      proyecto: proyectoGlobal,
      etapa: '',
      sector: '',
      unidad: ''
    });

    setUnidadActual(null);
  };

  const cancelarAgregarUnidad = () => {
    setMostrarFormularioUnidad(false);
    setModoEdicion(false);
    setIndiceEdicion(-1);
  };

  const agregarUnidad = () => {
    if (!unidadActual) return;

    const existeUnidad = unidadesSeleccionadas.some(u => u.id === unidadActual.id);
    if (existeUnidad && !modoEdicion) {
      setErrors({ ...errors, unidadExistente: "Esta unidad ya ha sido agregada" });
      return;
    }

    let nuevasUnidades: UnidadSeleccionada[];

    if (modoEdicion && indiceEdicion >= 0) {
      nuevasUnidades = [...unidadesSeleccionadas];
      nuevasUnidades[indiceEdicion] = unidadActual;
    } else {
      nuevasUnidades = [...unidadesSeleccionadas, unidadActual];
    }

    setUnidadesSeleccionadas(nuevasUnidades);
    updateData({ unidades: nuevasUnidades });

    setMostrarFormularioUnidad(false);
    setModoEdicion(false);
    setIndiceEdicion(-1);
    setUnidadActual(null);
    clearAllErrors();
  };

  const editarUnidad = (indice: number) => {
    const unidad = unidadesSeleccionadas[indice];

    setModoEdicion(true);
    setIndiceEdicion(indice);
    setUnidadActual(unidad);
    setMostrarFormularioUnidad(true);
    setTipoUnidadSeleccionado(unidad.tipo);

    // Set all filters atomically to prevent cascade resets
    filters.setAllFilters({
      tipo: unidad.tipo,
      proyecto: unidad.proyecto,
      etapa: unidad.etapa,
      sector: unidad.sector,
      unidad: unidad.id
    });
  };

  const eliminarUnidad = (indice: number) => {
    const nuevasUnidades = [...unidadesSeleccionadas];
    nuevasUnidades.splice(indice, 1);

    setUnidadesSeleccionadas(nuevasUnidades);
    updateData({ unidades: nuevasUnidades });
  };

  const getIconForTipoUnidad = (tipo: string) => {
    const icons: Record<string, React.ReactNode> = {
      Departamento: <Building className="w-5 h-5" />,
      Cochera: <Car className="w-5 h-5" />,
      "Cochera Cubierta": <Car className="w-5 h-5" />,
      "Cochera Semicubierta": <Car className="w-5 h-5" />,
      "Cochera Descubierta": <Car className="w-5 h-5" />,
      Baulera: <Package className="w-5 h-5" />,
      Local: <Store className="w-5 h-5" />,
      Nave: <Warehouse className="w-5 h-5" />
    };
    return icons[tipo] || <Building className="w-5 h-5" />;
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Filtros Superiores */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <section className="bg-[#1a2233] border border-[#334366] rounded-xl p-6 shadow-sm flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Proyecto */}
            <div className="flex flex-col gap-2 relative">
              <Label htmlFor="proyectoGlobal" className="text-white text-sm font-semibold tracking-wide flex justify-between">
                PROYECTO
                {proyectoBloqueado && (
                  <span className="text-xs text-yellow-500 flex items-center gap-1 font-normal">
                    <Lock className="w-3 h-3" /> Selección bloqueada
                  </span>
                )}
              </Label>
              <Select
                value={proyectoGlobal}
                onValueChange={handleProyectoGlobalChange}
                disabled={loadingProyectos || mostrarFormularioUnidad || proyectoBloqueado}
              >
                <SelectTrigger id="proyectoGlobal" className="w-full h-12 bg-[#0f131a] border-[#334366] text-white">
                  <SelectValue placeholder={loadingProyectos ? "Cargando..." : "Seleccione proyecto"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                  {proyectosDisponibles.map((proyecto) => (
                    <SelectItem key={proyecto} value={proyecto} className="focus:bg-primary/20 focus:text-white">
                      {proyecto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {proyectoBloqueado && (
                <p className="text-xs text-[#92a4c8]">Para cambiar el proyecto, primero elimine todas las unidades agregadas.</p>
              )}
              {errors.proyecto && <p className="text-sm text-destructive">{errors.proyecto}</p>}
            </div>

            {/* Tipo de Unidad */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tipoUnidad" className="text-white text-sm font-semibold tracking-wide">
                TIPO DE UNIDAD
              </Label>
              <Select
                value={tipoUnidadSeleccionado}
                onValueChange={setTipoUnidadSeleccionado}
                disabled={!proyectoGlobal || loadingTipos}
              >
                <SelectTrigger id="tipoUnidad" className="w-full h-12 bg-[#0f131a] border-[#334366] text-white">
                  <SelectValue placeholder={!proyectoGlobal ? "Seleccione proyecto primero" : "Tipo de unidad"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2233] border-[#334366] text-white">
                  {tiposDelProyecto.map((tipo) => (
                    <SelectItem key={tipo} value={tipo} className="focus:bg-primary/20 focus:text-white">
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
            </div>

            {/* Fecha de Posesión */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="fechaPosesion" className="text-white text-sm font-semibold tracking-wide">
                FECHA DE POSESIÓN
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal bg-[#0f131a] border-[#334366] text-white hover:bg-[#1a2233] hover:text-white",
                      !data.fechaPosesion && "text-muted-foreground",
                      errors.fechaPosesion && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.fechaPosesion ? format(new Date(data.fechaPosesion), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a2233] border-[#334366] text-white" align="start">
                  <Calendar
                    mode="single"
                    selected={data.fechaPosesion ? new Date(data.fechaPosesion) : undefined}
                    onSelect={(date) => updateData({ fechaPosesion: date ? date.toISOString().split('T')[0] : '' })}
                    initialFocus
                    className="bg-[#1a2233] text-white"
                  />
                </PopoverContent>
              </Popover>
              {errors.fechaPosesion && <p className="text-sm text-destructive">{errors.fechaPosesion}</p>}
            </div>

          </div>
        </section>

        {/* Botón Reiniciar (Opcional, visualmente en HTML estaba) */}
        <Button
          variant="outline"
          className="h-12 w-full lg:w-16 lg:h-auto lg:self-stretch flex flex-col items-center justify-center gap-2 rounded-xl bg-[#1a2233] border-[#334366] text-[#92a4c8] hover:text-orange-400 hover:border-orange-400/50 hover:bg-orange-500/5 transition-all shadow-sm group shrink-0"
          title="Limpiar filtros"
          onClick={() => {
            setTipoUnidadSeleccionado("");
            // Reset visual inputs if needed
          }}
        >
          <RefreshCw className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-xs font-medium lg:hidden">Reiniciar Filtros</span>
        </Button>
      </div>

      {/* Lista de Unidades */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-white text-xl font-bold">Unidades Seleccionadas</h3>
            <span className="bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-full">{unidadesSeleccionadas.length}</span>
          </div>
          <Button
            onClick={mostrarFormulario}
            disabled={!proyectoGlobal || !tipoUnidadSeleccionado || mostrarFormularioUnidad}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            <span>Agregar Unidad</span>
          </Button>
        </div>

        <div className="border border-[#334366] rounded-xl bg-[#1a2233] overflow-hidden flex flex-col min-h-[200px]">
          {unidadesSeleccionadas.length === 0 ? (
            !mostrarFormularioUnidad && (
              <div className="flex flex-col items-center justify-center py-16 text-[#92a4c8]">
                <Building className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay unidades agregadas</p>
                <p className="text-sm mt-2">
                  {proyectoGlobal
                    ? "Seleccione un tipo y haga clic en \"Agregar Unidad\""
                    : "Seleccione un proyecto arriba para comenzar"
                  }
                </p>
              </div>
            )
          ) : (
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {unidadesSeleccionadas.map((unidad, index) => {
                let icon = <Building className="w-6 h-6" />;
                let colorClass = "bg-blue-500/10 text-blue-400";

                if (unidad.tipo.includes("Cochera")) {
                  icon = <Car className="w-6 h-6" />;
                  colorClass = "bg-emerald-500/10 text-emerald-400";
                } else if (unidad.tipo.includes("Baulera")) {
                  icon = <Package className="w-6 h-6" />;
                  colorClass = "bg-orange-500/10 text-orange-400";
                }

                return (
                  <div key={index} className="group flex items-center justify-between p-4 rounded-lg bg-[#0f131a] border border-[#334366] hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
                        {icon}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-white font-bold text-base">{unidad.tipo}: {unidad.descripcion}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#92a4c8] mt-1">
                          {unidad.etapa && <span className="flex items-center gap-1">Etapa: {unidad.etapa}</span>}
                          <span className="w-1 h-1 rounded-full bg-[#92a4c8]/30"></span>
                          <span className="flex items-center gap-1">Precio: ${unidad.precioLista.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editarUnidad(index)}
                        className="p-2 rounded-lg hover:bg-[#334366] text-[#92a4c8] hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarUnidad(index)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-[#92a4c8] hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Formulario para agregar unidad */}
      {mostrarFormularioUnidad && (
        <UnidadFormulario
          proyectos={[proyectoGlobal]}
          etapas={filters.etapas}
          unidades={filters.unidades}
          proyectoSeleccionado={proyectoGlobal}
          etapaSeleccionada={filters.etapaSeleccionada}
          unidadSeleccionada={filters.unidadSeleccionada}
          loadingProyectos={false}
          loadingEtapas={filters.loadingEtapas}
          loadingUnidades={filters.loadingUnidades}
          onProyectoChange={() => { }}
          onEtapaChange={(value) => filters.setEtapaSeleccionada(value)}
          onUnidadChange={handleUnidadChange}
          tipoUnidad={tipoUnidadSeleccionado as TipoUnidad}
          modoEdicion={modoEdicion}
          errors={errors}
          onAgregar={agregarUnidad}
          onCancelar={cancelarAgregarUnidad}
          proyectoBloqueado={true}
        />
      )}

      {errors.unidadExistente && (
        <p className="text-sm text-destructive text-center">{errors.unidadExistente}</p>
      )}
    </div>
  );
};
