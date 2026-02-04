import React, { useState, useMemo } from 'react';
import { useAllMinutas, useUpdateMinutaEstado } from '@/hooks/useMinutas';
import { useDebounce } from '@/hooks/useDebounce';
import { StaggerTableBody, TableRowStagger } from '@/components/animated/StaggerList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Clock,
  CheckCircle2,
  FileText,
  Folder,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { MotivoModal } from '@/components/minutas/MotivoModal';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
    let minutas: any[] = data?.data || [];

    // Filtrar por estado (si no es 'todas')
    if (activeTab !== 'todas') {
      minutas = minutas.filter(m => m.Estado === activeTab);
    }

    // Filtrar por término de búsqueda (usa debounced value)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      minutas = minutas.filter(m =>
        m.Proyectos?.Nombre?.toLowerCase().includes(term) ||
        m.Dato?.unidadDescripcion?.toLowerCase().includes(term) ||
        m.users?.email?.toLowerCase().includes(term)
      );
    }

    return minutas;
  }, [debouncedSearchTerm, data, activeTab]);

  // Calculate statistics for filter counts
  const stats = useMemo(() => {
    const allMinutas: any[] = data?.data || [];
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
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">Aprobada</Badge>;
      case 'firmada':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Firmada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Cancelada</Badge>;
      case 'en_edicion':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">En Edición</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
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
                  <div className="rounded-md border dashboard-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[20%]">Proyecto</TableHead>
                          <TableHead className="w-[20%]">Unidad</TableHead>
                          <TableHead className="w-[20%]">Usuario</TableHead>
                          <TableHead className="w-[15%]">Fecha</TableHead>
                          <TableHead className="w-[15%]">Estado</TableHead>
                          <TableHead className="text-right w-[10%]">Acciones</TableHead>
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
                              <TableCell>{minuta.Proyectos?.Nombre || minuta.Proyecto || 'Sin proyecto'}</TableCell>
                              <TableCell>{minuta.Dato?.unidadDescripcion || minuta.Dato?.unidadCodigo || 'Sin unidad'}</TableCell>
                              <TableCell>{minuta.users?.email || minuta.UsuarioId}</TableCell>
                              <TableCell>
                                {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
                              </TableCell>
                              <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex justify-end gap-2 flex-wrap">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                          onClick={() => handleVerMinuta(minuta.Id || '')}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Ver</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    {/* Botones para minutas PENDIENTES (solo si no es readOnly) */}
                                    {!readOnly && minuta.Estado === 'pendiente' && (
                                      <>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                              onClick={() => handleChangeEstado(minuta.Id, 'aprobada')}
                                            >
                                              <CheckCircle className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Aprobar</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                                              onClick={() => handleChangeEstado(minuta.Id, 'en_edicion')}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Editar</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                              onClick={() => handleOpenCancelModal(minuta.Id)}
                                            >
                                              <XCircle className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Cancelar</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </>
                                    )}
                                  </div>

                                  {/* Textos informativos debajo de los botones */}
                                  {/* Minutas APROBADAS - Admin no puede hacer nada (espera a firmante) */}
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
                                  className={`w-8 h-8 p-0 ${currentPage !== pageNum ? 'border-border text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
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
