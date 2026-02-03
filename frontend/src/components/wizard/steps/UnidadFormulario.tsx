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
        <Card className="border-[#334366] bg-[#1a2233] text-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">
                        {modoEdicion ? 'Editar' : 'Agregar'} {tipoUnidad}
                    </CardTitle>
                    <Badge variant="outline" className="border-blue-500/50 text-blue-400">{tipoUnidad}</Badge>
                </div>
                <CardDescription className="text-[#92a4c8]">
                    Complete los datos para {modoEdicion ? 'actualizar' : 'agregar'} esta unidad
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* PROYECTO - Show as text if locked, otherwise dropdown */}
                {proyectoBloqueado ? (
                    <div className="space-y-2">
                        <span className="text-sm font-medium text-white">Proyecto</span>
                        <div className="flex items-center h-10 px-3 rounded-md border border-[#334366] bg-[#0f131a] text-white">
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
                        triggerClassName="bg-[#0f131a] border-[#334366] text-white"
                        contentClassName="bg-[#1a2233] border-[#334366] text-white"
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
                        triggerClassName="bg-[#0f131a] border-[#334366] text-white"
                        contentClassName="bg-[#1a2233] border-[#334366] text-white"
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
                        triggerClassName="bg-[#0f131a] border-[#334366] text-white"
                        contentClassName="bg-[#1a2233] border-[#334366] text-white"
                    />
                )}
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancelar} className="border-[#334366] text-[#92a4c8] hover:bg-[#334366] hover:text-white">
                    Cancelar
                </Button>
                <Button onClick={onAgregar} disabled={!unidadSeleccionada} className="bg-primary hover:bg-blue-600">
                    {modoEdicion ? 'Actualizar' : 'Agregar'} Unidad
                </Button>
            </CardFooter>
        </Card>
    );
};

