import React, { useState, useEffect } from 'react';
import { getAllMinutasDefinitivasForAdmin, actualizarEstadoMinutaDefinitiva } from '@/services/minutas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DetalleMinutaModal } from '@/components/minutas/DetalleMinutaModal';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Usar la misma interfaz que en minutas.ts para evitar problemas de tipo
import { MinutaDefinitiva } from '@/services/minutas';

export const ListaMinutasDefinitivasAdmin: React.FC = () => {
  const [minutas, setMinutas] = useState<MinutaDefinitiva[]>([]);
  const [filteredMinutas, setFilteredMinutas] = useState<MinutaDefinitiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const { toast } = useToast();

  // Estados para el modal
  const [selectedMinutaId, setSelectedMinutaId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchMinutas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllMinutasDefinitivasForAdmin();
        setMinutas(data);
        setFilteredMinutas(data);
      } catch (err) {
        console.error('Error al cargar minutas:', err);
        setError('No se pudieron cargar las minutas. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchMinutas();
  }, []);

  useEffect(() => {
    // Filtrar minutas según el término de búsqueda y el estado activo
    let filtered = [...minutas];

    // Filtrar por estado
    if (activeTab !== 'todas') {
      filtered = filtered.filter(m => m.estado === activeTab);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.proyecto.toLowerCase().includes(term) ||
        m.datos?.unidadDescripcion?.toLowerCase().includes(term) ||
        m.usuario_id.toLowerCase().includes(term)
      );
    }

    setFilteredMinutas(filtered);
  }, [searchTerm, activeTab, minutas]);

  const handleVerMinuta = (id: string) => {
    setSelectedMinutaId(id);
    setModalOpen(true);
  };

  const handleChangeEstado = async (id: string, nuevoEstado: 'pendiente' | 'aprobada' | 'firmada' | 'cancelada') => {
    try {
      await actualizarEstadoMinutaDefinitiva(id, nuevoEstado);

      // Actualizar la lista local
      setMinutas(prev => prev.map(m =>
        m.id === id ? { ...m, estado: nuevoEstado } : m
      ));

      toast({
        title: "Estado actualizado",
        description: `La minuta ha sido marcada como ${nuevoEstado}`,
      });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la minuta",
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'firmada':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Firmada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Minutas Definitivas</span>
          </CardTitle>
          <CardDescription>
            Gestiona las minutas definitivas creadas por los comerciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="todas">Todas</TabsTrigger>
                  <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
                  <TabsTrigger value="aprobada">Aprobadas</TabsTrigger>
                  <TabsTrigger value="firmada">Firmadas</TabsTrigger>
                  <TabsTrigger value="cancelada">Canceladas</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="w-full sm:w-64">
                <Input
                  placeholder="Buscar minutas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMinutas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          No se encontraron minutas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMinutas.map((minuta) => (
                        <TableRow key={minuta.id}>
                          <TableCell>{minuta.proyecto}</TableCell>
                          <TableCell>{minuta.datos?.unidadDescripcion || minuta.datos?.unidadCodigo || 'Sin unidad'}</TableCell>
                          <TableCell>{minuta.usuario_id}</TableCell>
                          <TableCell>
                            {new Date(minuta.fecha_creacion).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell>{getEstadoBadge(minuta.estado)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerMinuta(minuta.id || '')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>

                              {minuta.estado === 'pendiente' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 hover:bg-green-100"
                                    onClick={() => handleChangeEstado(minuta.id, 'aprobada')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprobar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-50 hover:bg-red-100"
                                    onClick={() => handleChangeEstado(minuta.id, 'cancelada')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </>
                              )}

                              {minuta.estado === 'aprobada' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-blue-50 hover:bg-blue-100"
                                  onClick={() => handleChangeEstado(minuta.id, 'firmada')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Marcar como Firmada
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para ver detalles de la minuta */}
      <DetalleMinutaModal
        minutaId={selectedMinutaId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};
