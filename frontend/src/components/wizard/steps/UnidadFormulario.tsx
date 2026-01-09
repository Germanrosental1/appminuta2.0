import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TipoUnidad } from '@/types/wizard';
import { FilterSelect } from './FilterSelect';

interface UnidadFormularioProps {
    // Filter state
    proyectos: string[];
    etapas: string[];
    unidades: Array<{ id: string; descripcion: string; precioUSD?: number }>;

    // Selected values
    proyectoSeleccionado: string;
    etapaSeleccionada: string;
    unidadSeleccionada: string;

    // Loading states
    loadingProyectos: boolean;
    loadingEtapas: boolean;
    loadingUnidades: boolean;

    // Handlers
    onProyectoChange: (value: string) => void;
    onEtapaChange: (value: string) => void;
    onUnidadChange: (value: string) => void;

    // Form state
    tipoUnidad: TipoUnidad;
    modoEdicion: boolean;
    errors: Record<string, string>;

    // Actions
    onAgregar: () => void;
    onCancelar: () => void;

    // Optional: Project is locked at top level
    proyectoBloqueado?: boolean;
}

export const UnidadFormulario: React.FC<UnidadFormularioProps> = (props) => {
    const {
        proyectos, etapas, unidades,
        proyectoSeleccionado, etapaSeleccionada,
        unidadSeleccionada,
        loadingProyectos, loadingEtapas,
        loadingUnidades,
        onProyectoChange, onEtapaChange,
        onUnidadChange,
        tipoUnidad, modoEdicion, errors,
        onAgregar, onCancelar,
        proyectoBloqueado = false
    } = props;

    return (
        <Card className="border-primary/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                        {modoEdicion ? 'Editar' : 'Agregar'} {tipoUnidad}
                    </CardTitle>
                    <Badge variant="outline">{tipoUnidad}</Badge>
                </div>
                <CardDescription>
                    Complete los datos para {modoEdicion ? 'actualizar' : 'agregar'} esta unidad
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* PROYECTO - Show as text if locked, otherwise dropdown */}
                {proyectoBloqueado ? (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Proyecto</label>
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                            <span>{proyectoSeleccionado}</span>
                        </div>
                    </div>
                ) : (
                    <FilterSelect
                        id="proyecto"
                        label="Proyecto"
                        value={proyectoSeleccionado}
                        options={proyectos}
                        onChange={onProyectoChange}
                        loading={loadingProyectos}
                        error={errors.proyecto}
                    />
                )}

                {/* ETAPA - Only show after proyecto selected */}
                {proyectoSeleccionado && (
                    <FilterSelect
                        id="etapa"
                        label="Etapa"
                        value={etapaSeleccionada}
                        options={etapas}
                        onChange={onEtapaChange}
                        loading={loadingEtapas}
                        error={errors.etapa}
                    />
                )}

                {/* UNIDAD - Show after etapa selected */}
                {etapaSeleccionada && (
                    <FilterSelect
                        id="unidad"
                        label="Unidad"
                        value={unidadSeleccionada}
                        options={unidades}
                        onChange={onUnidadChange}
                        loading={loadingUnidades}
                        error={errors.unidad}
                        isUnidadSelect
                        searchable={true}
                    />
                )}
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancelar}>
                    Cancelar
                </Button>
                <Button onClick={onAgregar} disabled={!unidadSeleccionada}>
                    {modoEdicion ? 'Actualizar' : 'Agregar'} Unidad
                </Button>
            </CardFooter>
        </Card>
    );
};

