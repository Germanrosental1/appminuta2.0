import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesMapService } from '@/services/salesMapService';
import { SalesMapItem } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus } from 'lucide-react';

export function SalesMapList() {
  const [salesMapItems, setSalesMapItems] = useState<SalesMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await salesMapService.getAll();
        setSalesMapItems(data);
        
        // Extract unique projects
        const uniqueProjects = Array.from(new Set(data.map(item => item.proyecto).filter(Boolean) as string[]));
        setProjects(uniqueProjects);
        
        if (uniqueProjects.length > 0 && !selectedProject) {
          setSelectedProject(uniqueProjects[0]);
        }
      } catch (err) {
        setError('Error al cargar los datos del mapa de ventas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const fetchProjectData = async () => {
        try {
          setLoading(true);
          const data = await salesMapService.getByProject(selectedProject);
          setSalesMapItems(data);
        } catch (err) {
          setError(`Error al cargar los datos del proyecto ${selectedProject}`);
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchProjectData();
    }
  }, [selectedProject]);

  const handleEdit = (id: string) => {
    navigate(`/sales-map/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
      try {
        await salesMapService.delete(id);
        setSalesMapItems(salesMapItems.filter(item => item.id !== id));
      } catch (err) {
        setError('Error al eliminar el elemento');
        console.error(err);
      }
    }
  };

  const handleCreate = () => {
    navigate('/sales-map/create');
  };

  const filteredItems = salesMapItems.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.nrounidad?.toLowerCase().includes(searchLower) || false) ||
      (item.edificiotorre?.toLowerCase().includes(searchLower) || false) ||
      (item.piso?.toLowerCase().includes(searchLower) || false) ||
      (item.estado?.toLowerCase().includes(searchLower) || false)
    );
  });

  if (loading) {
    return <div className="flex justify-center p-8">Cargando datos...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mapa de Ventas</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Buscar por unidad, edificio, piso o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Edificio/Torre</TableHead>
              <TableHead>Piso</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Dormitorios</TableHead>
              <TableHead>M² Totales</TableHead>
              <TableHead>Precio USD</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  No se encontraron datos
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.edificiotorre || '-'}</TableCell>
                  <TableCell>{item.piso || '-'}</TableCell>
                  <TableCell>{item.nrounidad || '-'}</TableCell>
                  <TableCell>{item.tipo || '-'}</TableCell>
                  <TableCell>{item.dormitorios || '-'}</TableCell>
                  <TableCell>{item.m2totales?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    {item.preciousd ? `$${item.preciousd.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.estado === 'Disponible' ? 'bg-green-100 text-green-800' :
                      item.estado === 'Reservado' ? 'bg-yellow-100 text-yellow-800' :
                      item.estado === 'Vendido' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.estado || 'Desconocido'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(item.id)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
