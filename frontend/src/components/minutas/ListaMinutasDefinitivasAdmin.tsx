import React, { useState, useMemo } from 'react';
import { useAllMinutas, useUpdateMinutaEstado } from '@/hooks/useMinutas';
import { useDebounce } from '@/hooks/useDebounce';
import { StaggerTableBody, TableRowStagger } from '@/components/animated/StaggerList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Edit,
  Filter,
  CalendarIcon,
  Search,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { MotivoModal } from '@/components/minutas/MotivoModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ListaMinutasDefinitivasAdminProps {
  readOnly?: boolean;
}

export const ListaMinutasDefinitivasAdmin: React.FC<ListaMinutasDefinitivasAdminProps> = ({ readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [proyectoFilter, setProyectoFilter] = useState<string>('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { toast } = useToast();

  // ⚡ PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Estados para el modal de detalles
  const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para el modal de cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [minutaToCancel, setMinutaToCancel] = useState<string | null>(null);

  // Usar React Query - traer TODAS las minutas y filtrar en frontend
  const { data, isLoading, error, refetch } = useAllMinutas(
    currentPage,
    pageSize
    // Sin filtro de estado - se filtra en frontend
  );
  const updateEstadoMutation = useUpdateMinutaEstado();

  // Obtener lista de proyectos únicos de las minutas
  const proyectos = useMemo(() => {
    const allMinutas = data?.data || [];
    const uniqueProyectos = new Set(
      allMinutas
        .map(m => m.ProyectoNombre)
        .filter(Boolean)
    );
    return Array.from(uniqueProyectos).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data]);

  // Debounce search para evitar filtrado en cada tecla
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ⚡ FILTRADO EN FRONTEND: Por estado, proyecto, fecha y por búsqueda
  const filteredMinutas = useMemo(() => {
    let minutas = data?.data || [];

    // Filtrar por estado (si no es 'todos')
    if (estadoFilter !== 'todos') {
      minutas = minutas.filter(m => m.Estado === estadoFilter);
    }

    // Filtrar por proyecto (si no es 'todos')
    if (proyectoFilter !== 'todos') {
      minutas = minutas.filter(m => m.ProyectoNombre === proyectoFilter);
    }

    // Filtrar por rango de fechas
    if (dateRange?.from) {
      minutas = minutas.filter(m => {
        const minutaDate = new Date(m.CreatedAt);
        const fromDate = dateRange.from;
        const toDate = dateRange.to || fromDate;

        return minutaDate >= fromDate && minutaDate <= toDate;
      });
    }

    // Filtrar por término de búsqueda (usa debounced value)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      minutas = minutas.filter(m =>
        m.Id?.toLowerCase().includes(term) ||
        m.Numero?.toLowerCase().includes(term) ||
        m.ProyectoNombre?.toLowerCase().includes(term) ||
        m.UnidadIdentificador?.toLowerCase().includes(term) ||
        m.CreadoPor?.toLowerCase().includes(term) ||
        m.ClienteNombre?.toLowerCase().includes(term)
      );
    }

    return minutas;
  }, [debouncedSearchTerm, data, estadoFilter, proyectoFilter, dateRange]);

  // Calculate statistics for filter counts
  const stats = useMemo(() => {
    const allMinutas = data?.data || [];
    return {
      todas: allMinutas.length,
      pendiente: allMinutas.filter(m => m.Estado === 'pendiente').length,
      en_edicion: allMinutas.filter(m => m.Estado === 'en_edicion').length,
      aprobada: allMinutas.filter(m => m.Estado === 'aprobada').length,
      firmada: allMinutas.filter(m => m.Estado === 'firmada').length,
      cancelada: allMinutas.filter(m => m.Estado === 'cancelada').length,
    };
  }, [data]);

  const handleVerMinuta = (id: string) => {
    setSelectedMinutaId(id);
    setModalOpen(true);
  };

  const handleChangeEstado = async (
    id: string,
    nuevoEstado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada' | 'en_edicion',
    comentarios?: string
  ) => {
    try {
      await updateEstadoMutation.mutateAsync({ id, estado: nuevoEstado, comentarios });
      toast({
        title: "Éxito",
        description: `Estado actualizado a ${nuevoEstado}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar el estado de la minuta",
        variant: "destructive",
      });
    }
  };

  // Handler para abrir modal de cancelación
  const handleOpenCancelModal = (id: string) => {
    setMinutaToCancel(id);
    setCancelModalOpen(true);
  };

  // Handler para confirmar cancelación con motivo
  const handleConfirmCancel = async (motivo: string) => {
    if (!minutaToCancel) return;
    await handleChangeEstado(minutaToCancel, 'cancelada', motivo);
    setMinutaToCancel(null);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'firmada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Firmada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelada</Badge>;
      case 'en_edicion':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">En Edición</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Minutas Definitivas</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8"
              title="Refrescar lista"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Gestiona las minutas definitivas creadas por los comerciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Advanced Filter Bar */}
            <div className="flex flex-col gap-3">
              {/* First Row - Main Filters */}
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID, nombre o proy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Date Range Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full lg:w-[240px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd MMM", { locale: es })} -{" "}
                            {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                          </>
                        ) : (
                          format(dateRange.from, "dd MMM yyyy", { locale: es })
                        )
                      ) : (
                        <span>Rango de fechas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={es}
                    />
                    {dateRange?.from && (
                      <div className="border-t p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setDateRange(undefined)}
                        >
                          Limpiar fechas
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Estado Dropdown */}
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendientes ({stats.pendiente})</SelectItem>
                    <SelectItem value="en_edicion">En Edición ({stats.en_edicion})</SelectItem>
                    <SelectItem value="aprobada">Aprobadas ({stats.aprobada})</SelectItem>
                    <SelectItem value="firmada">Firmadas ({stats.firmada})</SelectItem>
                    <SelectItem value="cancelada">Canceladas ({stats.cancelada})</SelectItem>
                  </SelectContent>
                </Select>

                {/* Proyecto Dropdown */}
                <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proyectos</SelectItem>
                    {proyectos.map((proyecto) => (
                      <SelectItem key={proyecto} value={proyecto}>
                        {proyecto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* More Filters Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="w-full lg:w-auto"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Más Filtros
                </Button>
              </div>

              {/* Second Row - Active Filters Summary */}
              {(estadoFilter !== 'todos' || proyectoFilter !== 'todos' || dateRange?.from || searchTerm) && (
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Filtros activos:</span>
                  {estadoFilter !== 'todos' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setEstadoFilter('todos')}>
                      Estado: {estadoFilter} ✕
                    </Badge>
                  )}
                  {proyectoFilter !== 'todos' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setProyectoFilter('todos')}>
                      Proyecto: {proyectoFilter} ✕
                    </Badge>
                  )}
                  {dateRange?.from && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setDateRange(undefined)}>
                      Fecha: {format(dateRange.from, "dd/MM/yy", { locale: es })}
                      {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yy", { locale: es })}`} ✕
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm('')}>
                      Búsqueda: "{searchTerm}" ✕
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {!isLoading && error && (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No se pudieron cargar las minutas. Intente nuevamente.</p>
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="rounded-md border dashboard-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    {/* ⚡ ANIMACIÓN: Stagger tbody para entrada suave */}
                    <StaggerTableBody>
                      {filteredMinutas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            No se encontraron minutas
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMinutas.map((minuta) => (
                          <TableRowStagger key={minuta.Id}>
                            <TableCell>{minuta.ProyectoNombre || 'Sin proyecto'}</TableCell>
                            <TableCell>{minuta.UnidadIdentificador || 'Sin unidad'}</TableCell>
                            <TableCell>{minuta.CreadoPor || 'Sin usuario'}</TableCell>
                            <TableCell>
                              {new Date(minuta.CreatedAt).toLocaleDateString('es-AR')}
                            </TableCell>
                            <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex justify-end gap-2 flex-wrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVerMinuta(minuta.Id || '')}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>

                                  {/* Botones para minutas PENDIENTES (solo si no es readOnly) */}
                                  {!readOnly && minuta.Estado === 'pendiente' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-green-50 hover:bg-green-100"
                                        onClick={() => handleChangeEstado(minuta.Id, 'aprobada')}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Aprobar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-orange-50 hover:bg-orange-100"
                                        onClick={() => handleChangeEstado(minuta.Id, 'en_edicion')}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Editar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-red-50 hover:bg-red-100"
                                        onClick={() => handleOpenCancelModal(minuta.Id)}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancelar
                                      </Button>
                                    </>
                                  )}
                                </div>

                                {/* Textos informativos debajo de los botones */}
                                {/* Minutas APROBADAS - Admin no puede hacer nada, el firmante se encarga */}
                                {minuta.Estado === 'aprobada' && (
                                  <span className="text-xs text-muted-foreground italic">
                                    Pendiente de firma
                                  </span>
                                )}

                                {/* Estados finales - nadie puede hacer nada */}
                                {(minuta.Estado === 'firmada' || minuta.Estado === 'cancelada') && (
                                  <span className="text-xs text-muted-foreground italic">
                                    Estado final
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRowStagger>
                        ))
                      )}
                    </StaggerTableBody>
                  </Table>
                </div>

                {/* ⚡ CONTROLES DE PAGINACIÓN */}
                {data && data.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, data.total)} de {data.total} minutas
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Selector de tamaño de página */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Mostrar:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1); // Reset a primera página
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      {/* Navegación de páginas */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                            // Mostrar páginas alrededor de la actual
                            let pageNum;
                            if (data.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= data.totalPages - 2) {
                              pageNum = data.totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                          disabled={currentPage === data.totalPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para ver detalles de la minuta */}
      <DetalleMinutaModal
        minutaId={selectedMinutaId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Modal para cancelar minuta con motivo */}
      <MotivoModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirm={handleConfirmCancel}
        isLoading={updateEstadoMutation.isPending}
        title="Cancelar Minuta"
        description="Esta acción no se puede deshacer. Por favor, indica el motivo de la cancelación."
        label="Motivo de cancelación"
        placeholder="Escribe el motivo por el cual se cancela esta minuta..."
        actionLabel="Confirmar Cancelación"
        variant="destructive"
      />
    </div>
  );
};
