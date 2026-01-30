import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { UnitFilters } from "@/types/sales-map";
import { useState, useEffect } from "react";
import { supabaseService } from "@/services/supabaseService";
import { EstadoUnidad } from "@/types/supabase-types";

interface UnitFiltersProps {
  filters: UnitFilters;
  onFilterChange: (filters: UnitFilters) => void;
  proyecto?: string;
  naturaleza?: string;
}

// Extender la interfaz UnitFilters si es necesario
declare module "@/types/sales-map" {
  interface UnitFilters {
    search: string;
    precioMin: string;
    precioMax: string;
  }
}

export function UnitFiltersComponent({ filters, onFilterChange, proyecto, naturaleza }: UnitFiltersProps) {
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);

  // Estados disponibles para las unidades
  const estadosDisponibles: EstadoUnidad[] = [
    'Disponible',
    'Reservado',
    'Vendido',
    'No disponible'
  ];

  // Cargar tipos disponibles cuando cambia el proyecto
  useEffect(() => {
    const loadTipos = async () => {
      try {
        if (proyecto) {
          const tipos = await supabaseService.getUniqueValuesByProject('Tipo', proyecto);
          setTiposDisponibles(tipos);
        } else {
          const tipos = await supabaseService.getUniqueValues('Tipo');
          setTiposDisponibles(tipos);
        }
      } catch (error) {
        console.error('Error loading tipos:', error);
      }
    };

    loadTipos();
  }, [proyecto]);
  const updateFilter = (key: keyof UnitFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por unidad, sector ID, edificio, piso, estado o cliente..."
          className="pl-8"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtro de Tipo */}
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={filters.tipo} onValueChange={(v) => updateFilter("tipo", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              {tiposDisponibles.map(tipo => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Dormitorios - Solo para naturaleza distinta a Naves */}
        {naturaleza !== 'Naves' && (
          <div className="space-y-2">
            <Label>Dormitorios</Label>
            <Select value={filters.dormitorios} onValueChange={(v) => updateFilter("dormitorios", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="null">Sin dormitorios (Cocheras)</SelectItem>
                <SelectItem value="1">1 Dormitorio</SelectItem>
                <SelectItem value="2">2 Dormitorios</SelectItem>
                <SelectItem value="3">3 Dormitorios</SelectItem>
                <SelectItem value="4">4 Dormitorios</SelectItem>
                <SelectItem value="5">5+ Dormitorios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro de Estado */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={filters.estado} onValueChange={(v) => updateFilter("estado", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              {estadosDisponibles.map(estado => (
                <SelectItem key={estado} value={estado}>{estado}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros de precio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Precio mínimo (USD)</Label>
          <Input
            type="number"
            placeholder="Precio mínimo"
            value={filters.precioMin}
            onChange={(e) => updateFilter("precioMin", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Precio máximo (USD)</Label>
          <Input
            type="number"
            placeholder="Precio máximo"
            value={filters.precioMax}
            onChange={(e) => updateFilter("precioMax", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
