import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseService } from '@/services/supabaseService';
import { Unit, EstadoUnidad } from '@/types/supabase-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Loader2, FileSpreadsheet, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { backendAPI } from '@/services/backendAPI';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Animation Variants
const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03, // Fast stagger for enterprise feel
      delayChildren: 0.1
    }
  }
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

import { usePersistentProject } from "@/hooks/usePersistentProject";

export default function UnitsListPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = usePersistentProject('');
  const [projectNaturaleza, setProjectNaturaleza] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Nuevos estados para los filtros
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroDormitorios, setFiltroDormitorios] = useState<string>('all');
  const [filtroPrecioMin, setFiltroPrecioMin] = useState<string>('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const [searchParams] = useSearchParams();

  // Estados disponibles para las unidades
  const estadosDisponibles: EstadoUnidad[] = [
    'Disponible',
    'Reservado',
    'Vendido',
    'No disponible'
  ];
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsList = await supabaseService.getProjects();
        setProjects(projectsList);

        if (projectsList.length > 0 && !selectedProject) {
          setSelectedProject(projectsList[0]);
        }
      } catch (error) {
        toast.error('Error al cargar los proyectos');
      } finally {
        setIsProjectsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Handle URL Params
  useEffect(() => {
    const tipoParam = searchParams.get('tipo');
    const estadoParam = searchParams.get('estado');
    const dormsParam = searchParams.get('dormitorios');

    if (tipoParam) setFiltroTipo(tipoParam);
    if (estadoParam) setFiltroEstado(estadoParam);
    if (dormsParam) setFiltroDormitorios(dormsParam);
  }, [searchParams]);

  // Verificar conexión con Supabase durante el desarrollo - silenciado en producción
  useEffect(() => {
    // Removed debug logging
  }, []);

  useEffect(() => {
    // Evitar carga inicial de "todas las unidades" si todavía estamos determinando
    // si hay proyectos para seleccionar por defecto.
    if (isProjectsLoading) return;

    const loadUnits = async () => {
      try {
        setLoading(true);
        let data: Unit[];

        if (selectedProject && selectedProject !== 'all') {
          data = await supabaseService.getUnitsByProject(selectedProject);

          // Cargar los tipos disponibles para este proyecto
          const tipos = await supabaseService.getUniqueValuesByProject('Tipo', selectedProject);
          setTiposDisponibles(tipos);

          // Obtener la naturaleza del proyecto
          if (data.length > 0) {
            const firstUnit = data[0];
            setProjectNaturaleza(firstUnit.natdelproyecto || 'Sin clasificar');
          }

          // Resetear los filtros cuando cambia el proyecto
          // PERO respetar si vienen de URL params en el montaje inicial
          if (!searchParams.toString()) {
            setFiltroTipo('all');
            setFiltroDormitorios('all');
            setFiltroPrecioMin('');
            setFiltroPrecioMax('');
            setFiltroEstado('all');
          }
        } else {
          // selectedProject es '' o 'all' - cargar todas las unidades
          data = await supabaseService.getAllUnits();
          const tipos = await supabaseService.getUniqueValues('Tipo');
          setTiposDisponibles(tipos);
          setProjectNaturaleza('');
        }

        setUnits(data);
      } catch (error) {
        toast.error('Error al cargar las unidades');
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [selectedProject, isProjectsLoading]); // searchParams not needed here as it simply sets the initial state

  const handleEdit = (unitId: string) => {
    navigate(`/unit/edit/${unitId}`);
  };

  const handleCreate = () => {
    navigate('/unit/create');
  };

  const handleDelete = async (unitId: string) => {
    if (globalThis.confirm('¿Estás seguro de que deseas eliminar esta unidad?')) {
      try {
        await supabaseService.deleteUnit(unitId);
        setUnits(units.filter(unit => unit.id !== unitId));
        toast.success('Unidad eliminada correctamente');
      } catch (error) {
        toast.error('Error al eliminar la unidad');
      }
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroTipo, filtroDormitorios, filtroPrecioMin, filtroPrecioMax, filtroEstado, selectedProject]);

  const filteredUnits = units.filter(unit => {
    // Filtro por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        (unit.numeroUnidad.toLowerCase().includes(searchLower)) ||
        (unit.edificioTorre.toLowerCase().includes(searchLower)) ||
        (unit.piso.toLowerCase().includes(searchLower)) ||
        (unit.estado.toLowerCase().includes(searchLower)) ||
        (unit.clienteInteresado.toLowerCase().includes(searchLower)) ||
        (unit.sectorId.toLowerCase().includes(searchLower))
      );

      if (!matchesSearch) return false;
    }

    // Filtro por tipo
    if (filtroTipo !== 'all' && unit.tipo !== filtroTipo) {
      return false;
    }

    // Filtro por dormitorios (solo si no es naturaleza Naves)
    if (projectNaturaleza !== 'Naves' && filtroDormitorios !== 'all') {
      // Si filtroDormitorios es 'null', buscamos unidades sin dormitorios (como cocheras)
      if (filtroDormitorios === 'null') {
        if (unit.dormitorios !== 0 && unit.dormitorios !== null) return false;
      } else {
        const dormitoriosNum = Number.parseInt(filtroDormitorios);
        if (unit.dormitorios !== dormitoriosNum) return false;
      }
    }

    // Filtro por precio mínimo
    if (filtroPrecioMin && !Number.isNaN(Number.parseFloat(filtroPrecioMin))) {
      const precioMin = Number.parseFloat(filtroPrecioMin);
      if (unit.precioUSD < precioMin) return false;
    }

    // Filtro por precio máximo
    if (filtroPrecioMax && !Number.isNaN(Number.parseFloat(filtroPrecioMax))) {
      const precioMax = Number.parseFloat(filtroPrecioMax);
      if (unit.precioUSD > precioMax) return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'all') {
      if (filtroEstado === 'stock') {
        if (unit.estado !== 'Disponible' && unit.estado !== 'Reservado') return false;
      } else if (unit.estado !== filtroEstado) {
        return false;
      }
    }

    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible':
        return 'bg-green-100 text-green-800';
      case 'Reservado':
        return 'bg-yellow-100 text-yellow-800';
      case 'Vendido':
        return 'bg-red-100 text-red-800';
      case 'No disponible':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <motion.div
        className="container mx-auto p-6"
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mapa de Ventas</h1>
          <div className="flex items-center gap-2">
            {/* Hidden file input for import */}
            <input
              type="file"
              accept=".xlsx,.xls"
              id="import-file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const toastId = toast.loading('Importando unidades...');
                try {
                  const result = await backendAPI.importUnits(file);

                  if (result.errors > 0) {
                    toast.warning(`Importación completada con observaciones. Éxito: ${result.success}, Errores: ${result.errors}`);
                  } else {
                    toast.success(`Se importaron ${result.success} unidades exitosamente.`);
                  }

                  // Reload units to show new data
                  // Quick hack: trigger re-fetch by toggling a state or calling the fetcher if exposed. 
                  // ideally refactor loadUnits to be outside useEffect or use react-query.
                  // For now, refreshing page is safest or we can force a reload.
                  globalThis.location.reload();
                } catch (error: any) {
                  toast.error(error.message || 'Error al importar el archivo');
                } finally {
                  toast.dismiss(toastId);
                  // Reset input
                  e.target.value = '';
                }
              }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={16} /> Nueva Unidad
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreate} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Individual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()} className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Importar Masivo (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <span className="text-sm font-medium mb-1 block">Proyecto</span>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-bold border-b mb-1">
                    Todos
                  </SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-2/3">
              <label htmlFor="search-input" className="text-sm font-medium mb-1 block">Búsqueda</label>
              <Input
                id="search-input"
                placeholder="Buscar por unidad, sector ID, edificio, piso, estado o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/5">
              <span className="text-sm font-medium mb-1 block">Tipo</span>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposDisponibles.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Dormitorios - Solo para naturaleza distinta a Naves */}
            {projectNaturaleza !== 'Naves' && (
              <div className="w-full md:w-1/5">
                <span className="text-sm font-medium mb-1 block">Dormitorios</span>
                <Select value={filtroDormitorios} onValueChange={setFiltroDormitorios}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="null">Sin dormitorios (Cocheras)</SelectItem>
                    <SelectItem value="1">1 Dormitorio</SelectItem>
                    <SelectItem value="2">2 Dormitorios</SelectItem>
                    <SelectItem value="3">3 Dormitorios</SelectItem>
                    <SelectItem value="4">4 Dormitorios</SelectItem>
                    <SelectItem value="5">5+ Dormitorios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-full md:w-1/5">
              <span className="text-sm font-medium mb-1 block">Estado</span>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="stock">Stock (Disp. + Res.)</SelectItem>
                  {estadosDisponibles.map(estado => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-1/5">
              <label htmlFor="precio-min" className="text-sm font-medium mb-1 block">Precio mínimo (USD)</label>
              <Input
                id="precio-min"
                type="number"
                placeholder="Precio mínimo"
                value={filtroPrecioMin}
                onChange={(e) => setFiltroPrecioMin(e.target.value)}
              />
            </div>

            <div className="w-full md:w-1/5">
              <label htmlFor="precio-max" className="text-sm font-medium mb-1 block">Precio máximo (USD)</label>
              <Input
                id="precio-max"
                type="number"
                placeholder="Precio máximo"
                value={filtroPrecioMax}
                onChange={(e) => setFiltroPrecioMax(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando unidades...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Edificio/Torre</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Dormitorios</TableHead>
                    <TableHead className="text-right">M² Totales</TableHead>
                    <TableHead className="text-right">Precio USD</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode='wait'>
                    {paginatedUnits.length === 0 ? (
                      <motion.tr
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <TableCell colSpan={10} className="text-center py-4">
                          No se encontraron unidades
                        </TableCell>
                      </motion.tr>
                    ) : (
                      // We use a fragment to allow motion components inside
                      <motion.tbody
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="show"
                        className="contents" // Use contents to avoid breaking table structure, though tbody is valid here
                      >
                        {paginatedUnits.map((unit) => (
                          <motion.tr
                            key={unit.id}
                            variants={listItemVariants}
                            className="group hover:bg-muted/30 transition-colors" // Added gentle hover bg
                          >
                            <TableCell className="font-medium">{unit.edificioTorre || '-'}</TableCell>
                            <TableCell>{unit.piso || '-'}</TableCell>
                            <TableCell className="font-medium">{unit.numeroUnidad || '-'}</TableCell>
                            <TableCell>{unit.tipo || '-'}</TableCell>
                            <TableCell>{unit.etapa || '-'}</TableCell>
                            <TableCell>{unit.dormitorios || '-'}</TableCell>
                            <TableCell className="text-right">{unit.m2Totales?.toFixed(2) || '-'}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${unit.precioUSD?.toLocaleString() || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("font-medium", getStatusColor(unit.estado))}>
                                {unit.estado || 'Desconocido'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setSelectedUnit(unit)}
                                    title="Ver detalles"
                                  >
                                    <Eye size={16} />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(unit.id)}
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05, color: "#ef4444" }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(unit.id)}
                                    className="hover:text-red-500 hover:border-red-200 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </motion.div>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)} de {filteredUnits.length} unidades
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Unit Details Dialog */}
      <Dialog open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Detalles de la Unidad</span>
              {selectedUnit && (
                <Badge className={cn("font-medium", getStatusColor(selectedUnit.estado))}>
                  {selectedUnit.estado || 'Desconocido'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUnit && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* Columna Izquierda - Información */}
              <div className="space-y-4">
                {/* Información General */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Información General</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Proyecto</span>
                      <p className="font-medium text-sm">{selectedUnit.proyecto || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Edificio/Torre</span>
                      <p className="font-medium text-sm">{selectedUnit.edificioTorre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Etapa</span>
                      <p className="font-medium text-sm">{selectedUnit.etapa || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Piso</span>
                      <p className="font-medium text-sm">{selectedUnit.piso || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Unidad</span>
                      <p className="font-medium text-sm">{selectedUnit.numeroUnidad || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Dormitorios</span>
                      <p className="font-medium text-sm">{selectedUnit.dormitorios || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Tipo</span>
                      <p className="font-medium text-sm">{selectedUnit.tipo || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Frente</span>
                      <p className="font-medium text-sm">{selectedUnit.frente || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Superficies */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Superficies (m²)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Exclusivos</span>
                      <p className="font-medium text-sm">{selectedUnit.m2Exclusivos?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Patio/Terraza</span>
                      <p className="font-medium text-sm">{selectedUnit.m2PatioTerraza?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Comunes</span>
                      <p className="font-medium text-sm">{selectedUnit.m2Comunes?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="bg-primary/10 p-2 rounded">
                      <span className="text-xs text-muted-foreground">Totales</span>
                      <p className="font-bold text-lg">{selectedUnit.m2Totales?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>

                {/* Otros */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Otros Datos</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Destino</span>
                      <p className="font-medium text-sm">{selectedUnit.destino || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Sector ID</span>
                      <p className="font-medium text-sm font-mono">{selectedUnit.sectorId || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Observaciones</span>
                      <p className="font-medium text-sm">{selectedUnit.observaciones || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Estado Comercial */}
              <div className="space-y-4">
                {/* Precios */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Precios</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 text-center p-3 bg-white dark:bg-background rounded">
                      <span className="text-xs text-muted-foreground">Precio Total</span>
                      <p className="font-bold text-2xl text-primary">
                        US$ {selectedUnit.precioUSD?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">USD/m²</span>
                      <p className="font-medium text-sm">US$ {selectedUnit.usdM2?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>

                {/* Estado Comercial */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Estado Comercial</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Estado</span>
                      <p className="font-medium text-sm">{selectedUnit.estado || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Fecha Reserva</span>
                      <p className="font-medium text-sm">{selectedUnit.fechaReserva || '-'}</p>
                    </div>
                    {selectedUnit.estado === 'No disponible' && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">Motivo No Disponibilidad</span>
                        <p className="font-medium text-sm">{selectedUnit.motivoNoDisponibilidad || '-'}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Comercial</span>
                      <p className="font-medium text-sm">{selectedUnit.comercial || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Clientes */}
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-semibold text-sm border-b pb-2 mb-3">Clientes</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Titular del Boleto</span>
                      <p className="font-medium text-sm">{selectedUnit.clienteTitularBoleto || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Cliente Interesado</span>
                      <p className="font-medium text-sm">{selectedUnit.clienteInteresado || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
