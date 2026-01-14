import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { guardarMinutaDefinitiva, getDatosMapaVentasByUnidadId, actualizarDatosMinutaDefinitiva, actualizarEstadoMinutaDefinitiva } from '@/services/minutas';
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
  const queryClient = useQueryClient();

  // Cargar datos del mapa de ventas para TODAS las unidades cuando se abre el diálogo
  // Helper fuera del componente para reducir anidamiento
  const fetchUnitMapData = (id: string) =>
    getDatosMapaVentasByUnidadId(id).catch(err => {
      console.warn(`Error fetching map data for unit ${id}:`, err);
      return null;
    });

  // Cargar datos del mapa de ventas para TODAS las unidades cuando se abre el diálogo
  useEffect(() => {
    if (!open) return;

    const fetchMultipleUnits = async () => {
      try {
        setLoadingMapaVentas(true);
        const promesas = wizardData.unidades.map(u => fetchUnitMapData(u.id));
        const resultados = await Promise.all(promesas);

        const datosCompletos = resultados.map((datos, index) => ({
          ...datos,
          _wizardData: wizardData.unidades[index]
        })).filter(d => d !== null);

        setDatosMapaVentas(datosCompletos);
      } catch (error) {
        console.error('Error fetching multiple units map data:', error);
        setDatosMapaVentas([]);
      } finally {
        setLoadingMapaVentas(false);
      }
    };

    const fetchSingleUnit = async () => {
      try {
        setLoadingMapaVentas(true);
        const datos = await getDatosMapaVentasByUnidadId(unidadId);
        setDatosMapaVentas(datos ? [datos] : []);
      } catch (error) {
        console.error('Error fetching single unit map data:', error);
        setDatosMapaVentas([]);
      } finally {
        setLoadingMapaVentas(false);
      }
    };

    if (wizardData.unidades?.length > 0) {
      fetchMultipleUnits();
    } else if (unidadId) {
      fetchSingleUnit();
    }
  }, [open, unidadId, wizardData.unidades]);

  // Helper para verificar/crear cliente
  const verifyOrCreateClient = async (data: WizardData['clienteInteresado']) => {
    if (!data?.dni || !data?.nombreApellido) return undefined;

    try {
      const { verificarOCrearCliente } = await import('@/services/clientes');
      const clienteResponse = await verificarOCrearCliente({
        dni: data.dni,
        nombreApellido: data.nombreApellido,
        telefono: data.telefono,
      });

      if (clienteResponse.created) {
        toast({
          title: "Cliente creado",
          description: `Se creó un nuevo cliente: ${clienteResponse.nombreApellido}`,
        });
      }
      return clienteResponse.dni;
    } catch (error) {
      console.error('Error verifying/creating client:', error);
      throw new Error('Error al procesar los datos del cliente');
    }
  };

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

      // 1. Verificar/crear cliente interesado
      let clienteInteresadoDni: number | undefined;
      try {
        clienteInteresadoDni = await verifyOrCreateClient(wizardData.clienteInteresado);
      } catch (clientError) {
        console.error("Fallo al verificar cliente:", clientError);
        toast({
          title: "Error con cliente",
          description: "No se pudo verificar/crear el cliente. Intente nuevamente.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // 2. Preparar datos
      const datosCompletos = {
        ...wizardData,
        unidadCodigo: unidadId,
      };

      // 3. Guardar o Actualizar
      const isEditMode = !!(wizardData as any).minutaId;

      if (isEditMode) {
        const minutaId = (wizardData as any).minutaId;
        await actualizarDatosMinutaDefinitiva(minutaId, {
          datos: datosCompletos,
          clienteInteresadoDni,
        });
        await actualizarEstadoMinutaDefinitiva(minutaId, 'pendiente');

        toast({
          title: "Minuta actualizada",
          description: "La minuta ha sido actualizada y enviada para revisión",
        });
      } else {
        await guardarMinutaDefinitiva({
          proyecto: wizardData.proyecto || 'Sin proyecto',
          usuario_id: user.id,
          datos: datosCompletos,
          estado: 'pendiente',
          clienteInteresadoDni,
        });

        toast({
          title: "Minuta guardada",
          description: "La minuta definitiva ha sido guardada exitosamente",
        });
      }

      setOpen(false);
      if (onSuccess) onSuccess();

      // Refresh cache & Redirect
      queryClient.invalidateQueries({ queryKey: ['minutas'] });
      queryClient.invalidateQueries({ queryKey: ['minutasDefinitivas'] });
      setTimeout(() => navigate('/comercial/dashboard'), 1500);

    } catch (error) {
      console.error('Error saving minuta:', error);
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
// Configuración de campos para el formateo
interface FieldConfig {
  key?: string; // Clave en wizardData o datos del mapa
  label: string;
  wizardKey?: string; // Clave específica en wizardData
  mapKeys?: string[]; // Claves posibles en datos del mapa (soporta anidamiento simple o claves alternativas)
  transform?: (val: any) => string;
  isCurrency?: boolean;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { label: 'Tipo de Unidad', wizardKey: 'tipo', mapKeys: ['tiposunidad.nombre', 'tipo'] },
  { label: 'Descripción', wizardKey: 'descripcion' },
  { label: 'Proyecto', wizardKey: 'proyecto', mapKeys: ['edificios.proyectos.nombre', 'proyectos.nombre'] },
  { label: 'Etapa', wizardKey: 'etapa' },
  { label: 'Precio Lista', wizardKey: 'precioLista', isCurrency: true },
  { label: 'Precio Negociado', wizardKey: 'precioNegociado', isCurrency: true },
  { label: 'Edificio', mapKeys: ['edificios.nombreedificio', 'edificiotorre'] },
  { label: 'Sector', key: 'sectorid' },
  { label: 'Piso', key: 'piso' },
  { label: 'Número de Unidad', key: 'nrounidad' },
  { label: 'Dormitorios', key: 'dormitorios' },
  { label: 'M² Totales', mapKeys: ['unidadesmetricas.m2totales', 'm2totales'], transform: (v) => `${v} m²` },
];

const getValueFromPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

const resolveFieldValue = (config: FieldConfig, datos: any, wizardData: any) => {
  // 1. Try Wizard Data
  if (config.wizardKey && wizardData[config.wizardKey]) {
    return wizardData[config.wizardKey];
  }
  // 2. Try Map Data (only if not found in Wizard or if explicitly looking in map)
  if (config.key && datos[config.key]) {
    return datos[config.key];
  }
  // 3. Try Map Keys
  if (config.mapKeys) {
    for (const key of config.mapKeys) {
      const val = getValueFromPath(datos, key);
      if (val) return val;
    }
  }
  return null;
};

const formatValue = (config: FieldConfig, value: any) => {
  if (config.isCurrency) {
    return `$${Number(value).toLocaleString('es-AR')} USD`;
  }
  if (config.transform) {
    return config.transform(value);
  }
  return String(value);
};

const formatearDatosUnidad = (datos: any): Array<{ label: string; value: string }> => {
  const datosFormateados: Array<{ label: string; value: string }> = [];
  const wizardData = datos._wizardData || {};
  const addedLabels = new Set<string>();

  for (const config of FIELD_CONFIGS) {
    const value = resolveFieldValue(config, datos, wizardData);

    if (value && !addedLabels.has(config.label)) {
      datosFormateados.push({
        label: config.label,
        value: formatValue(config, value)
      });
      addedLabels.add(config.label);
    }
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

