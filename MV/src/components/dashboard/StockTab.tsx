import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Unit } from "@/types/supabase-types";
import { containerVariants, itemVariants, cardHoverEffects } from "./constants";
import { DashboardMetrics, formatNumber, formatCurrency } from "./metrics";

interface StockTabProps {
    loading: boolean;
    metrics: DashboardMetrics;
    units: Unit[];
    tipoDistribution: Record<string, number>;
}

export function StockTab({
    loading,
    metrics,
    units,
    tipoDistribution
}: StockTabProps) {
    const navigate = useNavigate();

    return (
        <>
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
            >
                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card className="bg-green-50 dark:bg-green-950/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Disponibles
                            </CardTitle>
                            <Home className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {metrics.disponibles}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(metrics.disponibles / metrics.totalUnits * 100) || 0}% del total
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card className="bg-yellow-50 dark:bg-yellow-950/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Reservadas
                            </CardTitle>
                            <Users className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {metrics.reservadas}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(metrics.reservadas / metrics.totalUnits * 100) || 0}% del total
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                className="mt-6"
                variants={containerVariants}
            >
                <h3 className="text-lg font-medium mb-4">Inventario por Tipo y Estado</h3>

                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : (
                    <motion.div className="grid gap-4" variants={containerVariants}>
                        {Object.entries(tipoDistribution).map(([tipo, _]) => {
                            const tipoUnits = units.filter(u => u.tipo === tipo);

                            // Filter for Stock (Disponible + Reservado)
                            const stockUnits = tipoUnits.filter(u => u.estado === 'Disponible' || u.estado === 'Reservado');

                            const stockCount = stockUnits.length;
                            const totalM2 = stockUnits.reduce((sum, u) => sum + (u.m2Totales || 0), 0);
                            const totalValue = stockUnits.reduce((sum, u) => sum + (u.precioUSD || 0), 0);
                            const averageValue = stockCount > 0 ? totalValue / stockCount : 0;
                            const averageM2Price = totalM2 > 0 ? totalValue / totalM2 : 0;

                            return (
                                <motion.div key={tipo} variants={itemVariants} whileHover={{ x: 5 }}>
                                    <Card
                                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            params.set('tipo', tipo);
                                            params.set('estado', 'stock');
                                            navigate(`/units?${params.toString()}`);
                                        }}
                                    >
                                        <CardHeader className="py-3 bg-muted/20">
                                            <CardTitle className="text-sm font-medium">{tipo}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-xs">Stock</span>
                                                    <span className="font-bold text-lg">{formatNumber(stockCount)}</span>
                                                    <span className="text-xs text-muted-foreground">unidades</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-xs">Total m²</span>
                                                    <span className="font-bold text-lg">{formatNumber(totalM2)}</span>
                                                    <span className="text-xs text-muted-foreground">m² cubiertos</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-xs">Precio Prom. m²</span>
                                                    <span className="font-bold text-lg">{formatCurrency(averageM2Price)}</span>
                                                    <span className="text-xs text-muted-foreground">USD / m²</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-xs">Promedio Total</span>
                                                    <span className="font-bold text-lg">{formatCurrency(averageValue)}</span>
                                                    <span className="text-xs text-muted-foreground">USD</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-xs">Total</span>
                                                    <span className="font-bold text-lg">{formatCurrency(totalValue)}</span>
                                                    <span className="text-xs text-muted-foreground">USD</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </motion.div>
        </>
    );
}
