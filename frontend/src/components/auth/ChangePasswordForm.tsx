import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { validatePasswordComplexity, calculatePasswordStrength, sanitizePassword } from '@/utils/passwordValidation';
import { useAuth } from '@/hooks/useAuth';

interface ChangePasswordFormProps {
  isForced?: boolean;
  onSuccess?: () => void;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  isForced = false,
  onSuccess
}) => {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const validation = validatePasswordComplexity(newPassword);
  const strength = newPassword.length > 0 ? calculatePasswordStrength(newPassword) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Sanitizar contraseñas
    const sanitizedPassword = sanitizePassword(newPassword);
    const sanitizedConfirm = sanitizePassword(confirmPassword);

    // Validar complejidad
    if (!validation.valid) {
      setError('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    // Validar confirmación
    if (sanitizedPassword !== sanitizedConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {


      // Usar la función updatePassword del AuthContext que ya maneja todo correctamente
      const { error: updateError } = await updatePassword(sanitizedPassword);

      if (updateError) {
        console.error('❌ Error al cambiar contraseña:', updateError);
        throw updateError;
      }



      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      // Llamar callback si existe
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }

    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
      console.error('Error changing password:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={isForced ? "w-full max-w-md" : "w-full"}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>
            {isForced ? 'Cambio de Contraseña Requerido' : 'Cambiar Contraseña'}
          </CardTitle>
        </div>
        <CardDescription>
          {isForced
            ? 'Por seguridad, debes cambiar tu contraseña antes de continuar'
            : 'Actualiza tu contraseña por una más segura'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Contraseña actualizada exitosamente</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setShowPasswordHints(true)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />

            {/* Indicador de fortaleza */}
            {strength && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Fortaleza:</span>
                  <span className={`font-semibold ${strength.color}`}>
                    {strength.level}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${strength.score < 40 ? 'bg-red-500' :
                        strength.score < 60 ? 'bg-orange-500' :
                          strength.score < 75 ? 'bg-yellow-500' :
                            strength.score < 90 ? 'bg-green-500' : 'bg-emerald-500'
                      }`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Requisitos */}
            {showPasswordHints && validation.errors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs font-medium text-amber-900 mb-2">
                  Requisitos faltantes:
                </p>
                <ul className="space-y-1">
                  {validation.errors.map((err, idx) => (
                    <li key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                      <span className="text-amber-500">✗</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showPasswordHints && validation.valid && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <span className="text-green-500">✓</span>
                  <span>Todos los requisitos cumplidos</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !validation.valid || success}
          >
            {isLoading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
