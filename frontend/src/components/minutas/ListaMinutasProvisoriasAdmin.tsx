import React, { useState, useEffect } from 'react';
import { getAllMinutasProvisoriasForAdmin, actualizarEstadoMinutaProvisoria, MinutaProvisoria } from '@/services/minutas';
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
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const ListaMinutasProvisoriasAdmin: React.FC = () => {
  const [minutas, setMinutas] = useState<MinutaProvisoria[]>([]);
  const [filteredMinutas, setFilteredMinutas] = useState<MinutaProvisoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const { toast } = useToast();

  useEffect(() => {
    const fetchMinutas = async () => {
      try {
        setLoading(true);
        const data = await getAllMinutasProvisoriasForAdmin();
        setMinutas(data);
        setFilteredMinutas(data);
      } catch (err) {
        console.error('Error fetching minutas:', err);
        setError('Error al cargar las minutas provisorias');
      } finally {
        setLoading(false);
      }
    };

    fetchMinutas();
  }, []);

  useEffect(() => {
    // Filtrar minutas según búsqueda y tab activo
    let filtered = minutas;

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
        m.UsuarioId.toLowerCase().includes(term)
      );
    }

    setFilteredMinutas(filtered);
  }, [searchTerm, activeTab, minutas]);

  const handleChangeEstado = async (id: string, nuevoEstado: 'revisada' | 'aprobada' | 'rechazada') => {
    try {
      await actualizarEstadoMinutaProvisoria(id, nuevoEstado);

      // Actualizar la lista local
      setMinutas(prev => prev.map(m =>
        m.id === id ? { ...m, estado: nuevoEstado } : m
      ));

      toast({
        title: "Estado actualizado",
        description: `La minuta ha sido marcada como ${nuevoEstado} `,
      });
    } catch (error) {
      console.error('Error updating minuta state:', error);
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

  if (loading) {
    return <div className="flex justify-center p-8">Cargando minutas provisorias...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Minutas Provisorias
          </CardTitle>
          <CardDescription>
            Gestión de minutas provisorias creadas por usuarios comerciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por proyecto, unidad o usuario..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="todas" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
                <TabsTrigger value="revisada">Revisadas</TabsTrigger>
                <TabsTrigger value="aprobada">Aprobadas</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
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
                          <TableRow key={minuta.Id}>
                            <TableCell>{minuta.Proyecto}</TableCell>
                            <TableCell>{minuta.Dato?.unidadDescripcion || minuta.UnidadId}</TableCell>
                            <TableCell>{minuta.UsuarioId}</TableCell>
                            <TableCell>
                              {new Date(minuta.FechaCreacion).toLocaleDateString('es-AR')}
                            </TableCell>
                            <TableCell>{getEstadoBadge(minuta.Estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/ admin / minutas / ${minuta.Id} `}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </a>
                                </Button>

                                {minuta.Estado === 'pendiente' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleChangeEstado(minuta.Id, 'revisada')}
                                    >
                                      <Clock className="h-4 w-4 mr-1" />
                                      Revisar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600"
                                      onClick={() => handleChangeEstado(minuta.Id, 'aprobada')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aprobar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => handleChangeEstado(minuta.Id, 'rechazada')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Rechazar
                                    </Button>
                                  </>
                                )}

                                {minuta.Estado === 'revisada' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600"
                                      onClick={() => handleChangeEstado(minuta.Id, 'aprobada')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aprobar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => handleChangeEstado(minuta.Id, 'rechazada')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Rechazar
                                    </Button>
                                  </>
                                )}

                                {minuta.Estado === 'aprobada' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={`/ admin / minutas / ${minuta.Id}/definitiva`}>
                                      <FileText className="h-4 w-4 mr-1" />
                                      Crear Definitiva
                                    </a >
                                  </Button >
                                )}
                              </div >
                            </TableCell >
                          </TableRow >
                        ))
                      )}
                    </TableBody >
                  </Table >
                </div >
              </TabsContent >
            </Tabs >
          </div >
        </CardContent >
      </Card >
    </div >
  );
};
