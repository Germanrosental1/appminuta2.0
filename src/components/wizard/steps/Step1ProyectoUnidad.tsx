import React, { useState, useEffect } from "react";
import { useWizard } from "@/context/WizardContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateStep } from "@/utils/validation";
import { getProyectosActivos, Proyecto } from "@/services/proyectos";
import {
  getProyectosDisponibles,
  getUnidadesPorProyecto,
  getUnidadesPorSector,
  getSectoresProyecto,
  UnidadResumen,
  getNaturalezasProyecto,
  getProyectosPorNaturaleza,
  getEtapasPorProyecto,
  getTiposPorProyectoYEtapa,
  getTiposPorProyecto,
  getSectoresPorProyectoYTipo,
  getSectoresPorProyectoEtapaYTipo,
  getUnidadesPorTipoYSector,
  getUnidadesPorEtapaTipoYSector
} from "@/services/unidades";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, Trash, Building, Car, Package, Store, Warehouse, Pencil } from "lucide-react";
import { UnidadSeleccionada, TipoUnidad } from "@/types/wizard";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Step1ProyectoUnidad: React.FC = () => {
  const { data, setData } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estados para los filtros
  const [naturalezas, setNaturalezas] = useState<string[]>([]);
  const [proyectos, setProyectos] = useState<string[]>([]);
  const [etapas, setEtapas] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [sectores, setSectores] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<UnidadResumen[]>([]);

  // Estados para las selecciones
  const [naturalezaSeleccionada, setNaturalezaSeleccionada] = useState<string>('');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('');
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string>('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('');

  // Estados de carga
  const [loadingNaturalezas, setLoadingNaturalezas] = useState(false);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [loadingEtapas, setLoadingEtapas] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  const [mostrarPorSector, setMostrarPorSector] = useState<boolean>(true);

  // Estados para la selección múltiple de unidades
  const [tipoUnidadSeleccionado, setTipoUnidadSeleccionado] = useState<TipoUnidad>("Departamento");
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<UnidadSeleccionada[]>(data.unidades || []);
  const [unidadActual, setUnidadActual] = useState<UnidadSeleccionada | null>(null);
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [indiceEdicion, setIndiceEdicion] = useState<number>(-1);
  const [unidadEditando, setUnidadEditando] = useState<number>(-1);
  const [mostrarFormularioUnidad, setMostrarFormularioUnidad] = useState<boolean>(false);

  // Cargar naturalezas de proyecto al montar el componente
  useEffect(() => {
    const fetchNaturalezas = async () => {
      setLoadingNaturalezas(true);
      try {
        const naturalezasDisponibles = await getNaturalezasProyecto();
        setNaturalezas(naturalezasDisponibles);
        // console.log('Naturalezas disponibles:', naturalezasDisponibles);
      } catch (error) {
        console.error('Error al cargar naturalezas:', error);
      } finally {
        setLoadingNaturalezas(false);
      }
    };

    fetchNaturalezas();
  }, []);

  // Cargar proyectos cuando cambia la naturaleza seleccionada
  useEffect(() => {
    if (!naturalezaSeleccionada) {
      setProyectos([]);
      return;
    }

    const fetchProyectos = async () => {
      setLoadingProyectos(true);
      try {
        const proyectosDisponibles = await getProyectosPorNaturaleza(naturalezaSeleccionada);
        setProyectos(proyectosDisponibles);
        // console.log('Proyectos disponibles para naturaleza:', proyectosDisponibles);

        // Limpiar selecciones posteriores
        setProyectoSeleccionado('');
        setEtapaSeleccionada('');
        setTipoSeleccionado('');
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
        setEtapas([]);
        setTipos([]);
        setSectores([]);
        setUnidades([]);
      } catch (error) {
        console.error('Error al cargar proyectos:', error);
      } finally {
        setLoadingProyectos(false);
      }
    };

    fetchProyectos();
  }, [naturalezaSeleccionada]);

  // Cargar etapas cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (!proyectoSeleccionado) {
      setEtapas([]);
      return;
    }

    const fetchEtapas = async () => {
      setLoadingEtapas(true);
      try {
        const etapasDisponibles = await getEtapasPorProyecto(proyectoSeleccionado);
        setEtapas(etapasDisponibles);
        // console.log('Etapas disponibles para proyecto:', etapasDisponibles);

        // Limpiar selecciones posteriores
        setEtapaSeleccionada('');
        setTipoSeleccionado('');
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
        setTipos([]);
        setSectores([]);
        setUnidades([]);

        // Actualizar el proyecto en el contexto del wizard
        setData({ proyecto: proyectoSeleccionado });
      } catch (error) {
        console.error('Error al cargar etapas:', error);
      } finally {
        setLoadingEtapas(false);
      }
    };

    fetchEtapas();
  }, [proyectoSeleccionado]);

  // Cargar tipos cuando cambia la etapa seleccionada
  useEffect(() => {
    if (!proyectoSeleccionado || !etapaSeleccionada) {
      setTipos([]);
      return;
    }

    const fetchTipos = async () => {
      setLoadingTipos(true);
      try {
        const tiposDisponibles = await getTiposPorProyectoYEtapa(proyectoSeleccionado, etapaSeleccionada);
        setTipos(tiposDisponibles);
        // console.log('Tipos disponibles para proyecto y etapa:', tiposDisponibles);

        // Limpiar selecciones posteriores
        setTipoSeleccionado('');
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
        setSectores([]);
        setUnidades([]);
      } catch (error) {
        console.error('Error al cargar tipos:', error);
      } finally {
        setLoadingTipos(false);
      }
    };

    fetchTipos();
  }, [proyectoSeleccionado, etapaSeleccionada]);

  // Cargar sectores cuando cambia el tipo seleccionado
  useEffect(() => {
    if (!proyectoSeleccionado || !etapaSeleccionada || !tipoSeleccionado) {
      setSectores([]);
      return;
    }

    const fetchSectores = async () => {
      setLoadingSectores(true);
      try {
        const sectoresDisponibles = await getSectoresPorProyectoEtapaYTipo(proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado);
        setSectores(sectoresDisponibles);
        // console.log('Sectores disponibles para proyecto, etapa y tipo:', sectoresDisponibles);

        // Limpiar selecciones posteriores
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
        setUnidades([]);
      } catch (error) {
        console.error('Error al cargar sectores:', error);
      } finally {
        setLoadingSectores(false);
      }
    };

    fetchSectores();
  }, [proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado]);

  // Cargar unidades cuando se selecciona un sector
  useEffect(() => {
    if (!proyectoSeleccionado || !etapaSeleccionada || !tipoSeleccionado || !sectorSeleccionado) {
      setUnidades([]);
      return;
    }

    const fetchUnidades = async () => {
      setLoadingUnidades(true);
      try {
        // console.log(`Obteniendo unidades del sector ${sectorSeleccionado}...`);
        const unidadesDisponibles = await getUnidadesPorEtapaTipoYSector(proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado, sectorSeleccionado);
        // console.log('Unidades obtenidas:', unidadesDisponibles);
        setUnidades(unidadesDisponibles);

        // Limpiar selección de unidad
        setUnidadSeleccionada('');
      } catch (error) {
        console.error(`Error al cargar unidades:`, error);
      } finally {
        setLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado, sectorSeleccionado]);

  const handleChange = (field: string, value: string) => {
    setData({ [field]: value });
    clearAllErrors();
  };

  const handleBlur = () => {
    const validation = validateStep(0, data);
    if (!validation.valid) {
      setErrors(validation.errors);
    }
  };

  // Limpiar todos los errores
  const clearAllErrors = () => {
    setErrors({});
  };

  // Manejadores de cambios para los filtros
  const handleNaturalezaChange = (naturaleza: string) => {
    setNaturalezaSeleccionada(naturaleza);
    clearAllErrors();
  };

  const handleProyectoChange = (proyecto: string) => {
    setProyectoSeleccionado(proyecto);
    clearAllErrors();
  };

  const handleEtapaChange = (etapa: string) => {
    setEtapaSeleccionada(etapa);
    clearAllErrors();
  };

  const handleTipoChange = (tipo: string) => {
    setTipoSeleccionado(tipo);
    clearAllErrors();
  };

  const handleSectorChange = (sector: string) => {
    setSectorSeleccionado(sector);
    clearAllErrors();
  };

  // Manejar cambio de unidad en el selector
  const handleUnidadChange = (unidadId: string) => {
    setUnidadSeleccionada(unidadId);

    // Buscar la unidad seleccionada para obtener su descripción y precio
    const unidad = unidades.find(u => u.id.toString() === unidadId);
    if (unidad) {
      // Actualizar la unidad actual (para el formulario de agregar unidad)
      setUnidadActual({
        id: unidadId,
        tipo: tipoUnidadSeleccionado,
        descripcion: unidad.descripcion,
        proyecto: proyectoSeleccionado,
        etapa: etapaSeleccionada,
        sector: sectorSeleccionado,
        precioLista: unidad.precioUSD || 0,
        precioNegociado: unidad.precioUSD || 0,
        tipoDescuento: "ninguno",
        valorDescuento: 0,
        naturaleza: naturalezaSeleccionada
      });

      // Para mantener compatibilidad con código existente
      setData({
        unidad: unidadId,
        unidadDescripcion: unidad.descripcion,
        precioLista: unidad.precioUSD || 0,
        precioNegociado: unidad.precioUSD || 0
      });

      // console.log(`Unidad seleccionada: ${unidad.descripcion}...`);
      clearAllErrors();
    }
  };

  // Mostrar formulario para agregar una unidad
  const mostrarFormulario = (tipo: TipoUnidad) => {
    setTipoUnidadSeleccionado(tipo);
    setMostrarFormularioUnidad(true);
    setModoEdicion(false);
    setIndiceEdicion(-1);

    // Resetear selecciones
    setNaturalezaSeleccionada('');
    setProyectoSeleccionado('');
    setEtapaSeleccionada('');
    setTipoSeleccionado('');
    setSectorSeleccionado('');
    setUnidadSeleccionada('');
    setUnidadActual(null);
  };

  // Cancelar la adición de unidad
  const cancelarAgregarUnidad = () => {
    setMostrarFormularioUnidad(false);
    setModoEdicion(false);
    setIndiceEdicion(-1);
  };

  // Agregar una unidad a la lista de unidades seleccionadas
  const agregarUnidad = () => {
    if (!unidadActual) return;

    // Verificar si ya existe una unidad con el mismo ID
    const existeUnidad = unidadesSeleccionadas.some(u => u.id === unidadActual.id);
    if (existeUnidad) {
      setErrors({ ...errors, unidadExistente: "Esta unidad ya ha sido agregada" });
      return;
    }

    let nuevasUnidades: UnidadSeleccionada[];

    if (modoEdicion && indiceEdicion >= 0) {
      // Modo edición: actualizar unidad existente
      nuevasUnidades = [...unidadesSeleccionadas];
      nuevasUnidades[indiceEdicion] = unidadActual;
    } else {
      // Modo agregar: añadir nueva unidad
      nuevasUnidades = [...unidadesSeleccionadas, unidadActual];
    }

    // Actualizar estado local y contexto del wizard
    setUnidadesSeleccionadas(nuevasUnidades);
    setData({ unidades: nuevasUnidades });

    // Resetear formulario
    setMostrarFormularioUnidad(false);
    setModoEdicion(false);
    setIndiceEdicion(-1);
    setUnidadActual(null);
    clearAllErrors();
  };

  // Editar una unidad existente
  const editarUnidad = (indice: number) => {
    const unidad = unidadesSeleccionadas[indice];

    // Establecer modo edición
    setModoEdicion(true);
    setIndiceEdicion(indice);
    setUnidadActual(unidad);
    setMostrarFormularioUnidad(true);
    setTipoUnidadSeleccionado(unidad.tipo);

    // Cargar los valores de la unidad en los selectores
    setNaturalezaSeleccionada(unidad.naturaleza);
    setProyectoSeleccionado(unidad.proyecto);
    setEtapaSeleccionada(unidad.etapa);
    setTipoSeleccionado(unidad.tipo);
    setSectorSeleccionado(unidad.sector);
    setUnidadSeleccionada(unidad.id);
  };

  // Eliminar una unidad
  const eliminarUnidad = (indice: number) => {
    const nuevasUnidades = [...unidadesSeleccionadas];
    nuevasUnidades.splice(indice, 1);

    setUnidadesSeleccionadas(nuevasUnidades);
    setData({ unidades: nuevasUnidades });
  };

  // Toggle entre mostrar por sector o todas las unidades
  const toggleMostrarPorSector = () => {
    setMostrarPorSector(!mostrarPorSector);
    setSectorSeleccionado('');
    setUnidadSeleccionada('');
    setUnidades([]);
  };

  // Validar datos al intentar avanzar al siguiente paso
  const validateData = () => {
    const newErrors: Record<string, string> = {};

    // Verificar que haya al menos una unidad seleccionada
    if (unidadesSeleccionadas.length === 0) {
      newErrors.unidades = "Debe agregar al menos una unidad";
    }

    if (!data.fechaPosesion) {
      newErrors.fechaPosesion = "La fecha de posesión es requerida";
    }

    // Si está en modo de agregar unidad, verificar que se hayan completado todos los campos
    if (mostrarFormularioUnidad) {
      if (!naturalezaSeleccionada) {
        newErrors.naturaleza = "Debe seleccionar una naturaleza de proyecto";
      }

      if (!proyectoSeleccionado) {
        newErrors.proyecto = "Debe seleccionar un proyecto";
      }

      if (!etapaSeleccionada) {
        newErrors.etapa = "Debe seleccionar una etapa";
      }

      if (!tipoSeleccionado) {
        newErrors.tipo = "Debe seleccionar un tipo";
      }

      if (!sectorSeleccionado) {
        newErrors.sector = "Debe seleccionar un sector";
      }

      if (!unidadSeleccionada) {
        newErrors.unidad = "Debe seleccionar una unidad";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar campos en tiempo real
  useEffect(() => {
    validateData();
  }, [naturalezaSeleccionada, proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado, sectorSeleccionado, unidadSeleccionada, unidadesSeleccionadas, data.fechaPosesion, mostrarFormularioUnidad]);

  // Función para obtener el icono según el tipo de unidad
  const getIconForTipoUnidad = (tipo: TipoUnidad) => {
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
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Departamento">Departamento</SelectItem>
                <SelectItem value="Cochera">Cochera</SelectItem>
                <SelectItem value="Baulera">Baulera</SelectItem>
                <SelectItem value="Local">Local</SelectItem>
                <SelectItem value="Nave">Nave</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => mostrarFormulario(tipoUnidadSeleccionado)}
              className="flex items-center gap-1"
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
                <Card key={index} className="mb-3">
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
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {modoEdicion ? "Editar" : "Agregar"} {tipoUnidadSeleccionado}
              </CardTitle>
              <Badge variant="outline">{tipoUnidadSeleccionado}</Badge>
            </div>
            <CardDescription>
              Complete los datos para {modoEdicion ? "actualizar" : "agregar"} esta unidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de Naturaleza */}
            <div className="space-y-2">
              <Label htmlFor="naturaleza">
                Naturaleza del Proyecto <span className="text-destructive">*</span>
              </Label>
              <Select value={naturalezaSeleccionada} onValueChange={handleNaturalezaChange}>
                <SelectTrigger id="naturaleza" className={errors.naturaleza ? "border-destructive" : ""}>
                  {loadingNaturalezas ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Cargando naturalezas...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Seleccione una naturaleza" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {naturalezas.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No hay naturalezas disponibles
                    </div>
                  ) : (
                    naturalezas.map((naturaleza) => (
                      <SelectItem key={naturaleza} value={naturaleza}>
                        {naturaleza}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.naturaleza && <p className="text-sm text-destructive">{errors.naturaleza}</p>}
            </div>

            {/* Selector de Proyecto */}
            {naturalezaSeleccionada && (
              <div className="space-y-2">
                <Label htmlFor="proyecto">
                  Proyecto <span className="text-destructive">*</span>
                </Label>
                <Select value={proyectoSeleccionado} onValueChange={handleProyectoChange}>
                  <SelectTrigger id="proyecto" className={errors.proyecto ? "border-destructive" : ""}>
                    {loadingProyectos ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Cargando proyectos...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Seleccione un proyecto" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay proyectos disponibles
                      </div>
                    ) : (
                      proyectos.map((proyecto) => (
                        <SelectItem key={proyecto} value={proyecto}>
                          {proyecto}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.proyecto && <p className="text-sm text-destructive">{errors.proyecto}</p>}
              </div>
            )}

            {/* Selector de Etapa */}
            {proyectoSeleccionado && (
              <div className="space-y-2">
                <Label htmlFor="etapa">
                  Etapa <span className="text-destructive">*</span>
                </Label>
                <Select value={etapaSeleccionada} onValueChange={handleEtapaChange}>
                  <SelectTrigger id="etapa" className={errors.etapa ? "border-destructive" : ""}>
                    {loadingEtapas ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Cargando etapas...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Seleccione una etapa" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay etapas disponibles
                      </div>
                    ) : (
                      etapas.map((etapa) => (
                        <SelectItem key={etapa} value={etapa}>
                          {etapa}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.etapa && <p className="text-sm text-destructive">{errors.etapa}</p>}
              </div>
            )}

            {/* Selector de Tipo */}
            {etapaSeleccionada && (
              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-destructive">*</span>
                </Label>
                <Select value={tipoSeleccionado} onValueChange={handleTipoChange}>
                  <SelectTrigger id="tipo" className={errors.tipo ? "border-destructive" : ""}>
                    {loadingTipos ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Cargando tipos...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Seleccione un tipo" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay tipos disponibles
                      </div>
                    ) : (
                      tipos.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
              </div>
            )}

            {/* Selector de Sector */}
            {tipoSeleccionado && etapaSeleccionada && (
              <div className="space-y-2">
                <Label htmlFor="sector">
                  Sector <span className="text-destructive">*</span>
                </Label>
                <Select value={sectorSeleccionado} onValueChange={handleSectorChange}>
                  <SelectTrigger id="sector" className={errors.sector ? "border-destructive" : ""}>
                    {loadingSectores ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Cargando sectores...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Seleccione un sector" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {sectores.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay sectores disponibles
                      </div>
                    ) : (
                      sectores.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.sector && <p className="text-sm text-destructive">{errors.sector}</p>}
              </div>
            )}

            {/* Selector de Unidad */}
            {sectorSeleccionado && (
              <div className="space-y-2">
                <Label htmlFor="unidad">
                  Unidad <span className="text-destructive">*</span>
                </Label>
                <Select value={unidadSeleccionada} onValueChange={handleUnidadChange}>
                  <SelectTrigger id="unidad" className={errors.unidad ? "border-destructive" : ""}>
                    {loadingUnidades ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Cargando unidades...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Seleccione una unidad" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay unidades disponibles
                      </div>
                    ) : (
                      unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={unidad.id.toString()}>
                          {unidad.descripcion}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.unidad && <p className="text-sm text-destructive">{errors.unidad}</p>}
                {errors.unidadExistente && <p className="text-sm text-destructive">{errors.unidadExistente}</p>}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelarAgregarUnidad}>
              Cancelar
            </Button>
            <Button
              onClick={agregarUnidad}
              disabled={!unidadActual || !unidadSeleccionada}
            >
              {modoEdicion ? "Actualizar" : "Agregar"} Unidad
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="fechaPosesion">
          Fecha de Posesión <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fechaPosesion"
          type="date"
          value={data.fechaPosesion}
          onChange={(e) => handleChange("fechaPosesion", e.target.value)}
          onBlur={handleBlur}
          className={errors.fechaPosesion ? "border-destructive" : ""}
        />
        {errors.fechaPosesion && <p className="text-sm text-destructive">{errors.fechaPosesion}</p>}
      </div>

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Seleccione el tipo de unidad que desea agregar y complete los datos requeridos. Puede agregar múltiples unidades de diferentes tipos para incluirlas en la negociación.</p>
      </div>
    </div>
  );
};
