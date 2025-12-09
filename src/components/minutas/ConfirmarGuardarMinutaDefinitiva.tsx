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
import { ResumenCompleto } from '@/components/wizard/ResumenCompleto';

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
  const [datosMapaVentas, setDatosMapaVentas] = useState<any>(null);
  const [loadingMapaVentas, setLoadingMapaVentas] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Cargar datos del mapa de ventas cuando se abre el diálogo
  useEffect(() => {
    if (open && unidadId) {
      const fetchDatosMapaVentas = async () => {
        try {
          setLoadingMapaVentas(true);
          const datos = await getDatosMapaVentasByUnidadId(unidadId);
          setDatosMapaVentas(datos);
        } catch (error) {
          console.error('Error al cargar datos del mapa de ventas:', error);
        } finally {
          setLoadingMapaVentas(false);
        }
      };
      
      fetchDatosMapaVentas();
    }
  }, [open, unidadId]);

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
      console.error('Error al guardar la minuta:', error);
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
              <ResumenCompleto wizardData={wizardData} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="mapa-ventas" className="mt-4">
            <ScrollArea className="h-[50vh]">
              <Card>
                <CardContent className="pt-6">
                  {loadingMapaVentas ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Cargando datos del mapa de ventas...</span>
                    </div>
                  ) : datosMapaVentas ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Datos del Mapa de Ventas</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(datosMapaVentas).map(([key, value]) => (
                          <div key={key} className="border-b pb-2">
                            <span className="font-medium">{key}: </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron datos del mapa de ventas para esta unidad
                    </div>
                  )}
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
