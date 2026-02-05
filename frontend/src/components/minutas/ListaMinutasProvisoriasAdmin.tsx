import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getAllMinutasProvisoriasForAdmin, actualizarEstadoMinutaProvisoria, MinutaProvisoria } from '@/services/minutas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { MinutaProvisoriaRow } from './MinutaProvisoriaRow';
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
      filtered = filtered.filter(m => m.Estado === activeTab);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.Proyecto?.toLowerCase().includes(term) ||
        m.Dato?.unidadDescripcion?.toLowerCase().includes(term) ||
        m.UsuarioId?.toLowerCase().includes(term)
      );
    }

    setFilteredMinutas(filtered);
  }, [searchTerm, activeTab, minutas]);

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredMinutas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Aproximadamente 73px por fila
    overscan: 5,
  });

  const { getVirtualItems, getTotalSize } = rowVirtualizer;
  const virtualItems = getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? getTotalSize() - virtualItems.at(-1).end
    : 0;

  const handleChangeEstado = async (id: string, nuevoEstado: 'revisada' | 'aprobada' | 'rechazada') => {
    try {
      await actualizarEstadoMinutaProvisoria(id, nuevoEstado);

      // Actualizar la lista local
      setMinutas(prev => prev.map(m =>
        m.Id === id ? { ...m, Estado: nuevoEstado } : m
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
                <div
                  ref={parentRef}
                  className="rounded-md border h-[600px] overflow-auto relative"
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
                        <>
                          {paddingTop > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} style={{ height: `${paddingTop}px`, padding: 0 }} />
                            </TableRow>
                          )}
                          {virtualItems.map((virtualRow) => {
                            const minuta = filteredMinutas[virtualRow.index];
                            return (
                              <MinutaProvisoriaRow
                                key={minuta.Id}
                                minuta={minuta}
                                onChangeEstado={handleChangeEstado}
                              />
                            );
                          })}
                          {paddingBottom > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs >
          </div >
        </CardContent >
      </Card >
    </div >
  );
};
