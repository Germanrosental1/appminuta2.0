import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMinutaProvisoria, useDatosMapaVentas, useActualizarEstadoMinutaProvisoria } from '@/hooks/useMinutasAdmin';
import { ResumenCompleto } from '@/components/wizard/ResumenCompleto';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Save,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const DetalleMinutaProvisoria: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // React Query Hooks
  const { data: minuta, isLoading, error } = useMinutaProvisoria(id || '');
  const { data: datosMapaVentas, isLoading: loadingMapaVentas } = useDatosMapaVentas(minuta?.UnidadId);
  const updateEstadoMutation = useActualizarEstadoMinutaProvisoria();

  // Local UI State
  const [comentarios, setComentarios] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<'aprobada' | 'rechazada' | null>(null);

  // Set comments when minuta loads
  useEffect(() => {
    if (minuta?.Comentario) {
      setComentarios(minuta.Comentario);
    }
  }, [minuta]);

  const procesando = updateEstadoMutation.isPending;

  const handleChangeEstado = async (nuevoEstado: 'revisada' | 'aprobada' | 'rechazada') => {
    if (nuevoEstado === 'aprobada' || nuevoEstado === 'rechazada') {
      setAccionPendiente(nuevoEstado);
      setDialogOpen(true);
      return;
    }

    await actualizarEstadoMinutaAsync(nuevoEstado);
  };

  const confirmarCambioEstado = async () => {
    if (!accionPendiente) return;

    await actualizarEstadoMinutaAsync(accionPendiente);
    setDialogOpen(false);
    setAccionPendiente(null);
  };

  const actualizarEstadoMinutaAsync = async (nuevoEstado: 'revisada' | 'aprobada' | 'rechazada') => {
    if (!id) return;

    try {
      await updateEstadoMutation.mutateAsync({
        id,
        estado: nuevoEstado,
        comentarios: comentarios
      });

      // Si fue aprobada o rechazada, redirigir al listado
      if (nuevoEstado === 'aprobada' || nuevoEstado === 'rechazada') {
        setTimeout(() => {
          navigate('/admin/dashboard'); // Or navigate back to list
        }, 1500);
      }
    } catch (error) {
      // Toast/Error handled by mutation hook
    }
  };

  const guardarComentarios = async () => {
    if (!id || !minuta) return;

    try {
      await updateEstadoMutation.mutateAsync({
        id,
        estado: minuta.Estado,
        comentarios
      });

      toast({
        title: "Comentarios guardados",
        description: "Los comentarios han sido guardados correctamente",
      });
    } catch (error) {
      // Toast handled by mutation hook
    }
  };

  const renderMapaVentasContent = () => {
    if (loadingMapaVentas) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Cargando datos del mapa...</span>
        </div>
      );
    }

    if (datosMapaVentas) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Datos del Mapa de Ventas</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Proyecto:</p>
                <p className="font-medium">{datosMapaVentas.proyecto}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unidad:</p>
                <p className="font-medium">{datosMapaVentas.unidad}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado:</p>
                <p className="font-medium">{datosMapaVentas.estado}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio Lista:</p>
                <p className="font-medium">${datosMapaVentas.precio_lista?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">M² Totales:</p>
                <p className="font-medium">{datosMapaVentas.m2_totales} m²</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dormitorios:</p>
                <p className="font-medium">{datosMapaVentas.dormitorios}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Comparación</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded-md">
                <span>Proyecto</span>
                <span className="font-medium text-green-600">Coincide</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded-md">
                <span>Unidad</span>
                <span className="font-medium text-green-600">Coincide</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-md">
                <span>Precio Lista</span>
                <span className="font-medium text-yellow-600">Revisar</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-4 text-muted-foreground">
        No se encontraron datos en el mapa de ventas
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando información de la minuta...</span>
      </div>
    );
  }

  if (error || !minuta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar la minuta</h2>
        <p className="text-muted-foreground mb-4">No se encontró la minuta solicitada</p>
        <Button onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Minuta Provisoria #{id?.substring(0, 8)}</h1>
          <p className="text-muted-foreground">
            Proyecto: {minuta.Proyecto} | Unidad: {minuta.Dato?.unidad || minuta.UnidadId} |
            Estado: {minuta.Estado.charAt(0).toUpperCase() + minuta.Estado.slice(1)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Datos de la Minuta
              </CardTitle>
              <CardDescription>
                Información registrada por el comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumenCompleto wizardData={minuta.Dato} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conformación con Mapa de Ventas</CardTitle>
              <CardDescription>
                Verificar datos con el mapa de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMapaVentasContent()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comentarios</CardTitle>
              <CardDescription>
                Agregar observaciones o comentarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Escriba sus comentarios aquí..."
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                className="min-h-[120px]"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={guardarComentarios}
                disabled={procesando}
              >
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Comentarios
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {minuta.Estado === 'pendiente' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleChangeEstado('revisada')}
                    disabled={procesando}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Marcar como Revisada
                  </Button>
                )}

                {(minuta.Estado === 'pendiente' || minuta.Estado === 'revisada') && (
                  <>
                    <Button
                      variant="default"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleChangeEstado('aprobada')}
                      disabled={procesando}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprobar Minuta
                    </Button>

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleChangeEstado('rechazada')}
                      disabled={procesando}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rechazar Minuta
                    </Button>
                  </>
                )}

                {minuta.Estado === 'aprobada' && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => navigate(`/admin/minutas/${id}/definitiva`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Crear Minuta Definitiva
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionPendiente === 'aprobada' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </DialogTitle>
            <DialogDescription>
              {accionPendiente === 'aprobada'
                ? '¿Está seguro que desea aprobar esta minuta? Esta acción no se puede deshacer.'
                : '¿Está seguro que desea rechazar esta minuta? Esta acción no se puede deshacer.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="comentarios-confirmacion">Comentarios (opcional)</Label>
            <Textarea
              id="comentarios-confirmacion"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Agregue un comentario sobre esta decisión..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={procesando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarCambioEstado}
              disabled={procesando}
              variant={accionPendiente === 'aprobada' ? 'default' : 'destructive'}
            >
              {procesando && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              )}
              {!procesando && accionPendiente === 'aprobada' && (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Aprobación
                </>
              )}
              {!procesando && accionPendiente !== 'aprobada' && (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirmar Rechazo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
