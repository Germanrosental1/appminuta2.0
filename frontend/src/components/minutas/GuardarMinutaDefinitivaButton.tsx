import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { guardarMinutaDefinitiva } from '@/services/minutas';
import { useAuth } from '@/hooks/useAuth';
import { WizardData } from '@/types/wizard';
import { Save, Loader2 } from 'lucide-react';

interface GuardarMinutaDefinitivaButtonProps {
  unidadId: string;
  wizardData: WizardData;
  className?: string;
}

export const GuardarMinutaDefinitivaButton: React.FC<GuardarMinutaDefinitivaButtonProps> = ({
  unidadId,
  wizardData,
  className
}) => {
  const [saving, setSaving] = useState(false);
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

    if (!unidadId) {
      toast({
        title: "Error",
        description: "Debes seleccionar una unidad",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      await guardarMinutaDefinitiva({
        proyecto: wizardData.proyecto || 'Sin proyecto',
        UsuarioId: user.id,
        datos: { ...wizardData, unidad: unidadId },
        estado: 'pendiente',
        DatoAdicional: {}
      });

      toast({
        title: "Minuta guardada",
        description: "La minuta definitiva ha sido guardada exitosamente",
      });

      // Redirigir al dashboard comercial después de un breve retraso
      setTimeout(() => {
        navigate('/comercial/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Error al guardar minuta definitiva:', error);
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
      className={className}
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
