import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { guardarMinutaProvisoria } from '@/services/minutas';
import { useAuth } from '@/hooks/useAuth';
import { WizardData } from '@/types/wizard';
import { Save, Loader2 } from 'lucide-react';

interface GuardarMinutaButtonProps {
  unidadId: string;
  wizardData: WizardData;
  onSuccess?: () => void;
}

export const GuardarMinutaButton: React.FC<GuardarMinutaButtonProps> = ({ 
  unidadId, 
  wizardData,
  onSuccess
}) => {
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
        unidad_id: unidadId,
        usuario_id: user.id,
        datos: wizardData,
        estado: 'pendiente'
      });
      
      toast({
        title: "Minuta guardada",
        description: "La minuta provisoria ha sido guardada exitosamente",
      });
      
      if (onSuccess) {
        onSuccess();
      }
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

  return (
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
          Guardar Minuta
        </>
      )}
    </Button>
  );
};
