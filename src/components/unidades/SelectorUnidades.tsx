import React, { useState, useEffect } from 'react';
import { getUnidadesDisponibles, Unidad } from '@/services/unidades';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Building, Home } from 'lucide-react';

interface SelectorUnidadesProps {
  onSelectUnidad: (unidad: Unidad) => void;
}

export const SelectorUnidades: React.FC<SelectorUnidadesProps> = ({ onSelectUnidad }) => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [filteredUnidades, setFilteredUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [proyectoFilter, setProyectoFilter] = useState<string>('');
  const [proyectos, setProyectos] = useState<string[]>([]);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        setLoading(true);
        const data = await getUnidadesDisponibles();
        setUnidades(data);
        setFilteredUnidades(data);
        
        // Extraer proyectos únicos
        const uniqueProyectos = Array.from(new Set(data.map(u => u.proyecto)));
        setProyectos(uniqueProyectos);
      } catch (err) {
        console.error('Error al cargar unidades:', err);
        setError('Error al cargar las unidades disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchUnidades();
  }, []);

  useEffect(() => {
    // Filtrar unidades según búsqueda y proyecto seleccionado
    let filtered = unidades;
    
    if (proyectoFilter) {
      filtered = filtered.filter(u => u.proyecto === proyectoFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.unidad.toLowerCase().includes(term) || 
        u.proyecto.toLowerCase().includes(term) ||
        (u.ubicacion && u.ubicacion.toLowerCase().includes(term))
      );
    }
    
    setFilteredUnidades(filtered);
  }, [searchTerm, proyectoFilter, unidades]);

  const handleSelectUnidad = (unidad: Unidad) => {
    onSelectUnidad(unidad);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando unidades disponibles...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar unidad..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los proyectos</SelectItem>
            {proyectos.map(proyecto => (
              <SelectItem key={proyecto} value={proyecto}>{proyecto}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnidades.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No se encontraron unidades disponibles con los filtros actuales
          </div>
        ) : (
          filteredUnidades.map(unidad => (
            <Card key={unidad.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-primary/10 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{unidad.unidad}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {unidad.proyecto}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{unidad.metros_cuadrados} m²</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio lista:</span>
                    <span className="font-medium">${unidad.precio_lista.toLocaleString('es-AR')}</span>
                  </div>
                  {unidad.piso && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Piso:</span>
                      <span>{unidad.piso}</span>
                    </div>
                  )}
                  {unidad.orientacion && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Orientación:</span>
                      <span>{unidad.orientacion}</span>
                    </div>
                  )}
                  {unidad.fecha_posesion && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posesión:</span>
                      <span>{new Date(unidad.fecha_posesion).toLocaleDateString('es-AR')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  onClick={() => handleSelectUnidad(unidad)} 
                  className="w-full"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Seleccionar Unidad
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
