import React, { useState, useEffect } from 'react';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMinutasDefinitivasByUsuario } from '@/services/minutas';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  LogOut, 
  PlusCircle, 
  Calculator, 
  ClipboardList,
  Eye,
  Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const DashboardComercial: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('nueva');
  const [minutas, setMinutas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Verificar si requiere cambio de contraseña
  useRequirePasswordChange();

  useEffect(() => {
    if (activeTab === 'historial' && user?.id) {
      const fetchMinutas = async () => {
        try {
          setLoading(true);
          const data = await getMinutasDefinitivasByUsuario(user.id);
          setMinutas(data);
        } catch (error) {
          console.error('Error al cargar minutas:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchMinutas();
    }
  }, [activeTab, user?.id]);

  const handleNuevaCalculadora = () => {
    // Navegar directamente al wizard sin seleccionar unidad
    navigate('/wizard');
  };

  const handleVerMinuta = (minutaId: string) => {
    setSelectedMinutaId(minutaId);
    setModalOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'revisada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Revisada</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Comercial</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.email}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>

      <Tabs defaultValue="nueva" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nueva" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Calculadora
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center">
            <ClipboardList className="mr-2 h-4 w-4" />
            Historial de Minutas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="nueva" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Nueva Calculadora Comercial
              </CardTitle>
              <CardDescription>
                Inicia una nueva calculadora para generar una minuta provisoria
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-6 pb-8">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg" 
                onClick={handleNuevaCalculadora}
              >
                <Calculator className="mr-3 h-6 w-6" />
                Iniciar Nueva Calculadora
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historial" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Historial de Minutas
              </CardTitle>
              <CardDescription>
                Minutas provisorias creadas anteriormente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : minutas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No has creado ninguna minuta provisoria aún
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minutas.map((minuta) => (
                        <TableRow key={minuta.id}>
                          <TableCell>{minuta.proyecto || 'Sin proyecto'}</TableCell>
                          <TableCell>{minuta.datos?.unidadDescripcion || minuta.unidad_id || 'Sin unidad'}</TableCell>
                          <TableCell>
                            {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell>{getEstadoBadge(minuta.estado)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleVerMinuta(minuta.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Modal para ver detalles de la minuta */}
      <DetalleMinutaModal
        minutaId={selectedMinutaId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};
