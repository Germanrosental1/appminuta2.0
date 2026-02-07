import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllMinutasDefinitivasForAdmin, actualizarEstadoMinutaDefinitiva, type MinutaDefinitiva, type EstadoMinuta } from '@/services/minutas';
// Lazy load DetalleMinutaModal
const DetalleMinutaModal = lazy(() => import('@/components/minutas/DetalleMinutaModal').then(module => ({ default: module.DetalleMinutaModal })));
import { MotivoModal } from '@/components/minutas/MotivoModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
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
    Eye,
    RefreshCw,
    CheckCircle,
    Edit,
    XCircle,
    Loader2,
    CheckCircle2,
    LogOut,
    Clock,
    Folder,
    Filter,
    FileText
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import '@/components/dashboard/dashboard.css';

interface MinutaDashboard extends MinutaDefinitiva {
    Proyectos?: { nombre?: string; Nombre?: string }; // Both cases for compatibility
    users?: { email?: string };
    FechaCreacion?: string; // Sometimes returned by backend instead of CreatedAt
    Dato?: {
        proyecto?: string;
        unidadDescripcion?: string;
        [key: string]: unknown;
    };
}

export const DashboardFirmante: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Filtros
    const [statusFilter, setStatusFilter] = useState<string>('aprobada'); // Default to what requires attention
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para modales de motivo
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'cancel' | 'edit'>('cancel');
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

    // Cargar minutas aprobadas
    const { data: allMinutas = [], isLoading, refetch } = useQuery({
        queryKey: ['minutasDefinitivas', 'firmante'],
        queryFn: getAllMinutasDefinitivasForAdmin,
    });

    // Calcular estadísticas
    const stats = useMemo(() => {
        return {
            total: allMinutas.length,
            pendientes: (allMinutas as MinutaDashboard[]).filter((m) => m.Estado === 'pendiente').length,
            en_edicion: (allMinutas as MinutaDashboard[]).filter((m) => m.Estado === 'en_edicion').length,
            aprobadas: (allMinutas as MinutaDashboard[]).filter((m) => m.Estado === 'aprobada').length,
            firmadas: (allMinutas as MinutaDashboard[]).filter((m) => m.Estado === 'firmada').length,
            canceladas: (allMinutas as MinutaDashboard[]).filter((m) => m.Estado === 'cancelada').length,
        };
    }, [allMinutas]);

    // Filtrar minutas según selección
    const filteredMinutas = useMemo(() => {
        let minutas = [...(allMinutas as MinutaDashboard[])];

        if (statusFilter !== 'todas') {
            minutas = minutas.filter((m) => m.Estado === statusFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            minutas = minutas.filter((m) =>
                (m.Dato?.proyecto || m.Proyectos?.Nombre || '').toLowerCase().includes(term) ||
                (m.Dato?.unidadDescripcion || '').toLowerCase().includes(term)
            );
        }

        return minutas;
    }, [allMinutas, statusFilter, searchTerm]);

    // Mutation para cambiar estado
    const updateEstadoMutation = useMutation({
        mutationFn: ({ id, estado, comentarios }: { id: string; estado: EstadoMinuta; comentarios?: string }) =>
            actualizarEstadoMinutaDefinitiva(id, estado, comentarios),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['minutasDefinitivas'] });
        },
    });

    const handleVerMinuta = useCallback((minutaId: string) => {
        setSelectedMinutaId(minutaId);
        setModalOpen(true);
    }, []);

    const handleFirmar = useCallback(async (minutaId: string) => {
        try {
            await updateEstadoMutation.mutateAsync({ id: minutaId, estado: 'firmada' });
            toast({
                title: "Minuta firmada",
                description: "La minuta ha sido marcada como firmada exitosamente",
            });
        } catch (error) {
            console.error('Error al firmar minuta:', error);
            toast({
                title: "Error",
                description: "No se pudo firmar la minuta",
                variant: "destructive",
            });
        }
    }, [updateEstadoMutation, toast]);

    const openActionModal = useCallback((minutaId: string, type: 'cancel' | 'edit') => {
        setSelectedActionId(minutaId);
        setActionType(type);
        setActionModalOpen(true);
    }, []);

    const handleConfirmAction = useCallback(async (motivo: string) => {
        if (!selectedActionId) return;

        const isCancel = actionType === 'cancel';
        const newState = isCancel ? 'cancelada' : 'en_edicion';
        const titleSuccess = isCancel ? "Minuta cancelada" : "Enviada a edición";
        const descSuccess = isCancel ? "La minuta ha sido cancelada" : "La minuta ha sido enviada al comercial para edición";

        try {
            await updateEstadoMutation.mutateAsync({
                id: selectedActionId,
                estado: newState,
                comentarios: motivo
            });
            toast({
                title: titleSuccess,
                description: descSuccess,
            });
            setActionModalOpen(false);
            setSelectedActionId(null);
        } catch (error) {
            console.error(`Error al ${isCancel ? 'cancelar' : 'enviar a edición'}:`, error);
            toast({
                title: "Error",
                description: `No se pudo ${isCancel ? 'cancelar' : 'enviar a edición'} la minuta`,
                variant: "destructive",
            });
        }
    }, [selectedActionId, actionType, updateEstadoMutation, toast]);

    const handleLogout = useCallback(async () => {
        await signOut();
        navigate('/login');
    }, [signOut, navigate]);

    // Nombre de usuario para mostrar
    const displayName = user?.Nombre && user?.Apellido
        ? `${user.Nombre} ${user.Apellido}`
        : user?.email || 'Usuario';

    return (
        <DashboardLayout>
            <TooltipProvider>
                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
                                Mis Firmas
                            </h1>
                            <p className="text-muted-foreground">
                                Bienvenido, {displayName}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Cerrar Sesión
                            </Button>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        <KPICard
                            title="Firmadas"
                            value={stats.firmadas}
                            icon={CheckCircle2}
                            variant="blue"
                        />
                        <KPICard
                            title="A Editar"
                            value={stats.en_edicion}
                            icon={Edit}
                            variant="orange"
                        />
                        <KPICard
                            title="Pendientes"
                            value={stats.pendientes}
                            icon={Clock}
                            variant="yellow"
                        />
                        <KPICard
                            title="Canceladas"
                            value={stats.canceladas}
                            icon={XCircle}
                            variant="red"
                        />
                        <KPICard
                            title="Totales"
                            value={stats.total}
                            icon={Folder}
                            variant="default"
                        />
                    </div>

                    {/* Main Content Card */}
                    <Card className="border-none bg-card/80 backdrop-blur-xl shadow-2xl">
                        <CardHeader className="border-b border-border px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold text-card-foreground">
                                        Minutas Definitivas
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Gestión de minutas y firmas pendientes
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

                            {/* Filtros "Pill" y Search */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'todas'
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-blue-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('todas')}
                                    >
                                        <Filter className="h-4 w-4" />
                                        Todas
                                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${statusFilter === 'todas' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>{stats.total}</span>
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'aprobada'
                                            ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('aprobada')}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Por Firmar
                                        <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.aprobadas}</span>
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'en_edicion'
                                            ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('en_edicion')}
                                    >
                                        <Edit className="h-4 w-4" />
                                        A Editar
                                        <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.en_edicion}</span>
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'pendiente'
                                            ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('pendiente')}
                                    >
                                        <Clock className="h-4 w-4" />
                                        Pendientes
                                        <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.pendientes}</span>
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'firmada'
                                            ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('firmada')}
                                    >
                                        <FileText className="h-4 w-4" />
                                        Firmadas
                                        <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.firmadas}</span>
                                    </button>
                                    <button
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${statusFilter === 'cancelada'
                                            ? 'bg-red-500/20 text-red-500 border border-red-500/20'
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => setStatusFilter('cancelada')}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Canceladas
                                        <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-xs">{stats.canceladas}</span>
                                    </button>
                                </div>

                                <div className="w-full sm:w-64">
                                    <Input
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-muted/50 border-border text-foreground"
                                    />
                                </div>
                            </div>

                            {isLoading && (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {!isLoading && filteredMinutas.length === 0 && (
                                <div className="text-center py-16 text-muted-foreground">
                                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">No hay minutas en esta sección</p>
                                </div>
                            )}

                            {!isLoading && filteredMinutas.length > 0 && (
                                <div className="rounded-md border dashboard-table">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[20%]">Proyecto</TableHead>
                                                <TableHead className="w-[20%]">Unidad</TableHead>
                                                <TableHead className="w-[20%]">Comercial</TableHead>
                                                <TableHead className="w-[15%]">Fecha</TableHead>
                                                <TableHead className="w-[15%]">Estado</TableHead>
                                                <TableHead className="text-right w-[10%]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMinutas.map((minuta) => (
                                                <TableRow key={minuta.Id}>
                                                    <TableCell className="font-medium">{minuta.Dato?.proyecto || minuta.Proyectos?.Nombre || 'Sin proyecto'}</TableCell>
                                                    <TableCell>{minuta.Dato?.unidadDescripcion || 'Sin unidad'}</TableCell>
                                                    <TableCell>{minuta.users?.email || 'Sin asignar'}</TableCell>
                                                    <TableCell>
                                                        {new Date(minuta.CreatedAt || minuta.FechaCreacion || '').toLocaleDateString('es-AR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {minuta.Estado === 'aprobada' ? (
                                                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                                                                Pendiente Firma
                                                            </Badge>
                                                        ) : minuta.Estado === 'pendiente' ? (
                                                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                                                Pendiente
                                                            </Badge>
                                                        ) : minuta.Estado === 'en_edicion' ? (
                                                            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                                                                En Edición
                                                            </Badge>
                                                        ) : minuta.Estado === 'cancelada' ? (
                                                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
                                                                Cancelada
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                                Firmada
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                        onClick={() => handleVerMinuta(minuta.Id)}
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            {minuta.Estado === 'aprobada' && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                                                                                onClick={() => openActionModal(minuta.Id, 'edit')}
                                                                                disabled={updateEstadoMutation.isPending}
                                                                            >
                                                                                <Edit className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Enviar a Edición</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                                                onClick={() => openActionModal(minuta.Id, 'cancel')}
                                                                                disabled={updateEstadoMutation.isPending}
                                                                            >
                                                                                <XCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Cancelar</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                size="icon"
                                                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                                onClick={() => handleFirmar(minuta.Id)}
                                                                                disabled={updateEstadoMutation.isPending}
                                                                            >
                                                                                {updateEstadoMutation.isPending ? (
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    <CheckCircle className="h-4 w-4" />
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Firmar</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Modal para ver detalles */}
                    <Suspense fallback={null}>
                        <DetalleMinutaModal
                            minutaId={selectedMinutaId}
                            open={modalOpen}
                            onOpenChange={setModalOpen}
                        />
                    </Suspense>

                    {/* Modal Genérico para Motivos (Cancelar / Editar) */}
                    <MotivoModal
                        open={actionModalOpen}
                        onOpenChange={setActionModalOpen}
                        onConfirm={handleConfirmAction}
                        isLoading={updateEstadoMutation.isPending}
                        title={actionType === 'cancel' ? "Cancelar Minuta" : "Enviar a Edición"}
                        description={
                            actionType === 'cancel'
                                ? "Esta acción no se puede deshacer. Por favor, indica el motivo de la cancelación."
                                : "Por favor, indica el motivo por el cual solicitas que se edite esta minuta."
                        }
                        label={actionType === 'cancel' ? "Motivo de cancelación" : "Motivo de edición"}
                        placeholder={
                            actionType === 'cancel'
                                ? "Escribe por qué cancelas la minuta..."
                                : "Describe qué cambios son necesarios..."
                        }
                        actionLabel={actionType === 'cancel' ? "Confirmar Cancelación" : "Enviar a Edición"}
                        variant={actionType === 'cancel' ? "destructive" : "default"}
                    />
                </div>
            </TooltipProvider>
        </DashboardLayout>
    );
};

export default DashboardFirmante;
