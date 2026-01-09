import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Unit, UnitFilters } from "@/types/sales-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitTable } from "@/components/unit-table";
import { UnitFiltersComponent } from "@/components/unit-filters";
import { UnitDetailSheet } from "@/components/unit-detail-sheet";
import { PermissionsTab } from "@/components/permissions-tab";
import { mockUsers, mockPermissions } from "@/data/mock-data";
import { supabaseService } from "@/services/supabaseService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SalesMapView() {
  const { mapId } = useParams();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [projectNaturaleza, setProjectNaturaleza] = useState<string>('');

  const [filters, setFilters] = useState<UnitFilters>({
    search: "",
    proyecto: "all",
    manzana: "all",
    etapa: "all",
    tipo: "all",
    dormitorios: "all",
    estado: "all",
    comercial: "all",
    precioMin: "",
    precioMax: "",
  });

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Cargar unidades del proyecto seleccionado
  useEffect(() => {
    const loadUnits = async () => {
      if (!mapId) return;
      
      try {
        setLoading(true);
        const data = await supabaseService.getUnitsByProject(mapId);
        setUnits(data);
        setProjectName(mapId);
        
        // Intentar obtener la naturaleza del proyecto
        if (data.length > 0) {
          const firstUnit = data[0];
          setProjectNaturaleza(firstUnit.natdelproyecto || 'Sin clasificar');
        }
      } catch (error) {
        console.error(`Error loading units for project ${mapId}:`, error);
        toast.error(`Error al cargar las unidades del proyecto ${mapId}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadUnits();
  }, [mapId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Cargando datos del proyecto...</p>
      </div>
    );
  }
  
  if (units.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No se encontraron unidades para este proyecto</p>
      </div>
    );
  }

  const filteredUnits = units.filter((unit) => {
    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = (
        (unit.numeroUnidad.toLowerCase().includes(searchLower)) ||
        (unit.edificioTorre.toLowerCase().includes(searchLower)) ||
        (unit.piso.toLowerCase().includes(searchLower)) ||
        (unit.estado.toLowerCase().includes(searchLower)) ||
        (unit.clienteInteresado.toLowerCase().includes(searchLower)) ||
        (unit.sectorId.toLowerCase().includes(searchLower))
      );
      
      if (!matchesSearch) return false;
    }
    
    // Filtro por tipo
    if (filters.tipo !== "all" && unit.tipo !== filters.tipo) {
      return false;
    }
    
    // Filtro por dormitorios (solo si no es naturaleza Naves)
    if (projectNaturaleza !== 'Naves' && filters.dormitorios !== "all") {
      // Si filtroDormitorios es 'null', buscamos unidades sin dormitorios (como cocheras)
      if (filters.dormitorios === "null") {
        if (unit.dormitorios !== 0 && unit.dormitorios !== null) return false;
      } else {
        const dormitoriosNum = parseInt(filters.dormitorios);
        if (unit.dormitorios !== dormitoriosNum) return false;
      }
    }
    
    // Filtro por estado
    if (filters.estado !== "all" && unit.estado !== filters.estado) {
      return false;
    }
    
    // Filtro por precio mínimo
    if (filters.precioMin && !isNaN(parseFloat(filters.precioMin))) {
      const precioMin = parseFloat(filters.precioMin);
      if (unit.precioUSD < precioMin) return false;
    }
    
    // Filtro por precio máximo
    if (filters.precioMax && !isNaN(parseFloat(filters.precioMax))) {
      const precioMax = parseFloat(filters.precioMax);
      if (unit.precioUSD > precioMax) return false;
    }
    
    return true;
  });

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setSheetOpen(true);
  };

  const handleSaveUnit = async (unit: Unit) => {
    try {
      // Guardar los cambios en la base de datos
      await supabaseService.updateUnit(unit);
      
      // Actualizar la unidad en el estado local
      setUnits(prevUnits => 
        prevUnits.map(u => u.id === unit.id ? unit : u)
      );
      
      toast.success("Unidad actualizada correctamente");
      setSheetOpen(false);
    } catch (error) {
      console.error('Error al guardar la unidad:', error);
      toast.error("Error al guardar los cambios");
    }
  };

  const handleCreateUnit = () => {
    toast.info("Función de crear unidad en desarrollo");
  };

  const handleSavePermissions = () => {
    toast.success("Permisos guardados correctamente");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">{projectName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Naturaleza: {projectNaturaleza} | {units.length} unidades
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Tabs defaultValue="units" className="space-y-6">
            <TabsList className="bg-muted">
              <TabsTrigger value="units">Mapa / Unidades</TabsTrigger>
              <TabsTrigger value="permissions">Permisos y Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="units" className="space-y-6">
              <UnitFiltersComponent
                filters={filters}
                onFilterChange={setFilters}
                proyecto={mapId}
                naturaleza={projectNaturaleza}
              />
              <UnitTable
                units={filteredUnits}
                onSelectUnit={handleSelectUnit}
                onCreateUnit={handleCreateUnit}
                naturaleza={projectNaturaleza}
              />
            </TabsContent>

            <TabsContent value="permissions">
              <PermissionsTab
                mapId={mapId!}
                users={mockUsers}
                permissions={mockPermissions}
                onSavePermissions={handleSavePermissions}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UnitDetailSheet
        unit={selectedUnit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSaveUnit}
      />
    </div>
  );
}
