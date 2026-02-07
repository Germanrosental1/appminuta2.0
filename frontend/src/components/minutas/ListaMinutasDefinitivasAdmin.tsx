import React, { useState, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAllMinutas, useUpdateMinutaEstado } from '@/hooks/useMinutas';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  Filter,
  Clock,
  CheckCircle2,
  FileText,
  Folder,
} from 'lucide-react';
import { MinutaDefinitivaRow } from './MinutaDefinitivaRow';
import { useToast } from '@/components/ui/use-toast';
// Lazy load DetalleMinutaModal
const DetalleMinutaModal = lazy(() => import('@/components/minutas/DetalleMinutaModal').then(module => ({ default: module.DetalleMinutaModal })));
import { MotivoModal } from '@/components/minutas/MotivoModal';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ListaMinutasDefinitivasAdminProps {
  readOnly?: boolean;
}

export const ListaMinutasDefinitivasAdmin: React.FC<ListaMinutasDefinitivasAdminProps> = ({ readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
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

  // Debounce search para evitar filtrado en cada tecla
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ⚡ FILTRADO EN FRONTEND: Por estado y por búsqueda
  const filteredMinutas = useMemo(() => {
    let minutas = data?.data || [];

    // Filtrar por estado (si no es 'todas')
    if (activeTab !== 'todas') {
      minutas = minutas.filter(m => m.Estado === activeTab);
    }

    // Filtrar por término de búsqueda (usa debounced value)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      minutas = minutas.filter(m => {
        const proyectoNombre = (m.Proyectos?.nombre || m.ProyectoNombre || '').toLowerCase();
        const unidadDesc = typeof m.Dato?.unidadDescripcion === 'string' ? m.Dato.unidadDescripcion.toLowerCase() : '';
        const userEmail = (m.users?.email || '').toLowerCase();
        return proyectoNombre.includes(term) || unidadDesc.includes(term) || userEmail.includes(term);
      });
    }

    return minutas;
  }, [debouncedSearchTerm, data, activeTab]);

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

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredMinutas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Aproximadamente 73px por fila
    overscan: 5,
  });

  const { getVirtualItems, getTotalSize } = rowVirtualizer;
  const virtualItems = getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? getTotalSize() - virtualItems.at(-1).end
    : 0;

  const handleVerMinuta = useCallback((id: string) => {
    setSelectedMinutaId(id);
    setModalOpen(true);
  }, []);

  const handleChangeEstado = useCallback(async (
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "No se pudo actualizar el estado de la minuta";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [updateEstadoMutation, toast]);

  // Handler para abrir modal de cancelación
  const handleOpenCancelModal = useCallback((id: string) => {
    setMinutaToCancel(id);
    setCancelModalOpen(true);
  }, []);

  // Handler para confirmar cancelación con motivo
  const handleConfirmCancel = async (motivo: string) => {
    if (!minutaToCancel) return;
    await handleChangeEstado(minutaToCancel, 'cancelada', motivo);
    setMinutaToCancel(null);
  };



  return (
    <div className="space-y-6">

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Aprobadas"
          value={stats.aprobada}
          icon={CheckCircle}
          variant="blue"
        />
        <KPICard
          title="A Editar"
          value={stats.en_edicion}
          icon={Edit}
          variant="orange"
          urgentCount={stats.en_edicion > 0 ? stats.en_edicion : undefined}
        />
        <KPICard
          title="Pendientes"
          value={stats.pendiente}
          icon={Clock}
          variant="yellow"
          urgentCount={stats.pendiente > 0 ? stats.pendiente : undefined}
        />
        <KPICard
          title="Canceladas"
          value={stats.cancelada}
          icon={XCircle}
          variant="red"
        />
        <KPICard
          title="Totales"
          value={stats.todas}
          icon={Folder}
          variant="default"
        />
      </div>

      <Card className="border-none bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-card-foreground">Minutas Definitivas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gestiona las minutas definitivas creadas por los comerciales
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Refrescar lista"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <TooltipProvider>
            <div className="space-y-4">
              {/* Filter Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'todas'
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-blue-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('todas')}
                  >
                    <Filter className="h-4 w-4" />
                    Todas
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${activeTab === 'todas' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>{stats.todas}</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'pendiente'
                      ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('pendiente')}
                  >
                    <Clock className="h-4 w-4" />
                    Pendientes
                    <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.pendiente}</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'en_edicion'
                      ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('en_edicion')}
                  >
                    <Edit className="h-4 w-4" />
                    En Edición
                    <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.en_edicion}</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'aprobada'
                      ? 'bg-green-500/20 text-green-600 border border-green-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('aprobada')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobadas
                    <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.aprobada}</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'firmada'
                      ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('firmada')}
                  >
                    <FileText className="h-4 w-4" />
                    Firmadas
                    <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.firmada}</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === 'cancelada'
                      ? 'bg-red-500/20 text-red-500 border border-red-500/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    onClick={() => setActiveTab('cancelada')}
                  >
                    <XCircle className="h-4 w-4" />
                    Canceladas
                    <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.cancelada}</span>
                  </button>
                </div>

                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Buscar minutas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-muted/50 border-border text-foreground"
                  />
                </div>
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

                  <div
                    ref={parentRef}
                    className="rounded-md border dashboard-table h-[600px] overflow-auto relative"
                  >
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[20%]">Proyecto</TableHead>
                          <TableHead className="w-[20%]">Unidad</TableHead>
                          <TableHead className="w-[20%]">Usuario</TableHead>
                          <TableHead className="w-[15%]">Fecha</TableHead>
                          <TableHead className="w-[15%]">Estado</TableHead>
                          <TableHead className="text-right w-[10%]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMinutas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                              No se encontraron minutas
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {paddingTop > 0 && (
                              <TableRow>
                                <TableCell colSpan={6} style={{ height: `${paddingTop}px`, padding: 0 }} />
                              </TableRow>
                            )}
                            {virtualItems.map((virtualRow) => {
                              const minuta = filteredMinutas[virtualRow.index];
                              return (
                                <MinutaDefinitivaRow
                                  key={minuta.Id}
                                  minuta={minuta}
                                  readOnly={readOnly}
                                  onVer={handleVerMinuta}
                                  onChangeEstado={handleChangeEstado}
                                  onCancel={handleOpenCancelModal}
                                />
                              );
                            })}
                            {paddingBottom > 0 && (
                              <TableRow>
                                <TableCell colSpan={6} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                              </TableRow>
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* ⚡ CONTROLES DE PAGINACIÓN */}
                  {data && data.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
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
                            className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
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
                            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
                                  className={`w-8 h-8 p-0 ${currentPage === pageNum ? '' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
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
                            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Modal para ver detalles de la minuta */}
      {/* Modal para ver detalles de la minuta */}
      <Suspense fallback={null}>
        <DetalleMinutaModal
          minutaId={selectedMinutaId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </Suspense>

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
