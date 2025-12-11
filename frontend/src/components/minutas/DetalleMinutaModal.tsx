import React, { useState, useEffect, useRef } from 'react';
import { getMinutaDefinitivaById, actualizarEstadoMinutaDefinitiva } from '@/services/minutas';
import { ResumenCompleto } from '@/components/wizard/ResumenCompleto';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { X, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to format values for display
const formatDisplayValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

// Helper function to get estado description
const getEstadoDescription = (estado: string): string => {
  if (estado === 'aprobada') return 'aprobada';
  if (estado === 'firmada') return 'firmada';
  return 'cancelada';
};

interface DetalleMinutaModalProps {
  minutaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DetalleMinutaModal: React.FC<DetalleMinutaModalProps> = ({
  minutaId,
  open,
  onOpenChange
}) => {
  const [minuta, setMinuta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoEstado, setProcesandoEstado] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Check if user is commercial by checking the URL path
  const isComercial = globalThis.location.pathname.includes('/comercial/');

  const consolidadoRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && minutaId) {
      const fetchMinuta = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getMinutaDefinitivaById(minutaId);
          setMinuta(data);
        } catch (err) {
          console.error('Error al cargar minuta:', err);
          setError('No se pudo cargar la información de la minuta');
        } finally {
          setLoading(false);
        }
      };

      fetchMinuta();
    }
  }, [minutaId, open]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'revisada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Revisada</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handleChangeEstado = async (nuevoEstado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada') => {
    if (!minutaId) return;

    try {
      setProcesandoEstado(true);
      await actualizarEstadoMinutaDefinitiva(minutaId, nuevoEstado);

      // Actualizar el estado local
      setMinuta(prev => ({ ...prev, estado: nuevoEstado }));

      toast({
        title: "Estado actualizado",
        description: `La minuta ha sido ${getEstadoDescription(nuevoEstado)} exitosamente`,
      });

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la minuta",
        variant: "destructive",
      });
    } finally {
      setProcesandoEstado(false);
    }
  };

  const handleDownloadConsolidatedPDF = async () => {
    if (!consolidadoRef.current || !minuta) return;

    try {
      setIsGeneratingPDF(true);

      // Crear nombre del archivo
      const fileName = `Minuta_Consolidada_${minuta.proyecto || 'Proyecto'}_${minuta.datos?.unidadDescripcion || 'Unidad'}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Enfoque simple: usar jsPDF y html2canvas directamente
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const element = consolidadoRef.current;

      // Usar html2canvas con configuración mínima
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false
      });

      // Convertir canvas a imagen
      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      // Obtener dimensiones
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const aspectRatio = canvas.width / canvas.height;
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth / aspectRatio;

      // Añadir imagen al PDF (usar valores fijos para evitar cálculos que puedan causar errores)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Si la imagen es más alta que la página, añadir páginas adicionales
      let heightLeft = imgHeight - pdfHeight;
      let position = -pdfHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        position -= pdfHeight;
      }

      // Guardar PDF
      pdf.save(fileName);

      toast({
        title: "PDF generado",
        description: "El PDF consolidado ha sido generado exitosamente",
      });
    } catch (error) {
      console.error('Error al generar el PDF consolidado:', error);
      toast({
        title: "Error",
        description: "Hubo un error al generar el PDF consolidado. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Función para generar el PDF consolidado

  // Render content based on state
  const renderContent = () => {
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
        <Tabs defaultValue="consolidado" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="consolidado">Vista Consolidada</TabsTrigger>
            <TabsTrigger value="resumen">Calculadora</TabsTrigger>
            <TabsTrigger value="mapa-ventas">Mapa de Ventas</TabsTrigger>
            <TabsTrigger value="json">Datos JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado">
            <div ref={consolidadoRef} className="p-4 bg-white rounded-md">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Datos de la Calculadora Comercial</h2>
                <ResumenCompleto wizardData={minuta.datos} />
              </div>

              {minuta.datos_mapa_ventas && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Datos del Mapa de Ventas</h2>
                  <div className="bg-white border rounded-md p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sección de Información General */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <h3 className="text-md font-semibold mb-2 text-slate-800">Información General</h3>
                          <div className="space-y-2">
                            {['proyecto', 'torre', 'piso', 'unidad', 'tipo_unidad', 'superficie_total'].map(key => (
                              minuta.datos_mapa_ventas[key] && (
                                <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                  <span className="font-medium capitalize">{key.replace('_', ' ')}: </span>
                                  <span className="text-slate-700">{String(minuta.datos_mapa_ventas[key])}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sección de Precios y Pagos */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <h3 className="text-md font-semibold mb-2 text-slate-800">Precios y Pagos</h3>
                          <div className="space-y-2">
                            {['precio_lista', 'precio_final', 'forma_pago', 'descuento', 'monto_reserva'].map(key => (
                              minuta.datos_mapa_ventas[key] && (
                                <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                  <span className="font-medium capitalize">{key.replaceAll('_', ' ')}: </span>
                                  <span className="text-slate-700">{String(minuta.datos_mapa_ventas[key])}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sección de Cliente */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <h3 className="text-md font-semibold mb-2 text-slate-800">Información del Cliente</h3>
                          <div className="space-y-2">
                            {['nombre_cliente', 'apellido_cliente', 'email_cliente', 'telefono_cliente'].map(key => (
                              minuta.datos_mapa_ventas[key] && (
                                <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                  <span className="font-medium capitalize">{key.replaceAll('_', ' ')}: </span>
                                  <span className="text-slate-700">{String(minuta.datos_mapa_ventas[key])}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sección de Fechas */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <h3 className="text-md font-semibold mb-2 text-slate-800">Fechas Importantes</h3>
                          <div className="space-y-2">
                            {['fecha_reserva', 'fecha_promesa', 'fecha_escritura', 'fecha_entrega'].map(key => (
                              minuta.datos_mapa_ventas[key] && (
                                <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                  <span className="font-medium capitalize">{key.replaceAll('_', ' ')}: </span>
                                  <span className="text-slate-700">{String(minuta.datos_mapa_ventas[key])}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Otros datos que no encajan en las categorías anteriores */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <h3 className="text-md font-semibold mb-2 text-slate-800">Información Adicional</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(minuta.datos_mapa_ventas)
                              .filter(([key]) => ![
                                'proyecto', 'torre', 'piso', 'unidad', 'tipo_unidad', 'superficie_total',
                                'precio_lista', 'precio_final', 'forma_pago', 'descuento', 'monto_reserva',
                                'nombre_cliente', 'apellido_cliente', 'email_cliente', 'telefono_cliente',
                                'fecha_reserva', 'fecha_promesa', 'fecha_escritura', 'fecha_entrega'
                              ].includes(key))
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                  <span className="font-medium capitalize">{key.replaceAll('_', ' ')}: </span>
                                  <span className="text-slate-700">{formatDisplayValue(value)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {minuta.comentarios && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Comentarios</h2>
                  <p>{minuta.comentarios}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resumen">
            <div>
              <ResumenCompleto wizardData={minuta.datos} />
            </div>
          </TabsContent>

          <TabsContent value="mapa-ventas">
            <Card>
              <CardContent className="pt-6">
                {minuta.datos_mapa_ventas ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Mapa de Ventas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(minuta.datos_mapa_ventas).map(([key, value]) => (
                        <div key={key} className="border-b pb-2">
                          <span className="font-medium">{key}: </span>
                          <span>{formatDisplayValue(value)}</span>
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

          <TabsContent value="json">
            <Card>
              <CardContent className="pt-6">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(minuta, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {minuta.comentarios && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Comentarios de Administración:</h3>
            <p className="text-sm">{minuta.comentarios}</p>
          </div>
        )}

        <DialogFooter className="mt-6 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>

          {/* Botón para descargar PDF - oculto para comerciales */}
          {!isComercial && (
            <Button
              onClick={handleDownloadConsolidatedPDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </>
              )}
            </Button>
          )}

          {/* Botones para cambiar estado (solo visibles para administradores, no para comerciales) */}
          {minuta.estado === 'pendiente' && !isComercial && (
            <div className="flex gap-2 w-full mt-4 justify-end">
              <Button
                onClick={() => handleChangeEstado('cancelada')}
                disabled={procesandoEstado}
                variant="destructive"
              >
                {procesandoEstado ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Denegar
              </Button>
              <Button
                onClick={() => handleChangeEstado('aprobada')}
                disabled={procesandoEstado}
                className="bg-green-600 hover:bg-green-700"
              >
                {procesandoEstado ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aprobar
              </Button>
            </div>
          )}
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles de la Minuta</span>
            {minuta && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {getEstadoBadge(minuta.estado)}
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {minuta && "Información detallada de la minuta provisoria"}
          </DialogDescription>

          {minuta && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4 text-sm">
              <div>
                <span className="font-medium">Proyecto: </span>
                <span>{minuta.proyecto}</span>
              </div>
              <div>
                <span className="font-medium">Unidad: </span>
                <span>{minuta.datos?.unidadDescripcion || minuta.datos?.unidadCodigo || 'Sin unidad'}</span>
              </div>
              <div>
                <span className="font-medium">Fecha: </span>
                <span>{new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
          )}
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
