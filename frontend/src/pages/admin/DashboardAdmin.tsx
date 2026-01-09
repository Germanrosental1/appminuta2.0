import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaMinutasDefinitivasAdmin } from '@/components/minutas/ListaMinutasDefinitivasAdmin';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import '@/components/dashboard/dashboard.css';
import {
  FileText,
  Users,
  BarChart,
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

  const userName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.email || 'Usuario';
  const dashboardTitle = readOnly ? 'Visualización de Minutas' : 'Control de Minutas';

  return (
    <div className="container mx-auto py-8 space-y-6">
      <DashboardHeader
        title={dashboardTitle}
        userName={userName}
        onLogout={handleLogout}
        subtitle={readOnly ? `Bienvenido, ${userName} (Solo lectura)` : undefined}
      />

      <Tabs defaultValue="minutas" value={activeTab} onValueChange={setActiveTab} className="dashboard-tabs">
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
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center text-xl">
                <BarChart className="mr-3 h-6 w-6 text-blue-600" />
                Estadísticas
              </CardTitle>
              <CardDescription className="text-base">
                Estadísticas y reportes del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-10 pb-12">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Funcionalidad en desarrollo</p>
                <p className="text-sm mt-2">Próximamente: reportes detallados y analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center text-xl">
                <Users className="mr-3 h-6 w-6 text-blue-600" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription className="text-base">
                Administración de usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-10 pb-12">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Funcionalidad en desarrollo</p>
                <p className="text-sm mt-2">Próximamente: gestión completa de usuarios y permisos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAdmin;

