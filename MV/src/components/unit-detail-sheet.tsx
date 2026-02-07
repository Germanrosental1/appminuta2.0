import { useState, useEffect } from "react";
import { Unit } from "@/types/sales-map";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface UnitDetailSheetProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (unit: Unit) => void;
}

export function UnitDetailSheet({
  unit,
  open,
  onOpenChange,
  onSave,
}: Readonly<UnitDetailSheetProps>) {
  const [editedUnit, setEditedUnit] = useState<Unit | null>(null);

  // Usar useEffect para manejar la inicialización y limpieza del estado
  // para evitar problemas con actualizaciones durante el renderizado
  useEffect(() => {
    if (open && unit) {
      setEditedUnit({ ...unit });
    }

    if (!open) {
      setEditedUnit(null);
    }
  }, [open, unit]);

  if (!unit || !editedUnit) return null;

  // Función para actualizar un campo específico
  const updateField = (field: keyof Unit, value: Unit[keyof Unit]) => {
    setEditedUnit(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Detalles de Unidad</SheetTitle>
          <SheetDescription>
            {unit.proyecto} - {unit.tipo} {unit.numeroUnidad}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Información General */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Información General
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proyecto</Label>
                  <Input value={unit.proyecto} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Manzana</Label>
                  <Input value={unit.manzana} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>N° Unidad</Label>
                  <Input value={unit.numeroUnidad} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={unit.tipo} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Edificio/Torre</Label>
                  <Input value={unit.edificioTorre} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Piso</Label>
                  <Input value={unit.piso} readOnly />
                </div>
              </div>
            </div>

            <Separator />

            {/* Especificaciones */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Especificaciones
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dormitorios</Label>
                  <Input type="number" value={unit.dormitorios} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>M² Totales</Label>
                  <Input type="number" value={unit.m2Totales} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>M² Exclusivos</Label>
                  <Input type="number" value={unit.m2Exclusivos} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>M² Comunes</Label>
                  <Input type="number" value={unit.m2Comunes} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Patio/Terraza</Label>
                  <Input value={unit.patioTerraza} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>M² Patio/Terraza</Label>
                  <Input type="number" value={unit.m2PatioTerraza} readOnly />
                </div>
              </div>
            </div>

            <Separator />

            {/* Precio */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Precio</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio USD</Label>
                  <Input
                    type="number"
                    value={unit.precioUSD}
                    readOnly
                    className="font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>USD/M²</Label>
                  <Input
                    type="number"
                    value={unit.usdM2}
                    readOnly
                    className="font-semibold"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Estado y Comercialización */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Estado y Comercialización
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={editedUnit.estado}
                    onValueChange={(value) => updateField('estado', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Reservado">Reservado</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Pisada">Pisada</SelectItem>
                      <SelectItem value="No disponible">No disponible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Comercial</Label>
                  <Input
                    value={editedUnit.comercial}
                    onChange={(e) => updateField('comercial', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente Interesado</Label>
                  <Input
                    value={editedUnit.clienteInteresado}
                    onChange={(e) => updateField('clienteInteresado', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Reserva</Label>
                  <Input
                    type="date"
                    value={editedUnit.fechaReserva}
                    onChange={(e) => updateField('fechaReserva', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Observaciones */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Observaciones
              </h3>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={editedUnit.observaciones}
                  onChange={(e) => updateField('observaciones', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => {
            setEditedUnit(null);
            onOpenChange(false);
          }}>
            Cancelar
          </Button>
          <Button onClick={() => {
            if (editedUnit) {
              onSave(editedUnit);
              toast.success("Cambios guardados correctamente");
            }
          }}>
            Guardar Cambios
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
