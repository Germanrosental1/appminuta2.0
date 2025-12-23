import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { guardarMinutaDefinitiva, getDatosMapaVentasByUnidadId } from '@/services/minutas';
import { useAuth } from '@/hooks/useAuth';
import { WizardData } from '@/types/wizard';
import { Save, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfirmarGuardarMinutaDefinitivaProps {
  unidadId: string;
  wizardData: WizardData;
  onSuccess?: () => void;
}

export const ConfirmarGuardarMinutaDefinitiva: React.FC<ConfirmarGuardarMinutaDefinitivaProps> = ({
  unidadId,
  wizardData,
  onSuccess
}) => {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  // Cambiar a array para soportar múltiples unidades
  const [datosMapaVentas, setDatosMapaVentas] = useState<any[]>([]);
  const [loadingMapaVentas, setLoadingMapaVentas] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cargar datos del mapa de ventas para TODAS las unidades cuando se abre el diálogo
  useEffect(() => {
    if (open && wizardData.unidades && wizardData.unidades.length > 0) {
      const fetchDatosMapaVentas = async () => {
        try {
          setLoadingMapaVentas(true);
          // Cargar datos para cada unidad seleccionada
          const promesas = wizardData.unidades.map(unidad =>
            getDatosMapaVentasByUnidadId(unidad.id).catch(() => null)
          );
          const resultados = await Promise.all(promesas);
          // Filtrar nulls y combinar con info de unidad del wizard
          const datosCompletos = resultados.map((datos, index) => ({
            ...datos,
            // Agregar datos del wizard por si el mapa de ventas no tiene todo
            _wizardData: wizardData.unidades[index]
          })).filter(d => d !== null);
          setDatosMapaVentas(datosCompletos);
        } catch {
          // Error silencioso, mostraremos los datos del wizard como fallback
        } finally {
          setLoadingMapaVentas(false);
        }
      };
      fetchDatosMapaVentas();
    } else if (open && unidadId) {
      // Fallback para modelo antiguo con una sola unidad
      const fetchSingleUnit = async () => {
        try {
          setLoadingMapaVentas(true);
          const datos = await getDatosMapaVentasByUnidadId(unidadId);
          setDatosMapaVentas(datos ? [datos] : []);
        } catch {
          setDatosMapaVentas([]);
        } finally {
          setLoadingMapaVentas(false);
        }
      };
      fetchSingleUnit();
    }
  }, [open, unidadId, wizardData.unidades]);

  const handleGuardar = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para guardar la minuta",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Asegurarnos de que el código de la unidad esté incluido en los datos
      const datosCompletos = {
        ...wizardData,
        unidadCodigo: unidadId, // Agregar el código de la unidad a los datos
      };

      await guardarMinutaDefinitiva({
        proyecto: wizardData.proyecto || 'Sin proyecto',
        usuario_id: user.id,
        datos: datosCompletos,
        estado: 'pendiente'
      });

      toast({
        title: "Minuta guardada",
        description: "La minuta definitiva ha sido guardada exitosamente",
      });

      setOpen(false);

      if (onSuccess) {
        onSuccess();
      }

      // Redirigir al dashboard comercial después de un breve retraso
      setTimeout(() => {
        navigate('/comercial/dashboard');
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la minuta. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Datos que se guardarán en la minuta definitiva
  const datosParaGuardar = {
    proyecto: wizardData.proyecto || 'Sin proyecto',
    unidad_id: unidadId,
    usuario_id: user?.id || '',
    datos: wizardData,
    datos_mapa_ventas: datosMapaVentas,
    estado: 'pendiente' as const,
    fecha_creacion: new Date().toISOString()
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Save className="mr-2 h-4 w-4" />
          Guardar Minuta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Confirmar Guardar Minuta</DialogTitle>
          <DialogDescription>
            Revisa los datos antes de guardar la minuta definitiva
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resumen">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="mapa-ventas">
              Mapa de Ventas {loadingMapaVentas && "(Cargando...)"}
            </TabsTrigger>
            <TabsTrigger value="json">Datos JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="resumen" className="mt-4">
            <ScrollArea className="h-[50vh]">
              <Card>
                <CardContent className="pt-6">
                  <MapaVentasContent
                    loading={loadingMapaVentas}
                    datos={datosMapaVentas}
                  />
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="json" className="mt-4">
            <ScrollArea className="h-[50vh]">
              <Card>
                <CardContent className="pt-6">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(datosParaGuardar, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Confirmar y Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Mapeo de campos técnicos a nombres legibles
const FIELD_LABELS: Record<string, string> = {
  sectorid: 'Sector',
  nrounidad: 'Número de Unidad',
  piso: 'Piso',
  dormitorios: 'Dormitorios',
  manzana: 'Manzana',
  destino: 'Destino',
  frente: 'Frente',
  nombreedificio: 'Edificio',
  nombre: 'Nombre',
  estado: 'Estado',
  etapa: 'Etapa',
  tipo: 'Tipo de Unidad',
  proyecto: 'Proyecto',
  m2totales: 'M² Totales',
  m2cubiertos: 'M² Cubiertos',
  m2semicubiertos: 'M² Semicubiertos',
  preciolista: 'Precio de Lista (USD)',
};

// Campos a ocultar (IDs técnicos)
const HIDDEN_FIELDS = new Set(['id', 'edificio_id', 'tipounidad_id', 'etapa_id', 'proyecto_id', 'edificios', 'proyectos', 'tiposunidad', 'unidadesmetricas', '_wizardData']);

// Función para formatear datos de una unidad
const formatearDatosUnidad = (datos: any): Array<{ label: string; value: string }> => {
  const datosFormateados: Array<{ label: string; value: string }> = [];

  // Primero usar datos del wizard si están disponibles (más confiables)
  const wizardData = datos._wizardData;
  if (wizardData) {
    if (wizardData.tipo) datosFormateados.push({ label: 'Tipo de Unidad', value: wizardData.tipo });
    if (wizardData.descripcion) datosFormateados.push({ label: 'Descripción', value: wizardData.descripcion });
    if (wizardData.proyecto) datosFormateados.push({ label: 'Proyecto', value: wizardData.proyecto });
    if (wizardData.etapa) datosFormateados.push({ label: 'Etapa', value: wizardData.etapa });
    if (wizardData.precioLista) datosFormateados.push({ label: 'Precio Lista', value: `$${Number(wizardData.precioLista).toLocaleString('es-AR')} USD` });
    if (wizardData.precioNegociado) datosFormateados.push({ label: 'Precio Negociado', value: `$${Number(wizardData.precioNegociado).toLocaleString('es-AR')} USD` });
  }

  // Extraer datos adicionales de relaciones anidadas del mapa de ventas
  const edificioNombre = datos.edificios?.nombreedificio || datos.edificiotorre;
  const proyectoNombre = datos.edificios?.proyectos?.nombre || datos.proyectos?.nombre;
  const tipoUnidad = datos.tiposunidad?.nombre || datos.tipo;
  const m2Totales = datos.unidadesmetricas?.m2totales || datos.m2totales;

  // Agregar solo si no están ya del wizard
  if (proyectoNombre && !datosFormateados.some(d => d.label === 'Proyecto')) {
    datosFormateados.push({ label: 'Proyecto', value: proyectoNombre });
  }
  if (edificioNombre && !datosFormateados.some(d => d.label === 'Edificio')) {
    datosFormateados.push({ label: 'Edificio', value: edificioNombre });
  }
  if (tipoUnidad && !datosFormateados.some(d => d.label === 'Tipo de Unidad')) {
    datosFormateados.push({ label: 'Tipo de Unidad', value: tipoUnidad });
  }
  if (datos.sectorid) datosFormateados.push({ label: 'Sector', value: datos.sectorid });
  if (datos.piso) datosFormateados.push({ label: 'Piso', value: datos.piso });
  if (datos.nrounidad) datosFormateados.push({ label: 'Número de Unidad', value: datos.nrounidad });
  if (datos.dormitorios) datosFormateados.push({ label: 'Dormitorios', value: String(datos.dormitorios) });
  if (m2Totales && !datosFormateados.some(d => d.label.includes('M²'))) {
    datosFormateados.push({ label: 'M² Totales', value: `${m2Totales} m²` });
  }

  return datosFormateados;
};

// Componente auxiliar para mostrar el contenido del mapa de ventas (múltiples unidades)
const MapaVentasContent: React.FC<{ loading: boolean; datos: any[] }> = ({ loading, datos }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos del mapa de ventas...</span>
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron datos del mapa de ventas para las unidades seleccionadas
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">
        Unidades Seleccionadas ({datos.length})
      </h3>

      {datos.map((unidadDatos, index) => {
        const datosFormateados = formatearDatosUnidad(unidadDatos);
        const wizardData = unidadDatos._wizardData;
        const titulo = wizardData
          ? `${wizardData.tipo}: ${wizardData.descripcion}`
          : `Unidad ${index + 1}`;

        return (
          <div key={wizardData?.id || index} className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                {index + 1}
              </span>
              {titulo}
            </h4>

            {datosFormateados.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {datosFormateados.map(({ label, value }) => (
                  <div key={label} className="border-b pb-2">
                    <span className="font-medium text-muted-foreground text-sm">{label}: </span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No hay datos adicionales disponibles
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

