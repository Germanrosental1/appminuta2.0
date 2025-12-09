import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const ForceChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirigir al dashboard después de cambiar la contraseña
    navigate('/minutas', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert className="border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Cambio de Contraseña Obligatorio</AlertTitle>
          <AlertDescription className="text-blue-800">
            Por motivos de seguridad, debes establecer una nueva contraseña antes de acceder al sistema.
            Asegúrate de crear una contraseña segura que cumpla con todos los requisitos.
          </AlertDescription>
        </Alert>

        <ChangePasswordForm isForced={true} onSuccess={handleSuccess} />

        <div className="text-center text-sm text-muted-foreground">
          <p>¿Necesitas ayuda? Contacta al administrador</p>
        </div>
      </div>
    </div>
  );
};
