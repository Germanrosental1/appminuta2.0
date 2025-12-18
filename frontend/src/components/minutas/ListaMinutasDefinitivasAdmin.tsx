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
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { CancelarMinutaModal } from '@/components/minutas/CancelarMinutaModal';

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
      minutas = minutas.filter(m => m.estado === activeTab);
    }

    // Filtrar por término de búsqueda (usa debounced value)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      minutas = minutas.filter(m =>
        m.proyectos?.nombre?.toLowerCase().includes(term) ||
        m.datos?.unidadDescripcion?.toLowerCase().includes(term) ||
        m.users?.email?.toLowerCase().includes(term)
      );
    }

    return minutas;
  }, [debouncedSearchTerm, data, activeTab]);

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
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              {/* Dropdown filter for estado */}
              <div className="flex items-center gap-2">
                <label htmlFor="estado-filter" className="text-sm font-medium text-muted-foreground">Estado:</label>
                <select
                  id="estado-filter"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="todas">Todas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="en_edicion">En Edición</option>
                  <option value="aprobada">Aprobadas</option>
                  <option value="firmada">Firmadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Buscar minutas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                <div className="rounded-md border">
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
                          <TableRowStagger key={minuta.id}>
                            <TableCell>{minuta.proyectos?.nombre || minuta.proyecto || 'Sin proyecto'}</TableCell>
                            <TableCell>{minuta.datos?.unidadDescripcion || minuta.datos?.unidadCodigo || 'Sin unidad'}</TableCell>
                            <TableCell>{minuta.users?.email || minuta.usuario_id}</TableCell>
                            <TableCell>
                              {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}
                            </TableCell>
                            <TableCell>{getEstadoBadge(minuta.estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerMinuta(minuta.id || '')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>

                                {/* Botones para minutas PENDIENTES (solo si no es readOnly) */}
                                {!readOnly && minuta.estado === 'pendiente' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-green-50 hover:bg-green-100"
                                      onClick={() => handleChangeEstado(minuta.id, 'aprobada')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aprobar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-orange-50 hover:bg-orange-100"
                                      onClick={() => handleChangeEstado(minuta.id, 'en_edicion')}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-red-50 hover:bg-red-100"
                                      onClick={() => handleOpenCancelModal(minuta.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Cancelar
                                    </Button>
                                  </>
                                )}

                                {/* Minutas APROBADAS - Admin no puede hacer nada, el firmante se encarga */}
                                {minuta.estado === 'aprobada' && (
                                  <span className="text-xs text-muted-foreground italic">
                                    Pendiente de firma
                                  </span>
                                )}

                                {/* Estados finales - nadie puede hacer nada */}
                                {(minuta.estado === 'firmada' || minuta.estado === 'cancelada') && (
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
      <CancelarMinutaModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirm={handleConfirmCancel}
        isLoading={updateEstadoMutation.isPending}
      />
    </div>
  );
};
