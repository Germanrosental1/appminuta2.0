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

      // Datos que se guardarán en la base de datos
      const datosParaGuardar = {
        Proyecto: wizardData.proyecto || 'Sin proyecto',
        UnidadId: unidadId,
        UsuarioId: user?.id || '',
        Dato: wizardData,
        Estado: 'pendiente' as const,
        FechaCreacion: new Date().toISOString()
      };
      await guardarMinutaProvisoria(datosParaGuardar);

      toast({
        title: "Minuta guardada",
        description: "La minuta provisoria ha sido guardada exitosamente",
        variant: "default", // Changed to default variant which usually means success/neutral in shadcn
        className: "bg-green-600 text-white border-green-700"
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

  const SectionCard = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: React.ElementType }) => (
    <div className="bg-[#1e293b] rounded-lg border border-slate-700 overflow-hidden shadow-lg mb-6">
      <div className="bg-slate-800/50 border-b border-slate-700 p-4 flex items-center border-l-4 border-blue-500">
        {Icon && <Icon className="w-5 h-5 text-blue-400 mr-2" />}
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, isCurrency = false, highlight = false }: { label: string, value: string | number | undefined | null, isCurrency?: boolean, highlight?: boolean }) => (
    <div className="mb-2">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-bold text-white ${highlight ? 'text-lg text-blue-400' : 'text-base'}`}>
        {isCurrency ? `$${formatCurrency(value as number)}` : (value || "-")}
      </p>
    </div>
  );

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-green-600 hover:bg-green-700 font-semibold shadow-lg shadow-green-900/20"
      >
        <Save className="mr-2 h-4 w-4" />
        Guardar Minuta
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl bg-[#0f172a] border-slate-700 text-white">
          <DialogHeader className="border-b border-slate-800 pb-4">
            <DialogTitle className="text-2xl font-bold text-white">Confirmar Guardar Minuta</DialogTitle>
            <DialogDescription className="text-slate-400">
              Revisa la información antes de generar la minuta provisoria.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4 mt-4">
            <div className="space-y-6 pb-6">

              {/* 1. Proyecto & Unidad */}
              <SectionCard title="1. Proyecto & Unidad">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <InfoRow label="Proyecto" value={wizardData.proyecto} highlight />
                  <InfoRow label="Unidad" value={wizardData.unidadDescripcion || wizardData.unidad} highlight />
                  <InfoRow label="Fecha Posesión" value={wizardData.fechaPosesion} />
                </div>
              </SectionCard>

              {/* 2. Datos Comerciales */}
              <SectionCard title="2. Datos Comerciales">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <InfoRow label="Precio Lista" value={wizardData.precioLista} isCurrency />
                  <InfoRow label="Precio Negociado" value={wizardData.precioNegociado} isCurrency highlight />
                  <InfoRow label="Cocheras" value={wizardData.cocheras?.length || 0} />
                  <InfoRow label="Baulera" value={wizardData.baulera ? "Sí" : "No"} />
                </div>
              </SectionCard>

              {/* 3. Composición A/B */}
              <SectionCard title="3. Composición A/B">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <InfoRow label="Modo A" value={wizardData.modoA === "porcentaje" ? "Porcentaje" : "Importe"} />
                  <InfoRow label="Porcentaje A" value={wizardData.porcA ? `${wizardData.porcA}%` : "0%"} />
                  <InfoRow label="Moneda A" value={wizardData.monedaA} />
                  <InfoRow label="Moneda B" value={wizardData.monedaB} />
                </div>
              </SectionCard>

              {/* 4. Pago */}
              <SectionCard title="4. Pago">
                <div className="grid grid-cols-2 gap-6">
                  <InfoRow label="Tipo de Pago" value={wizardData.tipoPago} />
                  <InfoRow label="Tipo de Cambio" value={wizardData.tcValor} isCurrency />
                </div>
              </SectionCard>

              {/* 5. Cargos & Extras */}
              <SectionCard title="5. Cargos & Extras">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                  <InfoRow label="Total Cargos ARS" value={wizardData.totalCargosArs} isCurrency highlight />
                  <InfoRow label="Total Cargos USD" value={wizardData.totalCargosUsd} isCurrency highlight />
                </div>
                {/* Detail of cargos could go here if needed */}
              </SectionCard>

              {/* 6. Reglas de Financiación */}
              <SectionCard title="6. Reglas de Financiación">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div className="bg-blue-900/20 p-4 rounded border border-blue-800/50">
                    <p className="text-sm font-semibold text-blue-400 mb-2">Parte A (ARS)</p>
                    <p className="text-2xl font-bold text-white">{wizardData.reglasFinanciacionA?.length || 0} <span className="text-sm font-normal text-slate-400">reglas</span></p>
                  </div>
                  <div className="bg-emerald-900/20 p-4 rounded border border-emerald-800/50">
                    <p className="text-sm font-semibold text-emerald-400 mb-2">Parte B (USD)</p>
                    <p className="text-2xl font-bold text-white">{wizardData.reglasFinanciacionB?.length || 0} <span className="text-sm font-normal text-slate-400">reglas</span></p>
                  </div>
                </div>
              </SectionCard>

              {/* 7. Datos Adicionales */}
              <SectionCard title="7. Datos Adicionales">
                <div className="grid grid-cols-2 gap-6">
                  <InfoRow label="% Pagado a Posesión" value={wizardData.porcentajePagadoFechaPosesion ? `${wizardData.porcentajePagadoFechaPosesion}%` : "0%"} />
                  <InfoRow label="Dólar Referencia" value={wizardData.dolarRef} isCurrency />
                </div>
              </SectionCard>

            </div>
          </ScrollArea>

          <DialogFooter className="flex justify-between border-t border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
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
