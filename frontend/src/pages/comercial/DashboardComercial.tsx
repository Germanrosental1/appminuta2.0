import React, { useState, useMemo } from 'react';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMinutas } from '@/hooks/useMinutas';
import { StaggerTableBody, TableRowStagger } from '@/components/animated/StaggerList';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
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
  Eye,
  RefreshCw,
  Edit,
  Clock,
  CheckCircle2,
  Plus,
  Filter,
  FileSignature,
  XCircle,
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
    return minutas.filter(m => m.Estado === statusFilter);
  }, [minutas, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = minutas.length;
    const pendientes = minutas.filter(m => m.Estado === 'pendiente').length;
    const enEdicion = minutas.filter(m => m.Estado === 'en_edicion').length;
    const aprobadas = minutas.filter(m => m.Estado === 'aprobada').length;
    const firmadas = minutas.filter(m => m.Estado === 'firmada').length;
    const canceladas = minutas.filter(m => m.Estado === 'cancelada').length;

    return { total, pendientes, enEdicion, aprobadas, firmadas, canceladas };
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
              <TableRowStagger key={minuta.Id}>
                <TableCell>{minuta.Dato?.proyecto || minuta.Proyectos?.Nombre || 'Sin proyecto'}</TableCell>
                <TableCell>{minuta.Dato?.unidadDescripcion || 'Sin unidad'}</TableCell>
                <TableCell>
                  {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
                </TableCell>
                <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerMinuta(minuta.Id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    {minuta.Estado === 'en_edicion' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-orange-50 hover:bg-orange-100"
                        onClick={() => navigate(`/wizard?edit=${minuta.Id}`)}
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

  const userName = user?.Nombre && user?.Apellido ? `${user.Nombre} ${user.Apellido}` : user?.email || 'Usuario';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Area */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Panel de Control</h1>
            <p className="text-[#92a4c8]">Bienvenido de nuevo, {userName}. Aquí tienes el resumen general de todas las minutas.</p>
          </div>
          <Button
            onClick={handleNuevaCalculadora}
            className="h-12 bg-primary px-6 text-base font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-600"
          >
            <Plus className="mr-2 h-5 w-5" />
            Crear Nueva Minuta
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="TOTAL MINUTAS"
            value={stats.total}
            trend={{
              value: '+12% esta semana',
              positive: true
            }}
            icon="folder"
            iconColor="text-muted-foreground"
          />
          <StatCard
            title="BORRADORES"
            value={stats.enEdicion}
            subtitle="Actualizado hace 2m"
            icon="edit_note"
            iconColor="text-muted-foreground"
          />
          <StatCard
            title="PENDIENTES"
            value={stats.pendientes}
            subtitle={`${stats.pendientes > 0 ? '5 urgentes' : 'Sin urgentes'}`}
            icon="hourglass_top"
            iconColor="text-amber-400"
          />
          <StatCard
            title="FIRMADAS"
            value={stats.firmadas}
            trend={{
              value: '+15% esta semana',
              positive: true
            }}
            icon="verified"
            iconColor="text-primary"
          />
          <StatCard
            title="CANCELADAS"
            value={stats.canceladas}
            subtitle="-2% esta semana"
            icon="block"
            iconColor="text-red-400"
          />
        </div>

        {/* Historial Card */}
        <Card className="border-none bg-[#1a2233]/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="border-b border-[#334366] px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-white">Mis Minutas</CardTitle>
                <CardDescription className="text-[#92a4c8]">Tu historial de operaciones recientes</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="text-[#92a4c8] hover:bg-white/5 hover:text-white"
                title="Refrescar lista"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {/* Status Filters */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${!statusFilter
                  ? 'bg-primary text-white shadow-lg shadow-blue-900/20'
                  : 'bg-[#0f131a] text-[#92a4c8] hover:bg-white/5'
                  }`}
                onClick={() => setStatusFilter(null)}
              >
                Todas
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">{stats.total}</span>
              </button>
              {/* Additional filters can be mapped or manual */}
              <button
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'pendiente'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                  : 'bg-[#0f131a] text-[#92a4c8] hover:bg-white/5'
                  }`}
                onClick={() => setStatusFilter('pendiente')}
              >
                Pendientes
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{stats.pendientes}</span>
              </button>
              <button
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'en_edicion'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                  : 'bg-[#0f131a] text-[#92a4c8] hover:bg-white/5'
                  }`}
                onClick={() => setStatusFilter('en_edicion')}
              >
                En Edición
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{stats.enEdicion}</span>
              </button>
              <button
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'aprobada'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                  : 'bg-[#0f131a] text-[#92a4c8] hover:bg-white/5'
                  }`}
                onClick={() => setStatusFilter('aprobada')}
              >
                Aprobadas
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{stats.aprobadas}</span>
              </button>
            </div>

            {renderMinutasContent()}
          </CardContent>
        </Card>

        {/* Modal para ver detalles de la minuta */}
        <DetalleMinutaModal
          minutaId={selectedMinutaId}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardComercial;
