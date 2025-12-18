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
  unitId?: string;
  onSaved: (unit: Unit) => void;
  onCancel: () => void;
}

export function UnitEditForm({ unitId, onSaved, onCancel }: UnitEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comerciales, setComerciales] = useState<string[]>([]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Unit>();
  
  // Observar el estado para mostrar/ocultar el campo de motivo
  const estadoValue = watch('estado');
  
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
      {/* Información General */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proyecto">Proyecto</Label>
            <Input
              id="proyecto"
              {...register('proyecto', { required: 'El proyecto es obligatorio' })}
            />
            {errors.proyecto && (
              <p className="text-sm text-red-500">{errors.proyecto.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="manzana">Manzana</Label>
            <Input id="manzana" {...register('manzana')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa</Label>
            <Input id="etapa" {...register('etapa')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Input id="tipo" {...register('tipo')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="numeroUnidad">Número de Unidad</Label>
            <Input
              id="numeroUnidad"
              {...register('numeroUnidad', { required: 'El número de unidad es obligatorio' })}
            />
            {errors.numeroUnidad && (
              <p className="text-sm text-red-500">{errors.numeroUnidad.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edificioTorre">Edificio/Torre</Label>
            <Input id="edificioTorre" {...register('edificioTorre')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="piso">Piso</Label>
            <Input id="piso" {...register('piso')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="destino">Destino</Label>
            <Input id="destino" {...register('destino')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="frente">Frente</Label>
            <Input id="frente" {...register('frente')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sectorId">Sector ID</Label>
            <Input id="sectorId" {...register('sectorId')} />
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Especificaciones */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Especificaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dormitorios">Dormitorios</Label>
            <Input
              id="dormitorios"
              type="number"
              {...register('dormitorios', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tamano">Tamaño</Label>
            <Input
              id="tamano"
              type="number"
              step="0.01"
              {...register('tamano', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="m2Exclusivos">M² Exclusivos</Label>
            <Input
              id="m2Exclusivos"
              type="number"
              step="0.01"
              {...register('m2Exclusivos', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="m2Comunes">M² Comunes</Label>
            <Input
              id="m2Comunes"
              type="number"
              step="0.01"
              {...register('m2Comunes', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="patioTerraza">Patio/Terraza</Label>
            <Input id="patioTerraza" {...register('patioTerraza')} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="m2PatioTerraza">M² Patio/Terraza</Label>
            <Input
              id="m2PatioTerraza"
              type="number"
              step="0.01"
              {...register('m2PatioTerraza', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="m2ParaCalculo">M² Para Cálculo</Label>
            <Input
              id="m2ParaCalculo"
              type="number"
              step="0.01"
              {...register('m2ParaCalculo', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="m2Totales">M² Totales</Label>
            <Input
              id="m2Totales"
              type="number"
              step="0.01"
              {...register('m2Totales', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Precio */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Precio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="precioUSD">Precio USD</Label>
            <Input
              id="precioUSD"
              type="number"
              step="0.01"
              {...register('precioUSD', { valueAsNumber: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="usdM2">USD/M²</Label>
            <Input
              id="usdM2"
              type="number"
              step="0.01"
              {...register('usdM2', { valueAsNumber: true })}
            />
          </div>
        </div>
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
