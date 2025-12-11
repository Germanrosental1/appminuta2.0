import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TipoUnidad } from '@/types/wizard';
import { FilterSelect } from './FilterSelect';

interface UnidadFormularioProps {
    // Filter state
    naturalezas: string[];
    proyectos: string[];
    etapas: string[];
    tipos: string[];
    sectores: string[];
    unidades: Array<{ id: number; descripcion: string; precioUSD?: number }>;

    // Selected values
    naturalezaSeleccionada: string;
    proyectoSeleccionado: string;
    etapaSeleccionada: string;
    tipoSeleccionado: string;
    sectorSeleccionado: string;
    unidadSeleccionada: string;

    // Loading states
    loadingNaturalezas: boolean;
    loadingProyectos: boolean;
    loadingEtapas: boolean;
    loadingTipos: boolean;
    loadingSectores: boolean;
    loadingUnidades: boolean;

    // Handlers
    onNaturalezaChange: (value: string) => void;
    onProyectoChange: (value: string) => void;
    onEtapaChange: (value: string) => void;
    onTipoChange: (value: string) => void;
    onSectorChange: (value: string) => void;
    onUnidadChange: (value: string) => void;

    // Form state
    tipoUnidad: TipoUnidad;
    modoEdicion: boolean;
    errors: Record<string, string>;

    // Actions
    onAgregar: () => void;
    onCancelar: () => void;
}

export const UnidadFormulario: React.FC<UnidadFormularioProps> = (props) => {
    const {
        naturalezas, proyectos, etapas, tipos, sectores, unidades,
        naturalezaSeleccionada, proyectoSeleccionado, etapaSeleccionada,
        tipoSeleccionado, sectorSeleccionado, unidadSeleccionada,
        loadingNaturalezas, loadingProyectos, loadingEtapas,
        loadingTipos, loadingSectores, loadingUnidades,
        onNaturalezaChange, onProyectoChange, onEtapaChange,
        onTipoChange, onSectorChange, onUnidadChange,
        tipoUnidad, modoEdicion, errors,
        onAgregar, onCancelar
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
                <FilterSelect
                    id="naturaleza"
                    label="Naturaleza del Proyecto"
                    value={naturalezaSeleccionada}
                    options={naturalezas}
                    onChange={onNaturalezaChange}
                    loading={loadingNaturalezas}
                    error={errors.naturaleza}
                />

                {naturalezaSeleccionada && (
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

                {etapaSeleccionada && (
                    <FilterSelect
                        id="tipo"
                        label="Tipo"
                        value={tipoSeleccionado}
                        options={tipos}
                        onChange={onTipoChange}
                        loading={loadingTipos}
                        error={errors.tipo}
                    />
                )}

                {tipoSeleccionado && etapaSeleccionada && (
                    <FilterSelect
                        id="sector"
                        label="Sector"
                        value={sectorSeleccionado}
                        options={sectores}
                        onChange={onSectorChange}
                        loading={loadingSectores}
                        error={errors.sector}
                    />
                )}

                {sectorSeleccionado && (
                    <FilterSelect
                        id="unidad"
                        label="Unidad"
                        value={unidadSeleccionada}
                        options={unidades}
                        onChange={onUnidadChange}
                        loading={loadingUnidades}
                        error={errors.unidad}
                        isUnidadSelect
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
