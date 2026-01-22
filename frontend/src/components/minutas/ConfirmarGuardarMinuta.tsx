import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { guardarMinutaProvisoria } from '@/services/minutas';
import { useAuth } from '@/hooks/useAuth';
import { WizardData } from '@/types/wizard';
import { Save, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConfirmarGuardarMinutaProps {
  unidadId: string;
  wizardData: WizardData;
  onSuccess?: () => void;
}

export const ConfirmarGuardarMinuta: React.FC<ConfirmarGuardarMinutaProps> = ({ 
  unidadId, 
  wizardData,
  onSuccess
}) => {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
      
      await guardarMinutaProvisoria({
        proyecto: wizardData.proyecto || 'Sin proyecto',
        UnidadId: unidadId,
        UsuarioId: user.id,
        datos: wizardData,
        estado: 'pendiente'
      });
      
      toast({
        title: "Minuta guardada",
        description: "La minuta provisoria ha sido guardada exitosamente",
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

  // Formateo de moneda
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.00";
    return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Datos que se guardarán en la base de datos
  const datosParaGuardar = {
    proyecto: wizardData.proyecto || 'Sin proyecto',
    UnidadId: unidadId,
    UsuarioId: user?.id || '',
    datos: wizardData,
    estado: 'pendiente' as const,
    FechaCreacion: new Date().toISOString()
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        className="bg-green-600 hover:bg-green-700"
      >
        <Save className="mr-2 h-4 w-4" />
        Guardar Minuta
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Confirmar Guardar Minuta</DialogTitle>
            <DialogDescription>
              Revisa la información que se guardará en la base de datos.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] p-4 rounded-md border">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Datos de la Minuta</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">ID de Unidad:</p>
                    <p className="font-medium">{unidadId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuario:</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado:</p>
                    <p className="font-medium">Pendiente</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Creación:</p>
                    <p className="font-medium">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Datos del Wizard</h3>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">1. Proyecto & Unidad</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Proyecto:</p>
                      <p className="font-medium">{wizardData.proyecto || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unidad:</p>
                      <p className="font-medium">{wizardData.unidadDescripcion || wizardData.unidad || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Posesión:</p>
                      <p className="font-medium">{wizardData.fechaPosesion || "-"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">2. Datos Comerciales</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio Lista:</p>
                      <p className="font-medium">${formatCurrency(wizardData.precioLista)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Precio Negociado:</p>
                      <p className="font-medium">${formatCurrency(wizardData.precioNegociado)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cocheras:</p>
                      <p className="font-medium">{wizardData.cocheras?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Baulera:</p>
                      <p className="font-medium">{wizardData.baulera ? "Sí" : "No"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">3. Composición A/B</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Modo A:</p>
                      <p className="font-medium">{wizardData.modoA === "porcentaje" ? "Porcentaje" : "Importe"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Porcentaje A:</p>
                      <p className="font-medium">{wizardData.porcA || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Moneda A:</p>
                      <p className="font-medium">{wizardData.monedaA || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Moneda B:</p>
                      <p className="font-medium">{wizardData.monedaB || "-"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">4. Pago</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Pago:</p>
                      <p className="font-medium capitalize">{wizardData.tipoPago || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Cambio:</p>
                      <p className="font-medium">${formatCurrency(wizardData.tcValor)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">5. Cargos & Extras</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cargos ARS:</p>
                      <p className="font-medium">${formatCurrency(wizardData.totalCargosArs)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cargos USD:</p>
                      <p className="font-medium">${formatCurrency(wizardData.totalCargosUsd)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium">6. Reglas de Financiación</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">Reglas Parte A:</p>
                      <p className="font-medium">{wizardData.reglasFinanciacionA?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reglas Parte B:</p>
                      <p className="font-medium">{wizardData.reglasFinanciacionB?.length || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">7. Datos Adicionales</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <p className="text-sm text-muted-foreground">% Pagado a Fecha Posesión:</p>
                      <p className="font-medium">{wizardData.porcentajePagadoFechaPosesion || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dólar Referencia:</p>
                      <p className="font-medium">${formatCurrency(wizardData.dolarRef)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Estructura JSON para la Base de Datos</h3>
                <pre className="text-xs bg-black text-white p-4 rounded-md overflow-auto">
                  {JSON.stringify(datosParaGuardar, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
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
    </>
  );
};
