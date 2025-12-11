import { useState, useEffect } from 'react';
import {
    UnidadResumen,
    getNaturalezasProyecto,
    getProyectosPorNaturaleza,
    getEtapasPorProyecto,
    getTiposPorProyectoYEtapa,
    getSectoresPorProyectoEtapaYTipo,
    getUnidadesPorEtapaTipoYSector
} from '@/services/unidades';

interface UseUnidadFiltersReturn {
    // Opciones disponibles
    naturalezas: string[];
    proyectos: string[];
    etapas: string[];
    tipos: string[];
    sectores: string[];
    unidades: UnidadResumen[];

    // Selecciones actuales
    naturalezaSeleccionada: string;
    proyectoSeleccionado: string;
    etapaSeleccionada: string;
    tipoSeleccionado: string;
    sectorSeleccionado: string;
    unidadSeleccionada: string;

    // Estados de carga
    loadingNaturalezas: boolean;
    loadingProyectos: boolean;
    loadingEtapas: boolean;
    loadingTipos: boolean;
    loadingSectores: boolean;
    loadingUnidades: boolean;

    // Handlers
    setNaturalezaSeleccionada: (value: string) => void;
    setProyectoSeleccionado: (value: string) => void;
    setEtapaSeleccionada: (value: string) => void;
    setTipoSeleccionado: (value: string) => void;
    setSectorSeleccionado: (value: string) => void;
    setUnidadSeleccionada: (value: string) => void;
    resetFilters: () => void;
}

export const useUnidadFilters = (): UseUnidadFiltersReturn => {
    // Estados para las opciones
    const [naturalezas, setNaturalezas] = useState<string[]>([]);
    const [proyectos, setProyectos] = useState<string[]>([]);
    const [etapas, setEtapas] = useState<string[]>([]);
    const [tipos, setTipos] = useState<string[]>([]);
    const [sectores, setSectores] = useState<string[]>([]);
    const [unidades, setUnidades] = useState<UnidadResumen[]>([]);

    // Estados para las selecciones
    const [naturalezaSeleccionada, setNaturalezaSeleccionada] = useState<string>('');
    const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');
    const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>('');
    const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('');
    const [sectorSeleccionado, setSectorSeleccionado] = useState<string>('');
    const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>('');

    // Estados de carga
    const [loadingNaturalezas, setLoadingNaturalezas] = useState(false);
    const [loadingProyectos, setLoadingProyectos] = useState(false);
    const [loadingEtapas, setLoadingEtapas] = useState(false);
    const [loadingTipos, setLoadingTipos] = useState(false);
    const [loadingSectores, setLoadingSectores] = useState(false);
    const [loadingUnidades, setLoadingUnidades] = useState(false);

    // Cargar naturalezas al montar
    useEffect(() => {
        const fetchNaturalezas = async () => {
            setLoadingNaturalezas(true);
            try {
                const naturalezasDisponibles = await getNaturalezasProyecto();
                setNaturalezas(naturalezasDisponibles);
            } catch (error) {
                console.error('Error al cargar naturalezas:', error);
            } finally {
                setLoadingNaturalezas(false);
            }
        };

        fetchNaturalezas();
    }, []);

    // Cargar proyectos cuando cambia la naturaleza
    useEffect(() => {
        if (!naturalezaSeleccionada) {
            setProyectos([]);
            return;
        }

        const fetchProyectos = async () => {
            setLoadingProyectos(true);
            try {
                const proyectosDisponibles = await getProyectosPorNaturaleza(naturalezaSeleccionada);
                setProyectos(proyectosDisponibles);

                setProyectoSeleccionado('');
                setEtapaSeleccionada('');
                setTipoSeleccionado('');
                setSectorSeleccionado('');
                setUnidadSeleccionada('');
                setEtapas([]);
                setTipos([]);
                setSectores([]);
                setUnidades([]);
            } catch (error) {
                console.error('Error al cargar proyectos:', error);
            } finally {
                setLoadingProyectos(false);
            }
        };

        fetchProyectos();
    }, [naturalezaSeleccionada]);

    // Cargar etapas cuando cambia el proyecto
    useEffect(() => {
        if (!proyectoSeleccionado) {
            setEtapas([]);
            return;
        }

        const fetchEtapas = async () => {
            setLoadingEtapas(true);
            try {
                const etapasDisponibles = await getEtapasPorProyecto(proyectoSeleccionado);
                setEtapas(etapasDisponibles);

                setEtapaSeleccionada('');
                setTipoSeleccionado('');
                setSectorSeleccionado('');
                setUnidadSeleccionada('');
                setTipos([]);
                setSectores([]);
                setUnidades([]);
            } catch (error) {
                console.error('Error al cargar etapas:', error);
            } finally {
                setLoadingEtapas(false);
            }
        };

        fetchEtapas();
    }, [proyectoSeleccionado]);

    // Cargar tipos cuando cambia la etapa
    useEffect(() => {
        if (!proyectoSeleccionado || !etapaSeleccionada) {
            setTipos([]);
            return;
        }

        const fetchTipos = async () => {
            setLoadingTipos(true);
            try {
                const tiposDisponibles = await getTiposPorProyectoYEtapa(proyectoSeleccionado, etapaSeleccionada);
                setTipos(tiposDisponibles);

                setTipoSeleccionado('');
                setSectorSeleccionado('');
                setUnidadSeleccionada('');
                setSectores([]);
                setUnidades([]);
            } catch (error) {
                console.error('Error al cargar tipos:', error);
            } finally {
                setLoadingTipos(false);
            }
        };

        fetchTipos();
    }, [proyectoSeleccionado, etapaSeleccionada]);

    // Cargar sectores cuando cambia el tipo
    useEffect(() => {
        if (!proyectoSeleccionado || !etapaSeleccionada || !tipoSeleccionado) {
            setSectores([]);
            return;
        }

        const fetchSectores = async () => {
            setLoadingSectores(true);
            try {
                const sectoresDisponibles = await getSectoresPorProyectoEtapaYTipo(
                    proyectoSeleccionado,
                    etapaSeleccionada,
                    tipoSeleccionado
                );
                setSectores(sectoresDisponibles);

                setSectorSeleccionado('');
                setUnidadSeleccionada('');
                setUnidades([]);
            } catch (error) {
                console.error('Error al cargar sectores:', error);
            } finally {
                setLoadingSectores(false);
            }
        };

        fetchSectores();
    }, [proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado]);

    // Cargar unidades cuando cambia el sector
    useEffect(() => {
        if (!proyectoSeleccionado || !etapaSeleccionada || !tipoSeleccionado || !sectorSeleccionado) {
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
                console.error('Error al cargar unidades:', error);
            } finally {
                setLoadingUnidades(false);
            }
        };

        fetchUnidades();
    }, [proyectoSeleccionado, etapaSeleccionada, tipoSeleccionado, sectorSeleccionado]);

    const resetFilters = () => {
        setNaturalezaSeleccionada('');
        setProyectoSeleccionado('');
        setEtapaSeleccionada('');
        setTipoSeleccionado('');
        setSectorSeleccionado('');
        setUnidadSeleccionada('');
    };

    return {
        naturalezas,
        proyectos,
        etapas,
        tipos,
        sectores,
        unidades,
        naturalezaSeleccionada,
        proyectoSeleccionado,
        etapaSeleccionada,
        tipoSeleccionado,
        sectorSeleccionado,
        unidadSeleccionada,
        loadingNaturalezas,
        loadingProyectos,
        loadingEtapas,
        loadingTipos,
        loadingSectores,
        loadingUnidades,
        setNaturalezaSeleccionada,
        setProyectoSeleccionado,
        setEtapaSeleccionada,
        setTipoSeleccionado,
        setSectorSeleccionado,
        setUnidadSeleccionada,
        resetFilters
    };
};
