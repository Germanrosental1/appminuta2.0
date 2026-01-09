import { useState } from "react";
import { Unit, UnitStatus } from "@/types/sales-map";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitTableProps {
  units: Unit[];
  onSelectUnit: (unit: Unit) => void;
  onCreateUnit: () => void;
  naturaleza?: string; // Añadir la naturaleza del proyecto
}

const getStatusColor = (status: UnitStatus) => {
  switch (status) {
    case "Disponible":
      return "bg-status-disponible text-white";
    case "Reservado":
      return "bg-status-reservado text-white";
    case "Vendido":
      return "bg-status-vendido text-primary";
    case "No disponible":
      return "bg-status-no-disponible text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function UnitTable({ units, onSelectUnit, onCreateUnit, naturaleza = 'Residencial' }: UnitTableProps) {
  const [sortField, setSortField] = useState<keyof Unit | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Unit) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedUnits = [...units].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {units.length} unidades en total
          </p>
        </div>
        <Button onClick={onCreateUnit} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Unidad
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("edificioTorre")}
              >
                Edificio/Torre
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("piso")}
              >
                Piso
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("numeroUnidad")}
              >
                Unidad
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("tipo")}
              >
                Tipo
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("etapa")}
              >
                Etapa
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort("dormitorios")}
              >
                Dormitorios
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors text-right"
                onClick={() => handleSort("m2Totales")}
              >
                M² Totales
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70 transition-colors text-right"
                onClick={() => handleSort("precioUSD")}
              >
                Precio USD
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comercial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUnits.map((unit) => (
              <TableRow
                key={unit.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSelectUnit(unit)}
              >
                <TableCell className="font-medium">{unit.edificioTorre || '-'}</TableCell>
                <TableCell>{unit.piso || '-'}</TableCell>
                <TableCell className="font-medium">{unit.numeroUnidad || '-'}</TableCell>
                <TableCell>{unit.tipo || '-'}</TableCell>
                <TableCell>{unit.etapa || '-'}</TableCell>
                <TableCell>{unit.dormitorios || '-'}</TableCell>
                <TableCell className="text-right">{unit.m2Totales ? unit.m2Totales.toFixed(2) : '-'}</TableCell>
                <TableCell className="text-right font-semibold">
                  {unit.precioUSD ? `$${unit.precioUSD.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={cn("font-medium", getStatusColor(unit.estado))}>
                    {unit.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {unit.comercial || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
