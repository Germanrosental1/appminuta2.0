import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar,
} from 'recharts';
import { snapshotsAPI, SnapshotSummary, SnapshotComparativo } from '@/services/snapshotsAPI';

// Colores para los gráficos
const COLORS = {
    disponible: '#22c55e',
    reservada: '#eab308',
    vendida: '#3b82f6',
    noDisponible: '#6b7280',
};

export default function StockHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [comparativo, setComparativo] = useState<SnapshotComparativo[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState('6');

    // Cargar datos
    useEffect(() => {
        loadData();
    }, [selectedPeriod]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Calcular rango de fechas
            const hasta = new Date();
            const desde = new Date();
            desde.setMonth(desde.getMonth() - Number.parseInt(selectedPeriod));

            const hastaStr = hasta.toISOString().split('T')[0];
            const desdeStr = desde.toISOString().split('T')[0];

            // Cargar snapshots del rango
            const snapshotsData = await snapshotsAPI.getRange(desdeStr, hastaStr);
            setSnapshots(snapshotsData);

            // Cargar comparativo (mes actual vs anterior)
            const mesActual = new Date();
            mesActual.setDate(1);
            mesActual.setMonth(mesActual.getMonth() - 1);
            const mesAnterior = new Date(mesActual);
            mesAnterior.setMonth(mesAnterior.getMonth() - 1);

            const comparativoData = await snapshotsAPI.getComparativo(
                mesActual.toISOString().split('T')[0],
                mesAnterior.toISOString().split('T')[0]
            );
            setComparativo(comparativoData);
        } catch (error) {
            console.error('Error loading stock history:', error);
            toast.error('Error al cargar historial de stock');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSnapshot = async () => {
        setGenerating(true);
        try {
            await snapshotsAPI.generate('DIARIO');
            toast.success('Snapshot generado exitosamente');
            loadData();
        } catch (error) {
            toast.error('Error al generar snapshot');
        } finally {
            setGenerating(false);
        }
    };

    // Preparar datos para gráfico de evolución (Chart 1)
    const evolutionData = snapshots.reduce((acc: any[], snap) => {
        const fecha = new Date(snap.FechaSnapshot).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        const existing = acc.find(d => d.fecha === fecha);
        if (existing) {
            existing.disponibles += snap.Disponibles;
            existing.reservadas += snap.Reservadas;
            existing.vendidas += snap.Vendidas;
        } else {
            acc.push({
                fecha,
                disponibles: snap.Disponibles,
                reservadas: snap.Reservadas,
                vendidas: snap.Vendidas,
            });
        }
        return acc;
    }, []);

    // Preparar datos para comparativa mes a mes (Chart 2)
    const monthlyComparisonData = comparativo.map(c => ({
        proyecto: c.proyecto,
        actual: c.actual.disponibles + c.actual.reservadas,
        anterior: c.anterior ? c.anterior.disponibles + c.anterior.reservadas : 0,
        diferencia: c.diferencia ? c.diferencia.disponibles + c.diferencia.reservadas : 0,
    }));

    // Preparar datos para comparativa por proyecto (Chart 5)
    const projectData = comparativo.map(c => ({
        proyecto: c.proyecto.length > 15 ? c.proyecto.substring(0, 15) + '...' : c.proyecto,
        disponibles: c.actual.disponibles,
        reservadas: c.actual.reservadas,
        vendidas: c.actual.vendidas,
    }));

    // Calcular KPIs de velocidad de ventas (Chart 6)
    const totalVentasActual = comparativo.reduce((sum, c) => sum + c.actual.vendidas, 0);
    const totalVentasAnterior = comparativo.reduce((sum, c) => sum + (c.anterior?.vendidas || 0), 0);
    const stockActual = comparativo.reduce((sum, c) => sum + c.actual.disponibles + c.actual.reservadas, 0);
    const stockAnterior = comparativo.reduce((sum, c) => sum + (c.anterior?.disponibles || 0) + (c.anterior?.reservadas || 0), 0);
    const ventasDiff = totalVentasActual - totalVentasAnterior;
    const stockDiff = stockActual - stockAnterior;

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
                    <Button onClick={handleGenerateSnapshot} disabled={generating}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
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
                        <div className="text-2xl font-bold">{stockActual}</div>
                        <div className={`flex items-center text-sm ${stockDiff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {stockDiff > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : stockDiff < 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                            {stockDiff > 0 ? '+' : ''}{stockDiff} vs mes anterior
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalVentasActual}</div>
                        <div className={`flex items-center text-sm ${ventasDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {ventasDiff > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : ventasDiff < 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                            {ventasDiff > 0 ? '+' : ''}{ventasDiff} vs mes anterior
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Disponibles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {comparativo.reduce((sum, c) => sum + c.actual.disponibles, 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">unidades listas para venta</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Reservadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {comparativo.reduce((sum, c) => sum + c.actual.reservadas, 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">unidades en proceso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Evolución del Stock */}
                <Card>
                    <CardHeader>
                        <CardTitle>Evolución del Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {evolutionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={evolutionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="fecha" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="disponibles" name="Disponibles" stroke={COLORS.disponible} strokeWidth={2} />
                                    <Line type="monotone" dataKey="reservadas" name="Reservadas" stroke={COLORS.reservada} strokeWidth={2} />
                                    <Line type="monotone" dataKey="vendidas" name="Vendidas" stroke={COLORS.vendida} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                No hay datos de snapshots. Genera uno para comenzar.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Chart 2: Comparativa Mes a Mes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Comparativa Mes a Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthlyComparisonData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyComparisonData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="proyecto" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="actual" name="Mes Actual" fill="#3b82f6" />
                                    <Bar dataKey="anterior" name="Mes Anterior" fill="#94a3b8" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                No hay datos comparativos disponibles.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Chart 5: Comparativa por Proyecto */}
            <Card>
                <CardHeader>
                    <CardTitle>Stock por Proyecto</CardTitle>
                </CardHeader>
                <CardContent>
                    {projectData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={projectData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="proyecto" type="category" width={120} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="disponibles" name="Disponibles" stackId="a" fill={COLORS.disponible} />
                                <Bar dataKey="reservadas" name="Reservadas" stackId="a" fill={COLORS.reservada} />
                                <Bar dataKey="vendidas" name="Vendidas" stackId="a" fill={COLORS.vendida} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                            No hay datos de proyectos disponibles.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
