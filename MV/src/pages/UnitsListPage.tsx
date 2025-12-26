import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '@/services/supabaseService';
import { supabase } from '@/lib/supabase';
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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Animation Variants
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03, // Fast stagger for enterprise feel
      delayChildren: 0.1
    }
  }
};

const listItemVariants = {
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
        console.error('Error loading projects:', error);
        toast.error('Error al cargar los proyectos');
      } finally {
        setIsProjectsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Mostrar mensaje de depuración cuando se carga la página
  useEffect(() => {
    console.log('UnitsListPage montada - Verificando conexión con Supabase');

    // Verificar conexión con Supabase
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('vista_buscador_propiedades').select('count').limit(1);
        if (error) {
          console.error('Error al conectar con Supabase:', error);
          toast.error(`Error de conexión: ${error.message}`);
        } else {
          console.log('Conexión con Supabase exitosa');
        }
      } catch (err) {
        console.error('Error al verificar conexión:', err);
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    // Evitar carga inicial de "todas las unidades" si todavía estamos determinando
    // si hay proyectos para seleccionar por defecto.
    if (isProjectsLoading) return;

    const loadUnits = async () => {
      try {
        setLoading(true);
        let data: Unit[];

        if (selectedProject) {
          data = await supabaseService.getUnitsByProject(selectedProject);

          // Cargar los tipos disponibles para este proyecto
          const tipos = await supabaseService.getUniqueValuesByProject('tipo', selectedProject);
          setTiposDisponibles(tipos);

          // Obtener la naturaleza del proyecto
          if (data.length > 0) {
            const firstUnit = data[0];
            setProjectNaturaleza(firstUnit.natdelproyecto || 'Sin clasificar');
          }

          // Resetear los filtros cuando cambia el proyecto
          setFiltroTipo('all');
          setFiltroDormitorios('all');
          setFiltroPrecioMin('');
          setFiltroPrecioMax('');
          setFiltroEstado('all');
        } else {
          data = await supabaseService.getAllUnits();
          const tipos = await supabaseService.getUniqueValues('tipo');
          setTiposDisponibles(tipos);
        }

        setUnits(data);
      } catch (error) {
        console.error('Error loading units:', error);
        toast.error('Error al cargar las unidades');
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [selectedProject, isProjectsLoading]);

  const handleEdit = (unitId: string) => {
    navigate(`/unit/edit/${unitId}`);
  };

  const handleCreate = () => {
    navigate('/unit/create');
  };

  const handleDelete = async (unitId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta unidad?')) {
      try {
        await supabaseService.deleteUnit(unitId);
        setUnits(units.filter(unit => unit.id !== unitId));
        toast.success('Unidad eliminada correctamente');
      } catch (error) {
        console.error('Error deleting unit:', error);
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
        const dormitoriosNum = parseInt(filtroDormitorios);
        if (unit.dormitorios !== dormitoriosNum) return false;
      }
    }

    // Filtro por precio mínimo
    if (filtroPrecioMin && !isNaN(parseFloat(filtroPrecioMin))) {
      const precioMin = parseFloat(filtroPrecioMin);
      if (unit.precioUSD < precioMin) return false;
    }

    // Filtro por precio máximo
    if (filtroPrecioMax && !isNaN(parseFloat(filtroPrecioMax))) {
      const precioMax = parseFloat(filtroPrecioMax);
      if (unit.precioUSD > precioMax) return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'all' && unit.estado !== filtroEstado) {
      return false;
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
    <motion.div
      className="container mx-auto p-6"
      initial="initial"
      animate="animate"
      variants={pageVariants}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mapa de Ventas</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} /> Nueva Unidad
        </Button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <label className="text-sm font-medium mb-1 block">Proyecto</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-2/3">
            <label className="text-sm font-medium mb-1 block">Búsqueda</label>
            <Input
              placeholder="Buscar por unidad, sector ID, edificio, piso, estado o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/5">
            <label className="text-sm font-medium mb-1 block">Tipo</label>
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
              <label className="text-sm font-medium mb-1 block">Dormitorios</label>
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
            <label className="text-sm font-medium mb-1 block">Estado</label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estadosDisponibles.map(estado => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/5">
            <label className="text-sm font-medium mb-1 block">Precio mínimo (USD)</label>
            <Input
              type="number"
              placeholder="Precio mínimo"
              value={filtroPrecioMin}
              onChange={(e) => setFiltroPrecioMin(e.target.value)}
            />
          </div>

          <div className="w-full md:w-1/5">
            <label className="text-sm font-medium mb-1 block">Precio máximo (USD)</label>
            <Input
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
  );
}
