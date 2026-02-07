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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import type { MinutaDefinitiva } from '@/services/minutas';
import html2canvas from 'html2canvas';

// Map item type for mapa de ventas data
interface MapaVentasItem {
  Id?: string;
  id?: string;
  Edificios?: { Proyectos?: { Nombre?: string }; NombreEdificio?: string };
  edificios?: { proyectos?: { nombre?: string }; nombreedificio?: string };
  Etapas?: { Nombre?: string };
  etapas?: { nombre?: string };
  TiposUnidad?: { Nombre?: string };
  tiposunidad?: { nombre?: string };
  SectorId?: string;
  sectorid?: string;
  NroUnidad?: string;
  nrounidad?: string;
  Piso?: string;
  piso?: string;
  Dormitorio?: string;
  dormitorios?: string;
  Frente?: string;
  frente?: string;
  Destino?: string;
  destino?: string;
  Manzana?: string;
  manzana?: string;
  UnidadesMetricas?: {
    M2Total?: number | string;
    m2totales?: number | string;
    M2Cubierto?: number | string;
    m2cubiertos?: number | string;
    M2Exclusivo?: number | string;
    m2exclusivos?: number | string;
    M2Semicubierto?: number | string;
    m2semicubiertos?: number | string;
    M2PatioTerraza?: number | string;
    m2patioterraza?: number | string;
  };
  unidadesmetricas?: {
    M2Total?: number | string;
    m2totales?: number | string;
    M2Cubierto?: number | string;
    m2cubiertos?: number | string;
    M2Exclusivo?: number | string;
    m2exclusivos?: number | string;
    M2Semicubierto?: number | string;
    m2semicubiertos?: number | string;
    M2PatioTerraza?: number | string;
    m2patioterraza?: number | string;
  };
  DetallesVenta_DetallesVenta_UnidadIdToUnidades?: Record<string, unknown>;
  detallesventa_detallesventa_unidad_idTounidades?: Record<string, unknown>;
  _unidad_descripcion?: string;
}

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

const DetalleMinutaModalBase: React.FC<DetalleMinutaModalProps> = ({
  minutaId,
  open,
  onOpenChange
}) => {
  const [minuta, setMinuta] = useState<MinutaDefinitiva | null>(null);
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
        } catch {
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
        return <Badge variant="outline" className="text-white border-[#334366]">{estado}</Badge>;
    }
  };

  const handleChangeEstado = async (nuevoEstado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada') => {
    if (!minutaId || !minuta) return;

    // ⚡ OPTIMISTIC UI: Guardar estado anterior para poder revertir
    const estadoAnterior = minuta.Estado;

    // ⚡ OPTIMISTIC UI: Actualizar UI inmediatamente (sin esperar al backend)
    setMinuta(prev => ({ ...prev, estado: nuevoEstado }));
    setProcesandoEstado(true);

    try {
      // Llamar al backend en segundo plano
      await actualizarEstadoMinutaDefinitiva(minutaId, nuevoEstado);
      // No mostrar toast de éxito - la UI ya se actualizó

    } catch {
      // ⚡ OPTIMISTIC UI: Revertir al estado anterior en caso de error
      setMinuta(prev => ({ ...prev, estado: estadoAnterior }));

      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la minuta. Se revirtió el cambio.",
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
      const descripcionUnidad = typeof minuta.Dato?.unidadDescripcion === 'string' ? minuta.Dato.unidadDescripcion : 'Unidad';
      const fileName = `Minuta_Consolidada_${minuta.Proyecto || 'Proyecto'}_${descripcionUnidad}_${new Date().toISOString().split('T')[0]}.pdf`;

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
    } catch {
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
            <TabsTrigger value="resumen">Minuta Comercial</TabsTrigger>
            <TabsTrigger value="mapa-ventas">Mapa de Ventas</TabsTrigger>
            <TabsTrigger value="json">Datos JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado">
            <div ref={consolidadoRef} className="p-4 bg-card border border-border rounded-md text-card-foreground">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Datos de la Minuta Comercial</h2>
                <ResumenCompleto wizardData={minuta.Dato as unknown as import('@/types/wizard').WizardData} />
              </div>

              {minuta.DatoMapaVenta && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Datos del Mapa de Ventas</h2>
                  <div className="space-y-4">
                    {(() => {
                      let mapData: unknown = minuta.DatoMapaVenta;
                      if (typeof mapData === 'string') {
                        try { mapData = JSON.parse(mapData); } catch { /* ignore */ }
                      }
                      const mapas = Array.isArray(mapData) ? mapData : [mapData];

                      return mapas.map((item: MapaVentasItem, index: number) => {
                        if (!item) return null; // Defensive check
                        const proyecto = item.Edificios?.Proyectos?.Nombre || item.edificios?.proyectos?.nombre || '-';
                        const etapa = item.Etapas?.Nombre || item.etapas?.nombre || '-';
                        const edificio = item.Edificios?.NombreEdificio || item.edificios?.nombreedificio || '-';
                        const tipoUnidad = item.TiposUnidad?.Nombre || item.tiposunidad?.nombre || '-';
                        const sector = item.SectorId || item.sectorid || '-';
                        const nroUnidad = item.NroUnidad || item.nrounidad || '-';
                        const piso = item.Piso || item.piso || '-';
                        const dormitorios = item.Dormitorio || item.dormitorios || '-';
                        const frente = item.Frente || item.frente || '-';
                        const destino = item.Destino || item.destino || '-';
                        const manzana = item.Manzana || item.manzana || '-';

                        const metricas = item.UnidadesMetricas || item.unidadesmetricas || {};
                        const m2Totales = metricas.M2Total || metricas.m2totales || '-';
                        const m2Cubiertos = metricas.M2Cubierto || metricas.m2cubiertos || '-';
                        const m2Exclusivos = metricas.M2Exclusivo || metricas.m2exclusivos || '-';
                        const m2Semicubiertos = metricas.M2Semicubierto || metricas.m2semicubiertos || '-';
                        const m2PatioTerraza = metricas.M2PatioTerraza || metricas.m2patioterraza || '-';

                        const detallesVenta = (item.DetallesVenta_DetallesVenta_UnidadIdToUnidades || item.detallesventa_detallesventa_unidad_idTounidades || {});
                        const _precioUsd = detallesVenta.PrecioUsd || detallesVenta.preciousd ? `USD ${Number(detallesVenta.PrecioUsd || detallesVenta.preciousd).toLocaleString('es-AR')}` : '-';
                        const _usdM2 = detallesVenta.UsdM2 || detallesVenta.usdm2 ? `USD ${Number(detallesVenta.UsdM2 || detallesVenta.usdm2).toLocaleString('es-AR')}` : '-';
                        const estadoComercial = detallesVenta.EstadoComercial as { NombreEstado?: string } | undefined;
                        const estadoComercialLower = detallesVenta.estadocomercial as { nombreestado?: string } | undefined;
                        const _estado = estadoComercial?.NombreEstado || estadoComercialLower?.nombreestado || '-';

                        const descripcionUnidad = item._unidad_descripcion || `${sector} - ${edificio} - Unidad ${nroUnidad}`;

                        return (
                          <div key={item.Id || item.id || index} className="border border-border rounded-lg overflow-hidden bg-background">
                            <div className="bg-muted/50 px-4 py-2 border-b border-border">
                              <h3 className="font-semibold flex items-center gap-2 text-card-foreground">
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded">Unidad {index + 1}</span>
                                {descripcionUnidad}
                              </h3>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                              {/* Ubicación */}
                              <div>
                                <h4 className="font-semibold text-white mb-2">📍 Ubicación</h4>
                                <div className="space-y-1">
                                  <div><span className="font-medium text-white">Proyecto:</span> {proyecto}</div>
                                  <div><span className="font-medium text-card-foreground">Etapa:</span> {etapa}</div>
                                  <div><span className="font-medium text-card-foreground">Edificio:</span> {edificio}</div>
                                  <div><span className="font-medium text-card-foreground">Sector:</span> {sector}</div>
                                  <div><span className="font-medium text-card-foreground">Piso:</span> {piso}</div>
                                  <div><span className="font-medium text-card-foreground">Nro Unidad:</span> {nroUnidad}</div>
                                  {/* Agregar manzana, frente, destino si faltaban antes */}
                                  <div><span className="font-medium text-card-foreground">Manzana:</span> {manzana}</div>
                                  <div><span className="font-medium text-card-foreground">Frente:</span> {frente}</div>
                                </div>
                              </div>
                              {/* Características */}
                              <div>
                                <h4 className="font-semibold text-card-foreground mb-2">🏠 Características</h4>
                                <div className="space-y-1">
                                  <div><span className="font-medium text-card-foreground">Tipo:</span> {tipoUnidad}</div>
                                  <div><span className="font-medium text-card-foreground">Dormitorios:</span> {dormitorios}</div>
                                  <div><span className="font-medium text-card-foreground">Destino:</span> {destino}</div>
                                </div>
                              </div>
                              {/* Superficies */}
                              <div>
                                <h4 className="font-semibold text-card-foreground mb-2">📐 Superficies</h4>
                                <div className="space-y-1">
                                  <div><span className="font-medium text-card-foreground">Total:</span> {String(m2Totales)} m²</div>
                                  <div><span className="font-medium text-card-foreground">Cubiertos:</span> {String(m2Cubiertos)} m²</div>
                                  <div><span className="font-medium text-card-foreground">Exclusivos:</span> {String(m2Exclusivos)} m²</div>
                                  <div><span className="font-medium text-card-foreground">Semicubiertos:</span> {String(m2Semicubiertos)} m²</div>
                                  <div><span className="font-medium text-card-foreground">Patio/Terraza:</span> {String(m2PatioTerraza)} m²</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {minuta.Comentario && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Comentarios</h2>
                  <p>{minuta.Comentario}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resumen">
            <div>
              <ResumenCompleto wizardData={minuta.Dato as unknown as import('@/types/wizard').WizardData} />
            </div>
          </TabsContent>

          <TabsContent value="mapa-ventas">
            <div className="space-y-6">
              {(() => {
                let mapData: unknown = minuta.DatoMapaVenta;

                // Parse strings if necessary (fallback)
                if (typeof mapData === 'string') {
                  try { mapData = JSON.parse(mapData); } catch { /* ignore */ }
                }

                const mapas = Array.isArray(mapData) ? mapData : [mapData];

                return mapas.map((item: MapaVentasItem, index: number) => {
                  if (!item) return null; // Defensive check
                  // Extraer datos de forma estructurada - Usando PascalCase
                  const proyecto = item.Edificios?.Proyectos?.Nombre || item.edificios?.proyectos?.nombre || '-';
                  const etapa = item.Etapas?.Nombre || item.etapas?.nombre || '-';
                  const edificio = item.Edificios?.NombreEdificio || item.edificios?.nombreedificio || '-';
                  const tipoUnidad = item.TiposUnidad?.Nombre || item.tiposunidad?.nombre || '-';
                  const sector = item.SectorId || item.sectorid || '-';
                  const nroUnidad = item.NroUnidad || item.nrounidad || '-';
                  const piso = item.Piso || item.piso || '-';
                  const dormitorios = item.Dormitorio || item.dormitorios || '-'; // Dormitorio singular en backend nuevo
                  const frente = item.Frente || item.frente || '-';
                  const destino = item.Destino || item.destino || '-';
                  const manzana = item.Manzana || item.manzana || '-';

                  // Datos métricos
                  const metricas = item.UnidadesMetricas || item.unidadesmetricas || {};
                  const m2Totales = metricas.M2Total || metricas.m2totales || '-';
                  const m2Cubiertos = metricas.M2Cubierto || metricas.m2cubiertos || '-';
                  const m2Exclusivos = metricas.M2Exclusivo || metricas.m2exclusivos || '-';
                  const m2Semicubiertos = metricas.M2Semicubierto || metricas.m2semicubiertos || '-';
                  const m2PatioTerraza = metricas.M2PatioTerraza || metricas.m2patioterraza || '-';

                  // Removed unused variables: detallesVenta, precioUsd, usdM2, estado

                  const descripcionUnidad = item._unidad_descripcion || `${sector} - ${edificio} - Unidad ${nroUnidad}`;

                  return (
                    <Card key={item.Id || item.id || index} className="overflow-hidden border border-border bg-background">
                      <CardHeader className="bg-muted/50 pb-3 border-b border-border">
                        <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Unidad {index + 1}</Badge>
                          <span className="text-card-foreground">{descripcionUnidad}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Información General */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground border-b border-border pb-1">📍 Ubicación</h4>
                            <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                              <span className="font-medium text-card-foreground">Proyecto:</span><span>{proyecto}</span>
                              <span className="font-medium text-card-foreground">Etapa:</span><span>{etapa}</span>
                              <span className="font-medium text-card-foreground">Edificio:</span><span>{edificio}</span>
                              <span className="font-medium text-card-foreground">Sector:</span><span>{sector}</span>
                              <span className="font-medium text-card-foreground">Piso:</span><span>{piso}</span>
                              <span className="font-medium text-card-foreground">Nro Unidad:</span><span>{nroUnidad}</span>
                              <span className="font-medium text-card-foreground">Manzana:</span><span>{manzana}</span>
                              <span className="font-medium text-card-foreground">Frente:</span><span>{frente}</span>
                            </div>
                          </div>

                          {/* Características */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground border-b border-border pb-1">🏠 Características</h4>
                            <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                              <span className="font-medium text-card-foreground">Tipo:</span><span>{tipoUnidad}</span>
                              <span className="font-medium text-card-foreground">Dormitorios:</span><span>{dormitorios}</span>
                              <span className="font-medium text-card-foreground">Destino:</span><span>{destino}</span>
                            </div>
                          </div>

                          {/* Superficies */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground border-b border-border pb-1">📐 Superficies</h4>
                            <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                              <span className="font-medium text-card-foreground">Total:</span><span>{String(m2Totales)} m²</span>
                              <span className="font-medium text-card-foreground">Cubiertos:</span><span>{String(m2Cubiertos)} m²</span>
                              <span className="font-medium text-card-foreground">Exclusivos:</span><span>{String(m2Exclusivos)} m²</span>
                              <span className="font-medium text-card-foreground">Semicubiertos:</span><span>{String(m2Semicubiertos)} m²</span>
                              <span className="font-medium text-card-foreground">Patio/Terraza:</span><span>{String(m2PatioTerraza)} m²</span>
                            </div>
                          </div>


                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </TabsContent>

          <TabsContent value="json">
            <Card className="bg-muted/10 border-border">
              <CardContent className="pt-6">
                <pre className="text-xs overflow-auto text-muted-foreground">
                  {JSON.stringify(minuta, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {minuta.Comentario && (
          <div className="mt-4 p-4 bg-muted/10 border border-border rounded-md text-muted-foreground">
            <h3 className="font-medium mb-2 text-card-foreground">Observaciones:</h3>
            <p className="text-sm">{minuta.Comentario}</p>
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
          {minuta.Estado === 'pendiente' && !isComercial && (
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">Detalles de la Minuta</span>
            {minuta && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {getEstadoBadge(minuta.Estado)}
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {minuta && "Información detallada de la minuta provisoria"}
          </DialogDescription>

          {minuta && (
            <div className="flex flex-col gap-3 mt-4">
              {/* Proyecto y Fecha */}
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Proyecto: </span>
                  <span className="text-card-foreground">{minuta.Proyectos?.nombre || minuta.Proyecto}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Fecha: </span>
                  <span className="text-card-foreground">{new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}</span>
                </div>
              </div>

              {/* Email del Comercial */}
              {minuta.users?.email && (
                <div className="text-sm">
                  <span className="font-medium text-muted-foreground">Comercial: </span>
                  <span className="text-card-foreground">{minuta.users.email}</span>
                </div>
              )}

              {/* Status Progress Indicator */}
              <div className="flex items-center justify-center py-2">
                {(() => {
                  const estados = ['en_edicion', 'pendiente', 'aprobada', 'firmada'];
                  const estadoLabels: Record<string, string> = {
                    'en_edicion': 'En Edición',
                    'pendiente': 'Pendiente',
                    'aprobada': 'Aprobada',
                    'firmada': 'Firmada'
                  };
                  const estadoActual = minuta.Estado;
                  const indexActual = estados.indexOf(estadoActual);

                  // Si está cancelada/rechazada, mostrar diferente
                  if (estadoActual === 'cancelada' || estadoActual === 'rechazada') {
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-red-600 font-medium capitalize">{estadoActual}</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center">
                      {estados.map((estado, idx) => {
                        const isPast = idx < indexActual;
                        const isCurrent = idx === indexActual;
                        let indicator: React.ReactNode;
                        if (isPast) {
                          indicator = <CheckCircle className="w-4 h-4" />;
                        } else if (isCurrent) {
                          indicator = <span>●</span>;
                        } else {
                          indicator = <span className="text-[10px]">{idx + 1}</span>;
                        }

                        return (
                          <div key={estado} className="flex items-center">
                            {/* Bubble */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isCurrent
                                  ? 'bg-green-500 text-white ring-2 ring-green-300 ring-offset-2'
                                  : isPast
                                    ? 'bg-gray-400 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                  }`}
                              >
                                {indicator}
                              </div>
                              <span
                                className={`text-[10px] mt-1 ${isCurrent ? 'text-green-400 font-semibold' : 'text-[#5a6a8b]'
                                  }`}
                              >
                                {estadoLabels[estado] || estado}
                              </span>
                            </div>
                            {/* Connecting line */}
                            {idx < estados.length - 1 && (
                              <div
                                className={`w-8 h-0.5 mx-1 -mt-6 ${idx < indexActual ? 'bg-[#5a6a8b]' : 'bg-[#334366]'
                                  }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export const DetalleMinutaModal = React.memo(DetalleMinutaModalBase);
