import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const PerfilIncompletoPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[450px]">
        <CardHeader className="bg-amber-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <CardTitle>Perfil Incompleto</CardTitle>
          </div>
          <CardDescription>
            Tu cuenta de usuario no tiene un perfil completo
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p>
              Tu cuenta ha sido autenticada correctamente, pero su perfil esta incompleto.
            </p>
            <p>
              Por favor, contacta al administrador del sistema para que complete tu perfil.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
