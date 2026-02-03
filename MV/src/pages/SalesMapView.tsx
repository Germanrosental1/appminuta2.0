import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Unit, UnitFilters } from "@/types/sales-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitTable } from "@/components/unit-table";
import { UnitFiltersComponent } from "@/components/unit-filters";
import { UnitDetailSheet } from "@/components/unit-detail-sheet";
import { PermissionsTab } from "@/components/permissions-tab";
import { GastosGeneralesTab } from "@/components/gastos-generales-tab";
import { mockUsers, mockPermissions } from "@/data/mock-data";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUnits, useUpdateUnit } from "@/hooks/useUnits";

export default function SalesMapView() {
  const { mapId } = useParams();

  // ===== REACT QUERY HOOKS =====
  const {
    data: units = [],
    isLoading,
    error: unitsError
  } = useUnits(mapId || '');

  const updateUnitMutation = useUpdateUnit();

  // ===== LOCAL UI STATE =====
  const [projectName, setProjectName] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
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

  // Fetch project ID when mapId changes
  useEffect(() => {
    const fetchProjectId = async () => {
      if (!mapId || mapId === 'undefined') return;

      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const projectResponse = await fetch(`${backendUrl}/proyectos/by-name/${mapId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProjectId(projectData.Id || projectData.id);
        }
      } catch (error) {
        console.error(`Error loading project ID for ${mapId}:`, error);
      }
    };

    fetchProjectId();
  }, [mapId]);

  // Extract project metadata when units change
  useEffect(() => {
    if (mapId) {
      setProjectName(mapId);
    }

    if (units.length > 0) {
      const firstUnit = units[0];
      setProjectNaturaleza(firstUnit.natdelproyecto || 'Sin clasificar');
    }
  }, [units, mapId]);

  if (unitsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 font-medium">Error al cargar las unidades</p>
          <p className="text-sm text-muted-foreground mt-2">{unitsError.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
        (String(unit.numeroUnidad || '').toLowerCase().includes(searchLower)) ||
        (String(unit.edificioTorre || '').toLowerCase().includes(searchLower)) ||
        (String(unit.piso || '').toLowerCase().includes(searchLower)) ||
        (String(unit.estado || '').toLowerCase().includes(searchLower)) ||
        (String(unit.clienteInteresado || '').toLowerCase().includes(searchLower)) ||
        (String(unit.sectorId || '').toLowerCase().includes(searchLower))
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
      // React Query mutation handles:
      // - API call
      // - Optimistic update
      // - Cache invalidation
      // - Toast notifications (configured in hook)
      await updateUnitMutation.mutateAsync({
        id: unit.id,
        data: unit
      });

      setSheetOpen(false);
    } catch (error) {
      // Error already handled by mutation's onError
      console.error('Error al guardar la unidad:', error);
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
              <TabsTrigger value="gastos">Gastos Generales</TabsTrigger>
              <TabsTrigger value="masiva">Modificación Masiva</TabsTrigger>
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

            <TabsContent value="gastos">
              {projectId ? (
                <GastosGeneralesTab projectId={projectId} />
              ) : (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="masiva">
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="h-5 w-5 text-yellow-600 mt-0.5">⚠️</div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Vista en Construcción (Standby)</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Esta sección de <strong>Modificación Masiva</strong> se encuentra en desarrollo.
                    </p>
                  </div>
                </div>
                <div className="border rounded-lg p-12 text-center text-muted-foreground">
                  <p>Aquí se podrá realizar la modificación masiva de precios y estados de las unidades.</p>
                </div>
              </div>
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
