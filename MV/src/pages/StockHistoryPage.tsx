import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useAnalyticsEvolution, useGenerateSnapshot } from '@/hooks/useSnapshots';
import { snapshotsAPI, SnapshotComparativo } from '@/services/snapshotsAPI';
import { useQuery } from '@tanstack/react-query';
import StockEvolutionChart from '@/components/dashboard/charts/StockEvolutionChart';
import MonthlyComparisonChart from '@/components/dashboard/charts/MonthlyComparisonChart';
import ProjectComparisonChart from '@/components/dashboard/charts/ProjectComparisonChart';

// Colores para los gráficos
const COLORS = {
    disponible: '#22c55e',
    reservada: '#eab308',
    vendida: '#3b82f6',
    noDisponible: '#6b7280',
};

export default function StockHistoryPage() {
    // ===== UI STATE (only local UI concerns) =====
    const [selectedPeriod, setSelectedPeriod] = useState('6');

    // ===== DERIVED DATE CALCULATIONS =====
    const { endDate, startDate, mesActual, mesAnterior } = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - Number.parseInt(selectedPeriod));

        const mesAct = new Date();
        mesAct.setDate(1);
        mesAct.setMonth(mesAct.getMonth() - 1);
        const mesAnt = new Date(mesAct);
        mesAnt.setMonth(mesAnt.getMonth() - 1);

        return {
            endDate: end.toISOString().split('T')[0],
            startDate: start.toISOString().split('T')[0],
            mesActual: mesAct.toISOString().split('T')[0],
            mesAnterior: mesAnt.toISOString().split('T')[0],
        };
    }, [selectedPeriod]);

    // ===== REACT QUERY HOOKS (replaces useState/useEffect) =====
    // ⚡ PERFORMANCE: Use aggregated data instead of full snapshots
    const {
        data: evolutionRaw = [],
        isLoading: isEvolutionLoading,
    } = useAnalyticsEvolution(startDate, endDate);

    // Comparativo query
    const {
        data: comparativo = [],
        isLoading: isComparativoLoading,
    } = useQuery({
        queryKey: ['snapshots', 'comparativo-all', mesActual, mesAnterior],
        queryFn: () => snapshotsAPI.getComparativo(mesActual, mesAnterior),
        enabled: !!mesActual && !!mesAnterior,
        staleTime: 10 * 60 * 1000,
    });

    // ===== MUTATION (replaces manual setGenerating) =====
    const generateMutation = useGenerateSnapshot();

    // ===== DERIVED STATE (computed from query data) =====
    const loading = isEvolutionLoading || isComparativoLoading;

    // Preparar datos para gráfico de evolución (Chart 1)
    const evolutionData = useMemo(() => {
        return evolutionRaw.map((item) => ({
            fecha: new Date(item.fecha).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
            disponibles: item.disponibles,
            reservadas: item.reservadas,
            vendidas: item.vendidas,
        }));
    }, [evolutionRaw]);

    // Preparar datos para comparativa mes a mes (Chart 2)
    const monthlyComparisonData = useMemo(() => {
        return comparativo.map((c: SnapshotComparativo) => ({
            proyecto: c.proyecto,
            actual: c.actual.disponibles + c.actual.reservadas,
            anterior: c.anterior ? c.anterior.disponibles + c.anterior.reservadas : 0,
            diferencia: c.diferencia ? c.diferencia.disponibles + c.diferencia.reservadas : 0,
        }));
    }, [comparativo]);

    // Preparar datos para comparativa por proyecto (Chart 5)
    const projectData = useMemo(() => {
        return comparativo.map((c: SnapshotComparativo) => ({
            proyecto: c.proyecto.length > 15 ? c.proyecto.substring(0, 15) + '...' : c.proyecto,
            disponibles: c.actual.disponibles,
            reservadas: c.actual.reservadas,
            vendidas: c.actual.vendidas,
        }));
    }, [comparativo]);

    // Calcular KPIs (Chart 6)
    const kpis = useMemo(() => {
        const totalVentasActual = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + c.actual.vendidas, 0);
        const totalVentasAnterior = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + (c.anterior?.vendidas || 0), 0);
        const stockActual = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + c.actual.disponibles + c.actual.reservadas, 0);
        const stockAnterior = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + (c.anterior?.disponibles || 0) + (c.anterior?.reservadas || 0), 0);
        const disponiblesTotal = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + c.actual.disponibles, 0);
        const reservadasTotal = comparativo.reduce((sum: number, c: SnapshotComparativo) => sum + c.actual.reservadas, 0);

        return {
            totalVentasActual,
            totalVentasAnterior,
            stockActual,
            stockAnterior,
            ventasDiff: totalVentasActual - totalVentasAnterior,
            stockDiff: stockActual - stockAnterior,
            disponibles: disponiblesTotal,
            reservadas: reservadasTotal,
        };
    }, [comparativo]);

    const handleGenerateSnapshot = () => {
        generateMutation.mutate('DIARIO');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando historial de stock...</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Historial de Stock</h1>
                    <p className="text-muted-foreground">Análisis y evolución del inventario</p>
                </div>
                <div className="flex gap-4 items-center">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">Últimos 3 meses</SelectItem>
                            <SelectItem value="6">Últimos 6 meses</SelectItem>
                            <SelectItem value="12">Último año</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleGenerateSnapshot} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Generar Snapshot
                    </Button>
                </div>
            </div>

            {/* KPIs - Chart 6 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Stock Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.stockActual}</div>
                        <div className={`flex items-center text-sm ${kpis.stockDiff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {kpis.stockDiff > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : kpis.stockDiff < 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                            {kpis.stockDiff > 0 ? '+' : ''}{kpis.stockDiff} vs mes anterior
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.totalVentasActual}</div>
                        <div className={`flex items-center text-sm ${kpis.ventasDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {kpis.ventasDiff > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : kpis.ventasDiff < 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                            {kpis.ventasDiff > 0 ? '+' : ''}{kpis.ventasDiff} vs mes anterior
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Disponibles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{kpis.disponibles}</div>
                        <p className="text-sm text-muted-foreground">unidades listas para venta</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Reservadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{kpis.reservadas}</div>
                        <p className="text-sm text-muted-foreground">unidades en proceso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Evolución del Stock */}
                <StockEvolutionChart data={evolutionData} colors={COLORS} />

                {/* Chart 2: Comparativa Mes a Mes */}
                <MonthlyComparisonChart data={monthlyComparisonData} />
            </div>

            {/* Chart 5: Comparativa por Proyecto */}
            <ProjectComparisonChart data={projectData} colors={COLORS} />
        </div>
    );
}
