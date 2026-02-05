import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllMinutasDefinitivasForAdmin, actualizarEstadoMinutaDefinitiva } from '@/services/minutas';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { MotivoModal } from '@/components/minutas/MotivoModal';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    FileText,
    Eye,
    RefreshCw,
    CheckCircle,
    Edit,
    XCircle,
    Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import '@/components/dashboard/dashboard.css';

export const DashboardFirmante: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Estados para modales de motivo
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'cancel' | 'edit'>('cancel');
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

    // Cargar minutas aprobadas
    const { data: allMinutas = [], isLoading, refetch } = useQuery({
        queryKey: ['minutasDefinitivas', 'firmante'],
        queryFn: getAllMinutasDefinitivasForAdmin,
    });

    // Calcular estadísticas y filtrar minutas
    const { minutasAprobadas, minutasFirmadas, stats } = useMemo(() => {
        const aprobadas = allMinutas.filter((m: any) => m.Estado === 'aprobada');
        const firmadas = allMinutas.filter((m: any) => m.Estado === 'firmada');
        const borradores = allMinutas.filter((m: any) => m.Estado === 'en_edicion').length;
        const canceladas = allMinutas.filter((m: any) => m.Estado === 'cancelada').length;
        const total = allMinutas.length;
        const pendientes = aprobadas.length;

        return {
            minutasAprobadas: aprobadas,
            minutasFirmadas: firmadas,
            stats: { total, borradores, pendientes, firmadas: firmadas.length, canceladas }
        };
    }, [allMinutas]);

    // Mutation para cambiar estado
    const updateEstadoMutation = useMutation({
        mutationFn: ({ id, estado, comentarios }: { id: string; estado: string; comentarios?: string }) =>
            actualizarEstadoMinutaDefinitiva(id, estado as any, comentarios),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['minutasDefinitivas'] });
        },
    });

    const handleVerMinuta = (minutaId: string) => {
        setSelectedMinutaId(minutaId);
        setModalOpen(true);
    };

    const handleFirmar = async (minutaId: string) => {
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
    };

    const openActionModal = (minutaId: string, type: 'cancel' | 'edit') => {
        setSelectedActionId(minutaId);
        setActionType(type);
        setActionModalOpen(true);
    };

    const handleConfirmAction = async (motivo: string) => {
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
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display md:text-4xl">
                                Mis Firmas
                            </h1>
                            <p className="text-base font-medium text-muted-foreground mt-1">
                                Gestiona tus documentos inmobiliarios pendientes y firmados
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="logout-button"
                        >
                            <span className="material-symbols-outlined mr-2">logout</span>
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-5">
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
                        value={stats.borradores}
                        subtitle="Actualizado hace 2m"
                        icon="edit_note"
                        iconColor="text-muted-foreground"
                    />
                    <StatCard
                        title="PENDIENTES"
                        value={stats.pendientes}
                        subtitle={`${stats.pendientes > 0 ? '! 5urgentes' : 'Sin urgentes'}`}
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

                {/* Tabs for Minuta Status */}
                <Tabs defaultValue="pendientes" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="pendientes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Pendiente de Firma
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs h-5 min-w-5 flex items-center justify-center">
                            {minutasAprobadas.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="firmadas" className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Firmadas
                        <Badge variant="secondary" className="bg-green-100 text-green-800 ml-1 px-1.5 py-0.5 text-xs h-5 min-w-5 flex items-center justify-center">
                            {minutasFirmadas.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pendientes">
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FileText className="mr-3 h-6 w-6 text-blue-600" />
                                    <span className="text-xl">Minutas Pendientes de Firma</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => refetch()}
                                    className="h-10 w-10 hover:bg-blue-50"
                                    title="Refrescar lista"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                </Button>
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                Minutas aprobadas que requieren firma para completar el proceso
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading && (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {!isLoading && minutasAprobadas.length === 0 && (
                                <div className="text-center py-16 text-muted-foreground">
                                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">No hay minutas pendientes de firma</p>
                                    <p className="text-sm mt-2">Todas las minutas están al día</p>
                                </div>
                            )}
                            {!isLoading && minutasAprobadas.length > 0 && (
                                <div className="rounded-md border dashboard-table">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Proyecto</TableHead>
                                                <TableHead>Unidad</TableHead>
                                                <TableHead>Comercial</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {minutasAprobadas.map((minuta: any) => (
                                                <TableRow key={minuta.Id}>
                                                    <TableCell className="font-medium">{minuta.Dato?.proyecto || minuta.Proyectos?.Nombre || 'Sin proyecto'}</TableCell>
                                                    <TableCell>{minuta.Dato?.unidadDescripcion || 'Sin unidad'}</TableCell>
                                                    <TableCell>{minuta.users?.email || 'Sin asignar'}</TableCell>
                                                    <TableCell>
                                                        {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-green-100 text-green-800">
                                                            Aprobada
                                                        </Badge>
                                                    </TableCell>
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
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                                                                onClick={() => openActionModal(minuta.Id, 'edit')}
                                                                disabled={updateEstadoMutation.isPending}
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" />
                                                                A Edición
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                                                onClick={() => openActionModal(minuta.Id, 'cancel')}
                                                                disabled={updateEstadoMutation.isPending}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                onClick={() => handleFirmar(minuta.Id)}
                                                                disabled={updateEstadoMutation.isPending}
                                                            >
                                                                {updateEstadoMutation.isPending ? (
                                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                )}
                                                                Firmar
                                                            </Button>
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
                </TabsContent>

                <TabsContent value="firmadas">
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                                    <span className="text-xl">Historial de Minutas Firmadas</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => refetch()}
                                    className="h-10 w-10 hover:bg-blue-50"
                                    title="Refrescar lista"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                </Button>
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                Registro de minutas que ya han sido firmadas y completadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading && (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {!isLoading && minutasFirmadas.length === 0 && (
                                <div className="text-center py-16 text-muted-foreground">
                                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">No hay minutas firmadas aún</p>
                                </div>
                            )}
                            {!isLoading && minutasFirmadas.length > 0 && (
                                <div className="rounded-md border dashboard-table">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Proyecto</TableHead>
                                                <TableHead>Unidad</TableHead>
                                                <TableHead>Comercial</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {minutasFirmadas.map((minuta: any) => (
                                                <TableRow key={minuta.Id}>
                                                    <TableCell className="font-medium">{minuta.Dato?.proyecto || minuta.Proyectos?.Nombre || 'Sin proyecto'}</TableCell>
                                                    <TableCell>{minuta.Dato?.unidadDescripcion || 'Sin unidad'}</TableCell>
                                                    <TableCell>{minuta.users?.email || 'Sin asignar'}</TableCell>
                                                    <TableCell>
                                                        {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                                            Firmada
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleVerMinuta(minuta.Id)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Ver Detalle
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal para ver detalles */}
            <DetalleMinutaModal
                minutaId={selectedMinutaId}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />

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
        </div>
    );
};

export default DashboardFirmante;

