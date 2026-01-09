import React, { useState, useMemo } from 'react';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMinutas } from '@/hooks/useMinutas';
import { StaggerTableBody, TableRowStagger } from '@/components/animated/StaggerList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  FileText,
  Calculator,
  Eye,
  RefreshCw,
  Edit,
  Clock,
  CheckCircle2,
  Plus,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import '@/components/dashboard/dashboard.css';

export const DashboardComercial: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Verificar si requiere cambio de contraseña
  useRequirePasswordChange();

  // 📡 WebSocket para actualizaciones en tiempo real
  useWebSocket();

  // ⚡ OPTIMIZACIÓN: Usar React Query - siempre habilitado ya que siempre mostramos historial
  const { data: minutas = [], isLoading, refetch } = useMinutas(
    user?.id,
    undefined,
    { enabled: !!user?.id }
  );

  // Filter minutas by status
  const filteredMinutas = useMemo(() => {
    if (!statusFilter) return minutas;
    return minutas.filter(m => m.estado === statusFilter);
  }, [minutas, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = minutas.length;
    const pendientes = minutas.filter(m => m.estado === 'pendiente').length;
    const enEdicion = minutas.filter(m => m.estado === 'en_edicion').length;
    const aprobadas = minutas.filter(m => m.estado === 'aprobada' || m.estado === 'firmada').length;

    return { total, pendientes, enEdicion, aprobadas };
  }, [minutas]);

  const handleNuevaCalculadora = () => {
    navigate('/wizard');
  };

  const handleVerMinuta = (minutaId: string) => {
    setSelectedMinutaId(minutaId);
    setModalOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'en_edicion':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">En Edición</Badge>;
      case 'revisada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Revisada</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'firmada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Firmada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const renderMinutasContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (minutas.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No has creado ninguna minuta provisoria aún</p>
          <p className="text-sm mt-2">Haz clic en el botón "+" para crear tu primera minuta</p>
        </div>
      );
    }

    if (filteredMinutas.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No hay minutas con el estado seleccionado</p>
          <p className="text-sm mt-2">Prueba con otro filtro</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border dashboard-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <StaggerTableBody>
            {filteredMinutas.map((minuta) => (
              <TableRowStagger key={minuta.id}>
                <TableCell>{minuta.datos?.proyecto || minuta.proyectos?.nombre || 'Sin proyecto'}</TableCell>
                <TableCell>{minuta.datos?.unidadDescripcion || 'Sin unidad'}</TableCell>
                <TableCell>
                  {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}
                </TableCell>
                <TableCell>{getEstadoBadge(minuta.estado)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerMinuta(minuta.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    {minuta.estado === 'en_edicion' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-orange-50 hover:bg-orange-100"
                        onClick={() => navigate(`/wizard?edit=${minuta.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRowStagger>
            ))}
          </StaggerTableBody>
        </Table>
      </div >
    );
  };

  const userName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.email || 'Usuario';

  return (
    <div className="container mx-auto py-8 space-y-6">
      <DashboardHeader
        title="Mis Minutas"
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Historial de Minutas Card */}
      <Card className="border shadow-sm">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-600" />
              Historial de Minutas
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8 hover:bg-blue-50"
              title="Refrescar lista"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Minutas provisorias creadas anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Filter */}
          <div className="status-filter mb-4">
            <button
              className={`status-filter-btn ${!statusFilter ? 'active' : ''}`}
              onClick={() => setStatusFilter(null)}
            >
              <Filter className="h-4 w-4" />
              Todas
              <span className="filter-count">{stats.total}</span>
            </button>
            <button
              className={`status-filter-btn ${statusFilter === 'pendiente' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pendiente')}
            >
              <Clock className="h-4 w-4" />
              Pendientes
              <span className="filter-count">{stats.pendientes}</span>
            </button>
            <button
              className={`status-filter-btn ${statusFilter === 'en_edicion' ? 'active' : ''}`}
              onClick={() => setStatusFilter('en_edicion')}
            >
              <Edit className="h-4 w-4" />
              En Edición
              <span className="filter-count">{stats.enEdicion}</span>
            </button>
            <button
              className={`status-filter-btn ${statusFilter === 'aprobada' ? 'active' : ''}`}
              onClick={() => setStatusFilter('aprobada')}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobadas
              <span className="filter-count">{stats.aprobadas}</span>
            </button>
          </div>

          {renderMinutasContent()}
        </CardContent>
      </Card>

      {/* Floating Action Button with Menu */}
      <div className="fab-container">
        <div className="fab-menu">
          <button
            className="fab-menu-item fab-menu-item-calculator"
            onClick={handleNuevaCalculadora}
          >
            <Calculator className="h-5 w-5" />
            Nueva Minuta Comercial
          </button>
          <button
            className="fab-menu-item fab-menu-item-document"
            onClick={() => {
              // TODO: Implementar acción para nuevo documento
              console.log('Nuevo documento clicked');
            }}
          >
            <FileText className="h-5 w-5" />
            Nuevo Documento
          </button>
        </div>
        <button className="fab-button" title="Opciones">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Modal para ver detalles de la minuta */}
      <DetalleMinutaModal
        minutaId={selectedMinutaId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default DashboardComercial;
