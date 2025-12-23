import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, Building, Car, Package, Store, Warehouse, Pencil, Lock } from "lucide-react";
import { UnidadSeleccionada, TipoUnidad } from "@/types/wizard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnidadFilters } from "@/hooks/useUnidadFilters";
import { useProyectos, useTipos } from "@/hooks/useUnidades";
import { UnidadFormulario } from "./UnidadFormulario";

export const Step1ProyectoUnidad: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom hook para manejar filtros en cascada
  const filters = useUnidadFilters();

  // Cargar proyectos disponibles
  const { data: proyectosDisponibles = [], isLoading: loadingProyectos } = useProyectos();

  // Estado para el proyecto seleccionado a nivel global
  const [proyectoGlobal, setProyectoGlobal] = useState<string>(data.proyecto || "");

  // Cargar tipos disponibles para el proyecto seleccionado
  const { data: tiposDelProyecto = [], isLoading: loadingTipos } = useTipos(proyectoGlobal);

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
    updateData({ proyecto: value });
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
        valorDescuento: 0
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
    <div className="space-y-6">
      {/* Selección de Proyecto y Tipo - Barra superior */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h2 className="text-xl font-semibold">Seleccione Proyecto y Tipo de Unidad</h2>

        <div className="flex items-center gap-4">
          {/* Dropdown de Proyecto */}
          <div className="flex-1">
            <Label htmlFor="proyectoGlobal" className="flex items-center gap-2">
              Proyecto <span className="text-destructive">*</span>
              {proyectoBloqueado && <Lock className="w-4 h-4 text-muted-foreground" />}
            </Label>
            <Select
              value={proyectoGlobal}
              onValueChange={handleProyectoGlobalChange}
              disabled={loadingProyectos || mostrarFormularioUnidad || proyectoBloqueado}
            >
              <SelectTrigger id="proyectoGlobal" className="w-full">
                <SelectValue placeholder={loadingProyectos ? "Cargando..." : "Seleccione proyecto"} />
              </SelectTrigger>
              <SelectContent>
                {proyectosDisponibles.map((proyecto) => (
                  <SelectItem key={proyecto} value={proyecto}>
                    {proyecto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {proyectoBloqueado && (
              <p className="text-xs text-muted-foreground mt-1">
                Elimine todas las unidades para cambiar de proyecto
              </p>
            )}
            {errors.proyecto && <p className="text-sm text-destructive">{errors.proyecto}</p>}
          </div>

          {/* Dropdown de Tipo de Unidad */}
          <div className="flex-1">
            <Label htmlFor="tipoUnidad">
              Tipo de Unidad <span className="text-destructive">*</span>
            </Label>
            <Select
              value={tipoUnidadSeleccionado}
              onValueChange={setTipoUnidadSeleccionado}
              disabled={!proyectoGlobal || loadingTipos || mostrarFormularioUnidad}
            >
              <SelectTrigger id="tipoUnidad" className="w-full">
                <SelectValue placeholder={
                  !proyectoGlobal
                    ? "Seleccione proyecto primero"
                    : loadingTipos
                      ? "Cargando..."
                      : "Tipo de unidad"
                } />
              </SelectTrigger>
              <SelectContent>
                {tiposDelProyecto.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
          </div>

          {/* Botón Agregar Unidad */}
          <div className="pt-6">
            <Button
              variant="default"
              onClick={mostrarFormulario}
              className="flex items-center gap-2"
              disabled={!proyectoGlobal || !tipoUnidadSeleccionado || mostrarFormularioUnidad}
            >
              <Plus className="w-4 h-4" />
              {tipoUnidadSeleccionado && getIconForTipoUnidad(tipoUnidadSeleccionado)}
              Agregar Unidad
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de unidades seleccionadas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Unidades Seleccionadas ({unidadesSeleccionadas.length})</h3>

        {unidadesSeleccionadas.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <Building className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No hay unidades agregadas</p>
            <p className="text-sm text-muted-foreground mt-2">
              {proyectoGlobal
                ? "Seleccione un tipo y haga clic en \"Agregar Unidad\""
                : "Seleccione un proyecto para comenzar"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ScrollArea className="h-[300px] pr-4">
              {unidadesSeleccionadas.map((unidad, index) => (
                <Card key={unidad.id || index} className="mb-3">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIconForTipoUnidad(unidad.tipo)}
                        <CardTitle className="text-base">
                          {unidad.tipo}: {unidad.descripcion}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editarUnidad(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarUnidad(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Proyecto:</span> {unidad.proyecto}
                      </div>
                      <div>
                        <span className="font-medium">Etapa:</span> {unidad.etapa || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Precio:</span> ${unidad.precioLista.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
            {errors.unidades && <p className="text-sm text-destructive">{errors.unidades}</p>}
          </div>
        )}
      </div>

      {/* Formulario para agregar unidad */}
      {mostrarFormularioUnidad && (
        <UnidadFormulario
          proyectos={[proyectoGlobal]} // Solo el proyecto seleccionado
          etapas={filters.etapas}
          unidades={filters.unidades}
          proyectoSeleccionado={proyectoGlobal}
          etapaSeleccionada={filters.etapaSeleccionada}
          unidadSeleccionada={filters.unidadSeleccionada}
          loadingProyectos={false}
          loadingEtapas={filters.loadingEtapas}
          loadingUnidades={filters.loadingUnidades}
          onProyectoChange={() => { }} // Proyecto bloqueado
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

      {/* Fecha de Posesión */}
      <div className="space-y-2">
        <Label htmlFor="fechaPosesion">
          Fecha de Posesión <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fechaPosesion"
          type="date"
          value={data.fechaPosesion || ''}
          onChange={(e) => updateData({ fechaPosesion: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          className={errors.fechaPosesion ? 'border-destructive' : ''}
        />
        {errors.fechaPosesion && <p className="text-sm text-destructive">{errors.fechaPosesion}</p>}
      </div>

      {errors.unidadExistente && (
        <p className="text-sm text-destructive">{errors.unidadExistente}</p>
      )}
    </div>
  );
};
