import { useState, useEffect, useRef } from 'react';
import { useTiposDisponibles, useProyectosPorTipo, useEtapas, useSectores } from './useUnidades';
import {
    UnidadResumen,
    getUnidadesPorEtapaTipoYSector
} from '@/services/unidades';

interface UseUnidadFiltersReturn {
    // Opciones disponibles
    tiposDisponibles: string[];
    proyectos: string[];
    etapas: string[];
    sectores: string[];
    unidades: UnidadResumen[];

    // Selecciones actuales
    tipoSeleccionado: string;
    proyectoSeleccionado: string;
    etapaSeleccionada: string;
    sectorSeleccionado: string;
    unidadSeleccionada: string;

    // Estados de carga
    loadingTiposDisponibles: boolean;
    loadingProyectos: boolean;
    loadingEtapas: boolean;
    loadingSectores: boolean;
    loadingUnidades: boolean;

    // Handlers
    setTipoSeleccionado: (value: string) => void;
    setProyectoSeleccionado: (value: string) => void;
    setEtapaSeleccionada: (value: string) => void;
    setSectorSeleccionado: (value: string) => void;
    setUnidadSeleccionada: (value: string) => void;
    setAllFilters: (filters: {
        tipo: string;
        proyecto: string;
        etapa: string;
        sector: string;
        unidad: string;
    }) => void;
    resetFilters: () => void;
}

export const useUnidadFilters = (): UseUnidadFiltersReturn => {
    // Estados para unidades (local)
    const [unidades, setUnidades] = useState<UnidadResumen[]>([]);

    // Estados para las selecciones - TIPO PRIMERO
    const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('');
    const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');
    const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>('');
    const [sectorSeleccionado, setSectorSeleccionado] = useState<string>('');
    const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('');

    // Estado de carga local
    const [loadingUnidades, setLoadingUnidades] = useState(false);

    // Flag to skip cascade resets when setting all filters at once (for edit mode)
    const skipCascadeRef = useRef(false);

    // ⚡ OPTIMIZACIÓN: Usar React Query hooks
    // 1. Cargar TODOS los tipos disponibles (no filtrado)
    const { data: tiposDisponibles = [], isLoading: loadingTiposDisponibles } = useTiposDisponibles();

    // 2. Cargar proyectos filtrados por tipo seleccionado
    const { data: proyectos = [], isLoading: loadingProyectos } = useProyectosPorTipo(tipoSeleccionado);

    // 3. Cargar etapas del proyecto seleccionado
    const { data: etapas = [], isLoading: loadingEtapas } = useEtapas(proyectoSeleccionado);

    // 4. Cargar sectores (proyecto + etapa + tipo)
    const { data: sectores = [], isLoading: loadingSectores } = useSectores(
        proyectoSeleccionado,
        etapaSeleccionada,
        tipoSeleccionado // Pass tipo to filter sectores correctly
    );

    // Reset cuando cambia el TIPO
    useEffect(() => {
        if (tipoSeleccionado && !skipCascadeRef.current) {
            setProyectoSeleccionado('');
            setEtapaSeleccionada('');
            setSectorSeleccionado('');
            setUnidadSeleccionada('');
            setUnidades([]);
        }
    }, [tipoSeleccionado]);

    // Reset cuando cambia el proyecto
    useEffect(() => {
        if (proyectoSeleccionado && !skipCascadeRef.current) {
            setEtapaSeleccionada('');
            setSectorSeleccionado('');
            setUnidadSeleccionada('');
            setUnidades([]);
        }
    }, [proyectoSeleccionado]);

    // Reset cuando cambia la etapa
    useEffect(() => {
        if (etapaSeleccionada && !skipCascadeRef.current) {
            setSectorSeleccionado('');
            setUnidadSeleccionada('');
            setUnidades([]);
        }
    }, [etapaSeleccionada]);

    // Cargar unidades cuando cambia el sector
    useEffect(() => {
        if (!proyectoSeleccionado || !etapaSeleccionada || !sectorSeleccionado) {
            setUnidades([]);
            return;
        }

        const fetchUnidades = async () => {
            setLoadingUnidades(true);
            try {
                const unidadesDisponibles = await getUnidadesPorEtapaTipoYSector(
                    proyectoSeleccionado,
                    etapaSeleccionada,
                    tipoSeleccionado,
                    sectorSeleccionado
                );
                setUnidades(unidadesDisponibles);
                setUnidadSeleccionada('');
            } catch (error) {
                setUnidades([]);
            } finally {
                setLoadingUnidades(false);
            }
        };

        fetchUnidades();
    }, [proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado, sectorSeleccionado]);

    const setAllFilters = (filters: {
        tipo: string;
        proyecto: string;
        etapa: string;
        sector: string;
        unidad: string;
    }) => {
        skipCascadeRef.current = true;

        setTipoSeleccionado(filters.tipo);
        setProyectoSeleccionado(filters.proyecto);
        setEtapaSeleccionada(filters.etapa);
        setSectorSeleccionado(filters.sector);
        setUnidadSeleccionada(filters.unidad);

        // Reset the flag after a tick to allow normal cascade behavior afterwards
        setTimeout(() => {
            skipCascadeRef.current = false;
        }, 0);
    };

    const resetFilters = () => {
        setTipoSeleccionado('');
        setProyectoSeleccionado('');
        setEtapaSeleccionada('');
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
        setUnidades([]);
    };

    return {
        tiposDisponibles,
        proyectos,
        etapas,
        sectores,
        unidades,
        tipoSeleccionado,
        proyectoSeleccionado,
        etapaSeleccionada,
        sectorSeleccionado,
        unidadSeleccionada,
        loadingTiposDisponibles,
        loadingProyectos,
        loadingEtapas,
        loadingSectores,
        loadingUnidades,
        setTipoSeleccionado,
        setProyectoSeleccionado,
        setEtapaSeleccionada,
        setSectorSeleccionado,
        setUnidadSeleccionada,
        setAllFilters,
        resetFilters
    };
};
