import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ProjectComparisonData {
    proyecto: string;
    disponibles: number;
    reservadas: number;
    vendidas: number;
}

interface ProjectComparisonChartProps {
    data: ProjectComparisonData[];
    colors: {
        disponible: string;
        reservada: string;
        vendida: string;
    };
}

const ProjectComparisonChart = React.memo(({ data, colors }: ProjectComparisonChartProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Stock por Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="proyecto" type="category" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="disponibles" name="Disponibles" stackId="a" fill={colors.disponible} />
                            <Bar dataKey="reservadas" name="Reservadas" stackId="a" fill={colors.reservada} />
                            <Bar dataKey="vendidas" name="Vendidas" stackId="a" fill={colors.vendida} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        No hay datos de proyectos disponibles.
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

ProjectComparisonChart.displayName = 'ProjectComparisonChart';

export default ProjectComparisonChart;
