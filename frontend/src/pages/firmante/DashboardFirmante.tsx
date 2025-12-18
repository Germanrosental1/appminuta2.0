import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllMinutasDefinitivasForAdmin, actualizarEstadoMinutaDefinitiva } from '@/services/minutas';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { CancelarMinutaModal } from '@/components/minutas/CancelarMinutaModal';
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
    LogOut,
    Eye,
    RefreshCw,
    CheckCircle,
    Edit,
    XCircle,
    Loader2
} from 'lucide-react';

export const DashboardFirmante: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [minutaToCancel, setMinutaToCancel] = useState<string | null>(null);

    // Cargar minutas aprobadas
    const { data: allMinutas = [], isLoading, refetch } = useQuery({
        queryKey: ['minutasDefinitivas', 'firmante'],
        queryFn: getAllMinutasDefinitivasForAdmin,
    });

    // Filtrar solo minutas aprobadas (las que el firmante puede firmar)
    const minutasAprobadas = allMinutas.filter((m: any) => m.estado === 'aprobada');

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

    const handleEnviarAEdicion = async (minutaId: string) => {
        try {
            await updateEstadoMutation.mutateAsync({ id: minutaId, estado: 'en_edicion' });
            toast({
                title: "Enviada a edición",
                description: "La minuta ha sido enviada al comercial para edición",
            });
        } catch (error) {
            console.error('Error al enviar a edición:', error);
            toast({
                title: "Error",
                description: "No se pudo enviar a edición",
                variant: "destructive",
            });
        }
    };

    const handleOpenCancelModal = (minutaId: string) => {
        setMinutaToCancel(minutaId);
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = async (comentarios: string) => {
        if (!minutaToCancel) return;
        try {
            await updateEstadoMutation.mutateAsync({
                id: minutaToCancel,
                estado: 'cancelada',
                comentarios
            });
            toast({
                title: "Minuta cancelada",
                description: "La minuta ha sido cancelada",
            });
            setCancelModalOpen(false);
            setMinutaToCancel(null);
        } catch (error) {
            console.error('Error al cancelar minuta:', error);
            toast({
                title: "Error",
                description: "No se pudo cancelar la minuta",
                variant: "destructive",
            });
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    // Nombre de usuario para mostrar
    const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.email || 'Usuario';

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard Firmante</h1>
                    <p className="text-muted-foreground">
                        Bienvenido, {displayName}
                    </p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FileText className="mr-2 h-5 w-5" />
                            Minutas Pendientes de Firma
                            <Badge variant="secondary" className="ml-2">
                                {minutasAprobadas.length}
                            </Badge>
                        </div>
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
                        Minutas aprobadas que requieren firma para completar el proceso
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    )}
                    {!isLoading && minutasAprobadas.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay minutas pendientes de firma
                        </div>
                    )}
                    {!isLoading && minutasAprobadas.length > 0 && (
                        <div className="rounded-md border">
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
                                        <TableRow key={minuta.id}>
                                            <TableCell>{minuta.datos?.proyecto || minuta.proyectos?.nombre || 'Sin proyecto'}</TableCell>
                                            <TableCell>{minuta.datos?.unidadDescripcion || 'Sin unidad'}</TableCell>
                                            <TableCell>{minuta.users?.email || 'Sin asignar'}</TableCell>
                                            <TableCell>
                                                {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}
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
                                                        onClick={() => handleVerMinuta(minuta.id)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Ver
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="bg-orange-50 hover:bg-orange-100"
                                                        onClick={() => handleEnviarAEdicion(minuta.id)}
                                                        disabled={updateEstadoMutation.isPending}
                                                    >
                                                        <Edit className="h-4 w-4 mr-1" />
                                                        A Edición
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="bg-red-50 hover:bg-red-100 text-red-700"
                                                        onClick={() => handleOpenCancelModal(minuta.id)}
                                                        disabled={updateEstadoMutation.isPending}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                        onClick={() => handleFirmar(minuta.id)}
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

            {/* Modal para ver detalles */}
            <DetalleMinutaModal
                minutaId={selectedMinutaId}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />

            {/* Modal para cancelar */}
            <CancelarMinutaModal
                open={cancelModalOpen}
                onOpenChange={setCancelModalOpen}
                onConfirm={handleConfirmCancel}
                isLoading={updateEstadoMutation.isPending}
            />
        </div>
    );
};

export default DashboardFirmante;
