import { Unit } from "@/types/supabase-types";

export interface DashboardMetrics {
    totalUnits: number;
    disponibles: number;
    reservadas: number;
    vendidas: number;
    noDisponibles: number;
    valorTotal: number;
    valorPromedio: number;
    precioPromedioM2: number;
    totalM2: number;
}

// Calculate metrics from units array
export function getMetrics(data: Unit[]): DashboardMetrics {
    if (!data.length) return {
        totalUnits: 0,
        disponibles: 0,
        reservadas: 0,
        vendidas: 0,
        noDisponibles: 0,
        valorTotal: 0,
        valorPromedio: 0,
        precioPromedioM2: 0,
        totalM2: 0,
    };

    const disponibles = data.filter(u => u.estado === 'Disponible').length;
    const reservadas = data.filter(u => u.estado === 'Reservado').length;
    const vendidas = data.filter(u => u.estado === 'Vendido').length;
    const noDisponibles = data.filter(u => u.estado === 'No disponible').length;

    const valorTotal = data.reduce((sum, unit) => sum + (unit.precioUSD || 0), 0);
    const valorPromedio = valorTotal / data.length;

    const unitsConPrecio = data.filter(u => u.precioUSD > 0 && u.m2Totales > 0);
    const precioPromedioM2 = unitsConPrecio.length
        ? unitsConPrecio.reduce((sum, unit) => sum + unit.usdM2, 0) / unitsConPrecio.length
        : 0;

    const totalM2 = data.reduce((sum, unit) => sum + (unit.m2Totales || 0), 0);

    return {
        totalUnits: data.length,
        disponibles,
        reservadas,
        vendidas,
        noDisponibles,
        valorTotal,
        valorPromedio,
        precioPromedioM2,
        totalM2,
    };
}

// Calculate distribution by status
export function getStatusDistribution(data: Unit[]) {
    const counts = {
        'Disponible': 0,
        'Reservado': 0,
        'Vendido': 0,
        'No disponible': 0
    };
    data.forEach(u => {
        if (!u.estado) return;
        const estado = u.estado.toLowerCase();
        if (estado === 'disponible') {
            counts['Disponible']++;
        } else if (estado === 'reservado' || estado === 'reservada') {
            counts['Reservado']++;
        } else if (estado === 'vendido' || estado === 'vendida') {
            counts['Vendido']++;
        } else {
            // "No disponible", "No Disponible", "Alquilada", etc.
            counts['No disponible']++;
        }
    });
    return counts;
}

// Calculate distribution by type
export function getTipoDistribution(data: Unit[]) {
    const tipoCount: Record<string, number> = {};
    data.forEach(unit => {
        const tipo = unit.tipo || 'Sin tipo';
        tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });
    return tipoCount;
}

// Calculate distribution by bedrooms
export function getDormitoriosDistribution(data: Unit[]) {
    const dormCount: Record<string, number> = {};
    data.forEach(unit => {
        const dorms = unit.dormitorios.toString() || '0';
        dormCount[dorms] = (dormCount[dorms] || 0) + 1;
    });
    return dormCount;
}

// Calculate distribution by motivos (for "No disponible" units)
export function getMotivosDistribution(data: Unit[]) {
    const motivoCount: Record<string, number> = {};
    data.forEach(unit => {
        const motivo = unit.motivoNoDisponibilidad || 'Sin motivo';
        if (motivo && motivo.trim() !== '') {
            motivoCount[motivo] = (motivoCount[motivo] || 0) + 1;
        }
    });
    return motivoCount;
}

// Format number for display
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('es-AR').format(Math.round(num));
}

// Format currency for display
export function formatCurrency(num: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(num);
}
