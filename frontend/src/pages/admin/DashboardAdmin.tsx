import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaMinutasDefinitivasAdmin } from '@/components/minutas/ListaMinutasDefinitivasAdmin';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import {
  LogOut,
  FileText,
  Users,
  BarChart
} from 'lucide-react';

interface DashboardAdminProps {
  readOnly?: boolean;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({ readOnly = false }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('minutas');

  // Verificar si requiere cambio de contraseña
  useRequirePasswordChange();

  // 📡 WebSocket para actualizaciones en tiempo real
  useWebSocket();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {readOnly ? 'Dashboard Viewer' : 'Dashboard Administración'}
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.email}
            {readOnly && <span className="ml-2 text-xs">(Solo lectura)</span>}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>

      <Tabs defaultValue="minutas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="minutas" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Minutas
          </TabsTrigger>
          <TabsTrigger value="definitivas" className="flex items-center">
            <BarChart className="mr-2 h-4 w-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Gestión de Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minutas" className="mt-6">
          <ListaMinutasDefinitivasAdmin readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="definitivas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5" />
                Estadísticas
              </CardTitle>
              <CardDescription>
                Estadísticas y reportes del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Funcionalidad en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administración de usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Funcionalidad en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAdmin;
