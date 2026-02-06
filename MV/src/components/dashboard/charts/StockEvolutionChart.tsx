import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface EvolutionData {
    fecha: string;
    disponibles: number;
    reservadas: number;
    vendidas: number;
}

interface StockEvolutionChartProps {
    data: EvolutionData[];
    colors: {
        disponible: string;
        reservada: string;
        vendida: string;
    };
}

const StockEvolutionChart = React.memo(({ data, colors }: StockEvolutionChartProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Evolución del Stock</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="disponibles" name="Disponibles" stroke={colors.disponible} strokeWidth={2} />
                            <Line type="monotone" dataKey="reservadas" name="Reservadas" stroke={colors.reservada} strokeWidth={2} />
                            <Line type="monotone" dataKey="vendidas" name="Vendidas" stroke={colors.vendida} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        No hay datos de snapshots. Genera uno para comenzar.
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

StockEvolutionChart.displayName = 'StockEvolutionChart';

export default StockEvolutionChart;
