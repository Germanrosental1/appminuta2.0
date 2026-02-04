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
  FileSignature,
  XCircle,
  Folder,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pendiente</Badge>;
      case 'en_edicion':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">En Edición</Badge>;
      case 'revisada':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Revisada</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">Aprobada</Badge>;
      case 'firmada':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Firmada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Cancelada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Rechazada</Badge>;
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
              <TableHead className="w-[30%]">Proyecto</TableHead>
              <TableHead className="w-[20%]">Unidad</TableHead>
              <TableHead className="w-[20%]">Fecha</TableHead>
              <TableHead className="w-[20%]">Estado</TableHead>
              <TableHead className="text-right w-[10%]">Acciones</TableHead>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-border text-muted-foreground hover:bg-muted"
                          onClick={() => handleVerMinuta(minuta.Id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver</p>
                      </TooltipContent>
                    </Tooltip>

                    {minuta.Estado === 'en_edicion' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                            onClick={() => navigate(`/wizard?edit=${minuta.Id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar</p>
                        </TooltipContent>
                      </Tooltip>
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
      <TooltipProvider>
        <div className="space-y-8">
          {/* Header Area */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Comercial</h1>
              <p className="text-muted-foreground">Bienvenido, {userName}</p>
            </div>
            <Button
              onClick={handleNuevaCalculadora}
              className="h-12 bg-primary px-6 text-base font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-600"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Nueva Minuta
            </Button>
          </div>

          {/* Stats / KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Minutas"
              value={stats.total}
              icon={Folder}
              variant="default"
            />
            <KPICard
              title="Pendientes"
              value={stats.pendientes}
              icon={Timer}
              urgentCount={5} // Placeholder por ahora, idealmente vendría del backend
              variant="yellow"
            />
            <KPICard
              title="Firmadas"
              value={stats.firmadas}
              icon={CheckCircle2}
              variant="blue"
            />
            <KPICard
              title="Canceladas"
              value={stats.canceladas}
              icon={XCircle}
              variant="red"
            />
          </div>

          {/* Historial Card */}
          <Card className="border-none bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="border-b border-border px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-card-foreground">Mis Minutas</CardTitle>
                  <CardDescription className="text-muted-foreground">Tu historial de operaciones recientes</CardDescription>
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
              {/* Status Filters */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${!statusFilter
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-blue-900/20'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  onClick={() => setStatusFilter(null)}
                >
                  Todas
                  <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">{stats.total}</span>
                </button>
                {/* Additional filters can be mapped or manual */}
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'pendiente'
                    ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  onClick={() => setStatusFilter('pendiente')}
                >
                  Pendientes
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{stats.pendientes}</span>
                </button>
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'en_edicion'
                    ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  onClick={() => setStatusFilter('en_edicion')}
                >
                  En Edición
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs">{stats.enEdicion}</span>
                </button>
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'aprobada'
                    ? 'bg-green-500/20 text-green-500 border border-green-500/20'
                    : 'bg-background text-muted-foreground hover:bg-muted'
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
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default DashboardComercial;
