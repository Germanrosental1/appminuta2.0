import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Unit, EstadoUnidad } from '@/types/supabase-types';
import { supabaseService } from '@/services/supabaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UnitEditFormProps {
  readonly unitId?: string;
  readonly onSaved: (unit: Unit) => void;
  readonly onCancel: () => void;
}

type AdjustMode = 'none' | 'PERCENTAGE_TOTAL' | 'PERCENTAGE_M2' | 'FIXED_TOTAL' | 'FIXED_M2';

export function UnitEditForm({ unitId, onSaved, onCancel }: UnitEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comerciales, setComerciales] = useState<string[]>([]);

  // Estado para ajuste de precios
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('none');
  const [adjustValue, setAdjustValue] = useState<number>(0);

  const { register, handleSubmit, setValue, watch } = useForm<Unit>();

  // Observar el estado para mostrar/ocultar el campo de motivo y precios actuales
  const estadoValue = watch('estado');
  const currentPrecioUSD = watch('precioUSD') || 0;
  const currentUsdM2 = watch('usdM2') || 0;
  const currentM2Totales = watch('m2Totales') || 1;

  useEffect(() => {
    const loadComerciales = async () => {
      try {
        const data = await supabaseService.getUniqueValues('comercial');
        setComerciales(data);
      } catch (error) {
        console.error('Error loading comerciales:', error);
        toast.error('Error al cargar la lista de comerciales');
      }
    };

    loadComerciales();

    if (unitId) {
      setLoading(true);
      supabaseService.getUnitById(unitId)
        .then(unit => {
          if (unit) {
            // Establecer todos los valores del formulario
            Object.entries(unit).forEach(([key, value]) => {
              setValue(key as keyof Unit, value);
            });
          } else {
            toast.error('No se encontró la unidad');
            onCancel();
          }
        })
        .catch(error => {
          console.error('Error loading unit:', error);
          toast.error('Error al cargar los datos de la unidad');
          onCancel();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [unitId, setValue, onCancel]);

  const onSubmit = async (data: Unit) => {
    try {
      setSaving(true);
      let savedUnit: Unit;

      if (unitId) {
        // Actualizar unidad existente
        savedUnit = await supabaseService.updateUnit({
          ...data,
          id: unitId
        });
        toast.success('Unidad actualizada correctamente');
      } else {
        // Crear nueva unidad
        savedUnit = await supabaseService.createUnit(data);
        toast.success('Unidad creada correctamente');
      }

      onSaved(savedUnit);
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.error('Error al guardar la unidad');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información General y Especificaciones - Solo lectura, lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Información General */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Información General</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proyecto:</span>
              <span className="font-medium">{watch('proyecto') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Edificio:</span>
              <span className="font-medium">{watch('edificioTorre') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Etapa:</span>
              <span className="font-medium">{watch('etapa') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Piso:</span>
              <span className="font-medium">{watch('piso') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidad:</span>
              <span className="font-medium">{watch('numeroUnidad') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">{watch('tipo') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sector ID:</span>
              <span className="font-medium">{watch('sectorId') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destino:</span>
              <span className="font-medium">{watch('destino') || '-'}</span>
            </div>
          </div>
        </div>

        {/* Especificaciones */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Especificaciones</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dormitorios:</span>
              <span className="font-medium">{watch('dormitorios') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tamaño:</span>
              <span className="font-medium">{watch('tamano') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">M² Exclusivos:</span>
              <span className="font-medium">{watch('m2Exclusivos') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">M² Comunes:</span>
              <span className="font-medium">{watch('m2Comunes') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patio/Terraza:</span>
              <span className="font-medium">{watch('patioTerraza') || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">M² Patio:</span>
              <span className="font-medium">{watch('m2PatioTerraza') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">M² Cálculo:</span>
              <span className="font-medium">{watch('m2ParaCalculo') ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">M² Totales:</span>
              <span className="font-bold">{watch('m2Totales') ?? '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Precio - Con opciones de ajuste */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Precio</h3>

        {/* Precios actuales (solo lectura) */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-muted-foreground text-sm">Precio USD Actual</Label>
            <p className="text-xl font-semibold">${currentPrecioUSD.toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">USD/M² Actual</Label>
            <p className="text-xl font-semibold">${currentUsdM2.toLocaleString()}</p>
          </div>
        </div>

        {/* Selector de modo de ajuste */}
        <div className="space-y-3">
          <Label>Tipo de Ajuste</Label>
          <Select
            value={adjustMode}
            onValueChange={(value) => setAdjustMode(value as AdjustMode)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin cambios en precio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin cambios en precio</SelectItem>
              <SelectItem value="PERCENTAGE_TOTAL">Porcentaje sobre Precio Total</SelectItem>
              <SelectItem value="PERCENTAGE_M2">Porcentaje sobre USD/m²</SelectItem>
              <SelectItem value="FIXED_TOTAL">Establecer Precio Total Fijo</SelectItem>
              <SelectItem value="FIXED_M2">Establecer USD/m² Fijo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campo de valor según modo */}
        {adjustMode !== 'none' && (
          <div className="space-y-2">
            <Label htmlFor="adjustValueInput">
              {adjustMode.startsWith('PERCENTAGE') ? 'Porcentaje (%)' : 'Valor (USD)'}
            </Label>
            <Input
              id="adjustValueInput"
              type="number"
              step={adjustMode.startsWith('PERCENTAGE') ? '0.1' : '0.01'}
              placeholder={adjustMode.startsWith('PERCENTAGE') ? 'Ej: 10 para +10%' : 'Ej: 2500'}
              value={adjustValue || ''}
              onChange={(e) => setAdjustValue(Number(e.target.value))}
            />

            {/* Preview del nuevo precio */}
            {adjustValue !== 0 && (
              <div className="p-3 mt-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Nuevo precio:
                  {(() => {
                    if (adjustMode === 'PERCENTAGE_TOTAL') {
                      const newPrice = currentPrecioUSD * (1 + adjustValue / 100);
                      return ` $${newPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                    } else if (adjustMode === 'PERCENTAGE_M2') {
                      const newM2 = currentUsdM2 * (1 + adjustValue / 100);
                      return ` USD/m²: $${newM2.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                    } else if (adjustMode === 'FIXED_TOTAL') {
                      return ` $${adjustValue.toLocaleString()}`;
                    } else if (adjustMode === 'FIXED_M2') {
                      return ` USD/m²: $${adjustValue.toLocaleString()} (Total: $${(adjustValue * currentM2Totales).toLocaleString()})`;
                    }
                    return '';
                  })()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Estado y Comercialización */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Estado y Comercialización</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              onValueChange={(value) => setValue('estado', value as EstadoUnidad)}
              defaultValue={watch('estado')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Disponible">Disponible</SelectItem>
                <SelectItem value="Reservado">Reservado</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
                <SelectItem value="No disponible">No disponible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(estadoValue === 'No disponible') && (
            <div className="space-y-2">
              <Label htmlFor="motivoNoDisponibilidad">Motivo No Disponibilidad</Label>
              <Input id="motivoNoDisponibilidad" {...register('motivoNoDisponibilidad')} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comercial">Comercial</Label>
            <Select
              onValueChange={(value) => setValue('comercial', value)}
              defaultValue={watch('comercial')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar comercial" />
              </SelectTrigger>
              <SelectContent>
                {comerciales.map((comercial) => (
                  <SelectItem key={comercial} value={comercial}>
                    {comercial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clienteInteresado">Cliente Interesado</Label>
            <Input id="clienteInteresado" {...register('clienteInteresado')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaReserva">Fecha Reserva</Label>
            <Input id="fechaReserva" type="date" {...register('fechaReserva')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaFirmaBoleto">Fecha Firma Boleto</Label>
            <Input id="fechaFirmaBoleto" type="date" {...register('fechaFirmaBoleto')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clienteTitularBoleto">Cliente Titular Boleto</Label>
            <Input id="clienteTitularBoleto" {...register('clienteTitularBoleto')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaPosesionBoleto">Fecha Posesión Boleto</Label>
            <Input id="fechaPosesionBoleto" type="date" {...register('fechaPosesionBoleto')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Observaciones */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Observaciones</h3>
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea id="observaciones" rows={4} {...register('observaciones')} />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {unitId ? 'Actualizar' : 'Crear'} Unidad
        </Button>
      </div>
    </form>
  );
}
