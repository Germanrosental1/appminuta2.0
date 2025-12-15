import React, { useState } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, Building, Car, Package, Store, Warehouse, Pencil } from "lucide-react";
import { UnidadSeleccionada, TipoUnidad } from "@/types/wizard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnidadFilters } from "@/hooks/useUnidadFilters";
import { useTiposDisponibles } from "@/hooks/useUnidades";
import { UnidadFormulario } from "./UnidadFormulario";

export const Step1ProyectoUnidad: React.FC = () => {
  const { data, updateData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom hook para manejar filtros en cascada
  const filters = useUnidadFilters();

  // Load tipos from database
  const { data: tiposDisponibles = [], isLoading: loadingTipos } = useTiposDisponibles();

  // Estados para la selección múltiple de unidades
  const [tipoUnidadSeleccionado, setTipoUnidadSeleccionado] = useState<TipoUnidad>("Departamento");
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<UnidadSeleccionada[]>(data.unidades || []);
  const [unidadActual, setUnidadActual] = useState<UnidadSeleccionada | null>(null);
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [indiceEdicion, setIndiceEdicion] = useState<number>(-1);
  const [mostrarFormularioUnidad, setMostrarFormularioUnidad] = useState<boolean>(false);

  const clearAllErrors = () => setErrors({});

  const handleProyectoChange = (value: string) => {
    filters.setProyectoSeleccionado(value);
    updateData({ proyecto: value });
    clearAllErrors();
  };

  const handleUnidadChange = (unidadId: string) => {
    filters.setUnidadSeleccionada(unidadId);

    const unidad = filters.unidades.find(u => u.id.toString() === unidadId);
    if (unidad) {
      setUnidadActual({
        id: unidadId,
        tipo: tipoUnidadSeleccionado,
        descripcion: unidad.descripcion,
        proyecto: filters.proyectoSeleccionado,
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

  const mostrarFormulario = (tipo: TipoUnidad) => {
    setTipoUnidadSeleccionado(tipo);
    setMostrarFormularioUnidad(true);
    setModoEdicion(false);
    setIndiceEdicion(-1);

    // Pre-select tipo in filters for type-first flow
    filters.resetFilters();
    filters.setTipoSeleccionado(tipo);

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

  const getIconForTipoUnidad = (tipo: TipoUnidad) => {
    const icons = {
      Departamento: <Building className="w-5 h-5" />,
      Cochera: <Car className="w-5 h-5" />,
      Baulera: <Package className="w-5 h-5" />,
      Local: <Store className="w-5 h-5" />,
      Nave: <Warehouse className="w-5 h-5" />
    };
    return icons[tipo] || <Building className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Lista de unidades seleccionadas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Unidades Seleccionadas</h2>
          <div className="flex items-center gap-2">
            <Select
              value={tipoUnidadSeleccionado}
              onValueChange={(value: TipoUnidad) => setTipoUnidadSeleccionado(value)}
              disabled={loadingTipos || mostrarFormularioUnidad}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={loadingTipos ? "Cargando..." : "Tipo de unidad"} />
              </SelectTrigger>
              <SelectContent>
                {tiposDisponibles.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => mostrarFormulario(tipoUnidadSeleccionado)}
              className="flex items-center gap-1"
              disabled={mostrarFormularioUnidad}
            >
              <Plus className="w-4 h-4" />
              {getIconForTipoUnidad(tipoUnidadSeleccionado)}
              Agregar Unidad
            </Button>
          </div>
        </div>

        {unidadesSeleccionadas.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <Building className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No hay unidades agregadas</p>
            <p className="text-sm text-muted-foreground mt-2">Seleccione un tipo de unidad y haga clic en "Agregar Unidad"</p>
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
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Proyecto:</span> {unidad.proyecto}
                      </div>
                      <div>
                        <span className="font-medium">Etapa:</span> {unidad.etapa}
                      </div>
                      <div>
                        <span className="font-medium">Sector:</span> {unidad.sector}
                      </div>
                      <div>
                        <span className="font-medium">Precio Lista:</span> ${unidad.precioLista.toLocaleString()}
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
          proyectos={filters.proyectos}
          etapas={filters.etapas}
          sectores={filters.sectores}
          unidades={filters.unidades}
          proyectoSeleccionado={filters.proyectoSeleccionado}
          etapaSeleccionada={filters.etapaSeleccionada}
          sectorSeleccionado={filters.sectorSeleccionado}
          unidadSeleccionada={filters.unidadSeleccionada}
          loadingProyectos={filters.loadingProyectos}
          loadingEtapas={filters.loadingEtapas}
          loadingSectores={filters.loadingSectores}
          loadingUnidades={filters.loadingUnidades}
          onProyectoChange={handleProyectoChange}
          onEtapaChange={(value) => filters.setEtapaSeleccionada(value)}
          onSectorChange={(value) => filters.setSectorSeleccionado(value)}
          onUnidadChange={handleUnidadChange}
          tipoUnidad={tipoUnidadSeleccionado}
          modoEdicion={modoEdicion}
          errors={errors}
          onAgregar={agregarUnidad}
          onCancelar={cancelarAgregarUnidad}
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
