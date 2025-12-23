import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMinutaDefinitivaById, actualizarEstadoMinutaDefinitiva, actualizarDatosMinutaDefinitiva } from '@/services/minutas';
import { ResumenCompleto } from '@/components/wizard/ResumenCompleto';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { MinutaEditarTab } from './components/MinutaEditarTab';

type MinutaEstado = 'aprobada' | 'firmada' | 'cancelada';

export const DetalleMinutaDefinitiva: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [minuta, setMinuta] = useState<any>(null);
  const [datosMapaVentas, setDatosMapaVentas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<MinutaEstado | null>(null);

  // Estados para edición de datos
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [datosEditados, setDatosEditados] = useState<any>(null);
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  // Hook de generación de PDF
  const { generarPDF, procesando: procesandoPDF, pdfContenidoRef } = usePDFGenerator({
    prefix: 'Minuta'
  });

  useEffect(() => {
    const fetchMinuta = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Obtener datos de la minuta
        const minutaData = await getMinutaDefinitivaById(id);
        setMinuta(minutaData);

        // Inicializar comentarios con los existentes
        if (minutaData.comentarios) {
          setComentarios(minutaData.comentarios);
        }

        // Inicializar datos editados con los datos actuales
        setDatosEditados(structuredClone(minutaData.datos));

        // Obtener datos del mapa de ventas
        setDatosMapaVentas(minutaData.datos_mapa_ventas || null);

      } catch (err) {
        setError('No se pudieron cargar los datos de la minuta');
      } finally {
        setLoading(false);
      }
    };

    fetchMinuta();
  }, [id]);

  const handleGuardarComentarios = async () => {
    if (!id) return;

    try {
      setProcesando(true);
      await actualizarEstadoMinutaDefinitiva(id, minuta.estado, comentarios);

      toast({
        title: "Comentarios guardados",
        description: "Los comentarios han sido guardados exitosamente",
      });

      // Actualizar el estado local
      setMinuta((prev: any) => ({ ...prev, comentarios }));

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los comentarios",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleEditarDatos = () => {
    setEditandoDatos(true);
  };

  const handleCancelarEdicion = () => {
    // Restaurar datos originales
    setDatosEditados(structuredClone(minuta.datos));
    setEditandoDatos(false);
  };

  const handleCambioDato = (campo: string, valor: any) => {
    setDatosEditados((prev: any) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleGuardarDatos = async () => {
    if (!id) return;

    try {
      setGuardandoDatos(true);
      await actualizarDatosMinutaDefinitiva(id, datosEditados);

      toast({
        title: "Datos actualizados",
        description: "Los datos de la minuta han sido actualizados exitosamente",
      });

      // Actualizar el estado local
      setMinuta((prev: any) => ({ ...prev, datos: datosEditados }));
      setEditandoDatos(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos de la minuta",
        variant: "destructive",
      });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const handleCambiarEstado = (nuevoEstado: MinutaEstado) => {
    setAccionPendiente(nuevoEstado);
    setDialogOpen(true);
  };

  const confirmarCambioEstado = async () => {
    if (!id || !accionPendiente) return;

    try {
      setProcesando(true);
      await actualizarEstadoMinutaDefinitiva(id, accionPendiente, comentarios);

      toast({
        title: "Estado actualizado",
        description: `La minuta ha sido marcada como ${accionPendiente}`,
      });

      // Actualizar el estado local
      setMinuta((prev: any) => ({ ...prev, estado: accionPendiente }));
      setDialogOpen(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la minuta",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleGenerarPDFClick = () => {
    if (minuta?.proyecto) {
      generarPDF(minuta.proyecto);
    }
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
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getDialogTitle = (accion: MinutaEstado | null) => {
    switch (accion) {
      case 'aprobada': return 'Confirmar Aprobación';
      case 'firmada': return 'Confirmar Firma';
      case 'cancelada': return 'Confirmar Cancelación';
      default: return '';
    }
  };

  const getDialogDescription = (accion: MinutaEstado | null) => {
    switch (accion) {
      case 'aprobada':
        return '¿Está seguro que desea aprobar esta minuta? Esta acción no se puede deshacer.';
      case 'firmada':
        return '¿Está seguro que desea marcar esta minuta como firmada? Esta acción no se puede deshacer.';
      case 'cancelada':
        return '¿Está seguro que desea cancelar esta minuta? Esta acción no se puede deshacer.';
      default:
        return '';
    }
  };

  // Helper
  const formatMapValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  };

  // Render Main
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando información de la minuta...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      );
    }

    if (!minuta) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No se encontró la minuta solicitada
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Información de la Minuta</span>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(minuta.estado)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerarPDFClick}
                      disabled={procesando || procesandoPDF}
                    >
                      {procesandoPDF ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      PDF Completo
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
                    <div>
                      <span className="font-medium">Proyecto: </span>
                      <span>{minuta.proyecto}</span>
                    </div>
                    <div>
                      <span className="font-medium">Unidad: </span>
                      <span>{minuta.datos?.unidadDescripcion || minuta.unidad_id}</span>
                    </div>
                    <div>
                      <span className="font-medium">Fecha: </span>
                      <span>{new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="resumen">
                  <div className="flex justify-between items-center mb-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="resumen">Resumen</TabsTrigger>
                      <TabsTrigger value="mapa-ventas">Mapa de Ventas</TabsTrigger>
                      <TabsTrigger value="editar">Editar Datos</TabsTrigger>
                      <TabsTrigger value="json">Datos JSON</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="resumen" className="mt-4">
                    <ResumenCompleto wizardData={minuta.datos} />
                  </TabsContent>

                  <TabsContent value="mapa-ventas" className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        {datosMapaVentas ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Datos del Mapa de Ventas</h3>
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(datosMapaVentas).map(([key, value]) => (
                                <div key={key} className="border-b pb-2">
                                  <span className="font-medium">{key}: </span>
                                  <span>{formatMapValue(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No hay datos del mapa de ventas disponibles
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="editar" className="mt-4">
                    <MinutaEditarTab
                      editandoDatos={editandoDatos}
                      guardandoDatos={guardandoDatos}
                      datosEditados={datosEditados}
                      minutaDatos={minuta.datos}
                      onEditar={handleEditarDatos}
                      onCancelar={handleCancelarEdicion}
                      onGuardar={handleGuardarDatos}
                      onCambioDato={handleCambioDato}
                    />
                  </TabsContent>

                  <TabsContent value="json" className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(minuta, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comentarios</CardTitle>
                <CardDescription>
                  Agregue comentarios o notas sobre esta minuta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Escriba sus comentarios aquí..."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={4}
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleGuardarComentarios}
                  disabled={procesando}
                >
                  {procesando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Comentarios'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>
                  Gestione el estado de la minuta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {minuta.estado === 'pendiente' && (
                  <>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleCambiarEstado('aprobada')}
                      disabled={procesando}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprobar Minuta
                    </Button>

                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => handleCambiarEstado('cancelada')}
                      disabled={procesando}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Minuta
                    </Button>
                  </>
                )}

                {minuta.estado === 'aprobada' && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleCambiarEstado('firmada')}
                    disabled={procesando}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Marcar como Firmada
                  </Button>
                )}

                {minuta.estado === 'firmada' && (
                  <div className="text-center py-4 text-green-600">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Esta minuta ha sido firmada</p>
                  </div>
                )}

                {minuta.estado === 'cancelada' && (
                  <div className="text-center py-4 text-red-600">
                    <XCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Esta minuta ha sido cancelada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {getDialogTitle(accionPendiente)}
              </DialogTitle>
              <DialogDescription>
                {getDialogDescription(accionPendiente)}
              </DialogDescription>
            </DialogHeader>

            <Textarea
              placeholder="Agregue un comentario (opcional)"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              className="mt-4"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={procesando}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarCambioEstado}
                disabled={procesando}
                variant={accionPendiente === 'aprobada' ? 'default' : 'destructive'}
              >
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    {accionPendiente === 'aprobada' && (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirmar Aprobación
                      </>
                    )}
                    {accionPendiente === 'firmada' && (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Confirmar Firma
                      </>
                    )}
                    {accionPendiente === 'cancelada' && (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Confirmar Cancelación
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/admin/dashboard')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Detalle de Minuta</h1>
      </div>

      {renderMainContent()}

      {/* Contenido oculto para generar PDF */}
      <div className="hidden">
        <div ref={pdfContenidoRef} className="p-8 bg-white">
          {minuta && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Minuta Definitiva</h1>
                <p className="text-lg">{minuta.proyecto}</p>
                <p className="text-sm">Fecha: {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}</p>
                <div className="inline-block mt-2">
                  {getEstadoBadge(minuta.estado)}
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Datos de la Calculadora Comercial</h2>
                {minuta.datos && (
                  <ResumenCompleto wizardData={minuta.datos} />
                )}
              </div>

              {datosMapaVentas && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Datos del Mapa de Ventas</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(datosMapaVentas).map(([key, value]) => (
                      <div key={key} className="border-b pb-2">
                        <span className="font-medium">{key}: </span>
                        <span>{formatMapValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {minuta.comentarios && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Comentarios</h2>
                  <p>{minuta.comentarios}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
