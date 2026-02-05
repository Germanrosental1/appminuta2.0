import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaMinutasDefinitivasAdmin } from '@/components/minutas/ListaMinutasDefinitivasAdmin';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import '@/components/dashboard/dashboard.css';
import {
  FileText,
  Users,
  BarChart,
  LogOut,
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
              {dashboardTitle}
            </h1>
            <p className="text-muted-foreground">
              {readOnly ? `Bienvenido, ${userName} (Solo lectura)` : `Bienvenido, ${userName}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        <Tabs defaultValue="minutas" value={activeTab} onValueChange={setActiveTab} className="dashboard-tabs">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 border border-border text-muted-foreground">
            <TabsTrigger
              value="minutas"
              className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:text-foreground/80"
            >
              <FileText className="mr-2 h-4 w-4" />
              Minutas
            </TabsTrigger>
            <TabsTrigger
              value="definitivas"
              className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:text-foreground/80"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger
              value="usuarios"
              className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:text-foreground/80"
            >
              <Users className="mr-2 h-4 w-4" />
              Gestión de Usuarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minutas" className="mt-6">
            <ListaMinutasDefinitivasAdmin readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="definitivas" className="mt-6">
            <Card className="border-none bg-card/80 backdrop-blur-xl shadow-2xl">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center text-xl text-card-foreground">
                  <BarChart className="mr-3 h-6 w-6 text-primary" />
                  Estadísticas
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Estadísticas y reportes del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 pb-12">
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">Funcionalidad en desarrollo</p>
                  <p className="text-sm mt-2 text-muted-foreground/70">Próximamente: reportes detallados y analytics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-6">
            <Card className="border-none bg-card/80 backdrop-blur-xl shadow-2xl">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center text-xl text-card-foreground">
                  <Users className="mr-3 h-6 w-6 text-primary" />
                  Gestión de Usuarios
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Administración de usuarios del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 pb-12">
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">Funcionalidad en desarrollo</p>
                  <p className="text-sm mt-2 text-muted-foreground/70">Próximamente: gestión completa de usuarios y permisos</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAdmin;
