import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface MonthlyComparisonData {
    proyecto: string;
    actual: number;
    anterior: number;
    diferencia: number;
}

interface MonthlyComparisonChartProps {
    data: MonthlyComparisonData[];
}

const MonthlyComparisonChart = React.memo(({ data }: MonthlyComparisonChartProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Comparativa Mes a Mes</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} layout="vertical">
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
    );
});

MonthlyComparisonChart.displayName = 'MonthlyComparisonChart';

export default MonthlyComparisonChart;
