import { motion } from "framer-motion";
import { Building2, DollarSign, BarChart3, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { containerVariants, itemVariants, cardHoverEffects, STATUS_COLORS } from "./constants";
import { DashboardMetrics, formatNumber, formatCurrency } from "./metrics";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, totalUnits }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-background border rounded p-2 shadow-md text-xs">
                <p className="font-semibold" style={{ color: data.color }}>{data.name}</p>
                <p>Cantidad: {data.value}</p>
                <p>Porcentaje: {Math.round(data.value / totalUnits * 100)}%</p>
            </div>
        );
    }
    return null;
};

interface MetricasTabProps {
    loading: boolean;
    metrics: DashboardMetrics;
    statusData: Array<{ name: string; value: number; color: string }>;
    tipoData: Array<{ name: string; value: number; color: string }>;
    dormitoriosData: Array<{ name: string; key: string; value: number; color: string }>;
    motivosData: Array<{ name: string; key: string; value: number; color: string }>;
    selectedStatus: string | null;
    setSelectedStatus: (status: string | null) => void;
    selectedType: string | null;
    setSelectedType: (type: string | null) => void;
    selectedDorms: string | null;
    setSelectedDorms: (dorms: string | null) => void;
    selectedMotivo: string | null;
    setSelectedMotivo: (motivo: string | null) => void;
    showTotalValue: boolean;
    setShowTotalValue: (show: boolean) => void;
    animationKey: number;
}

export function MetricasTab({
    loading,
    metrics,
    statusData,
    tipoData,
    dormitoriosData,
    motivosData,
    selectedStatus,
    setSelectedStatus,
    selectedType,
    setSelectedType,
    selectedDorms,
    setSelectedDorms,
    selectedMotivo,
    setSelectedMotivo,
    showTotalValue,
    setShowTotalValue,
    animationKey
}: MetricasTabProps) {
    return (
        <>
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
            >
                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Unidades
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold">{formatNumber(metrics.totalUnits)}</div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {showTotalValue ? "Valor Total" : "Promedio Total"}
                            </CardTitle>
                            <button
                                onClick={() => setShowTotalValue(!showTotalValue)}
                                className="hover:bg-accent rounded-full p-1 transition-colors border-none bg-transparent cursor-pointer"
                                title={showTotalValue ? "Ver promedio" : "Ver total"}
                            >
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-28" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {formatCurrency(showTotalValue ? metrics.valorTotal : metrics.valorPromedio)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Precio Promedio m²
                            </CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold">{formatCurrency(metrics.precioPromedioM2)}</div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={cardHoverEffects}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total m²
                            </CardTitle>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold">{formatNumber(metrics.totalM2)} m²</div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                className="grid gap-4 md:grid-cols-2 mt-4"
                variants={containerVariants}
            >
                {/* Status Chart */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Distribución por Estado
                                {selectedStatus && (
                                    <button
                                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/20 border-none flex items-center gap-1"
                                        onClick={() => setSelectedStatus(null)}
                                        title="Limpiar filtro"
                                        aria-label={`Eliminar filtro de estado ${selectedStatus}`}
                                    >
                                        Filtrado por: {selectedStatus} (x)
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            {loading ? (
                                <Skeleton className="h-[250px] w-full" />
                            ) : (
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                onClick={(data) => {
                                                    setSelectedStatus(selectedStatus === data.name ? null : data.name);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                        stroke={selectedStatus === entry.name ? "#000" : "none"}
                                                        strokeWidth={2}
                                                        className="cursor-pointer hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip totalUnits={metrics.totalUnits} />} />
                                            <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={{ paddingLeft: "10px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Type Chart */}
                <motion.div variants={itemVariants}>
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Distribución por Tipo
                                {selectedType && (
                                    <button
                                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/20 border-none flex items-center gap-1"
                                        onClick={() => setSelectedType(null)}
                                        title="Limpiar filtro"
                                        aria-label={`Eliminar filtro de tipo ${selectedType}`}
                                    >
                                        Filtrado por: {selectedType} (x)
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            {loading ? (
                                <Skeleton className="h-[250px] w-full" />
                            ) : (
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={tipoData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                onClick={(data) => {
                                                    setSelectedType(selectedType === data.name ? null : data.name);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {tipoData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                        stroke={selectedType === entry.name ? "#000" : "none"}
                                                        strokeWidth={2}
                                                        className="cursor-pointer hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip totalUnits={metrics.totalUnits} />} />
                                            <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={{ paddingLeft: "10px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                className="grid gap-4 md:grid-cols-2 mt-4"
                variants={containerVariants}
            >
                <motion.div
                    variants={itemVariants}
                    className={`transition-all duration-500 ease-in-out overflow-hidden w-full ${(!selectedType || selectedType === 'Departamento')
                        ? 'opacity-100 max-h-[500px] mt-4'
                        : 'opacity-0 max-h-0 mt-0'
                        }`}
                >
                    <Card className="flex flex-col h-full">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Distribución por Dormitorios
                                {selectedDorms && (
                                    <button
                                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/20 border-none flex items-center gap-1"
                                        onClick={() => setSelectedDorms(null)}
                                        title="Limpiar filtro"
                                        aria-label={`Eliminar filtro de dormitorios ${selectedDorms}`}
                                    >
                                        Filtrado por: {selectedDorms} (x)
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            {loading ? (
                                <Skeleton className="h-[250px] w-full" />
                            ) : (
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart key={animationKey}>
                                            <Pie
                                                data={dormitoriosData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                isAnimationActive={true}
                                                animationBegin={400}
                                                animationDuration={1500}
                                                animationEasing="ease-out"
                                                onClick={(data) => {
                                                    const key = data.payload.key || data.payload.name.split(' ')[0];
                                                    setSelectedDorms(selectedDorms === key ? null : key);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {dormitoriosData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                        stroke={selectedDorms === entry.key ? "#000" : "none"}
                                                        strokeWidth={2}
                                                        className="cursor-pointer hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip totalUnits={metrics.totalUnits} />} />
                                            <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={{ paddingLeft: "10px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Motivos Chart - Only visible when No disponible is selected or there's data */}
                <motion.div
                    variants={itemVariants}
                    className={`transition-all duration-500 ease-in-out overflow-hidden w-full ${motivosData.length > 0
                            ? 'opacity-100 max-h-[500px]'
                            : 'opacity-0 max-h-0'
                        }`}
                >
                    <Card className="flex flex-col h-full">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Distribución por Motivo
                                {selectedMotivo && (
                                    <button
                                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/20 border-none flex items-center gap-1"
                                        onClick={() => setSelectedMotivo(null)}
                                        title="Limpiar filtro"
                                        aria-label={`Eliminar filtro de motivo ${selectedMotivo}`}
                                    >
                                        Filtrado por: {selectedMotivo} (x)
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            {loading ? (
                                <Skeleton className="h-[250px] w-full" />
                            ) : (
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart key={animationKey + 1}>
                                            <Pie
                                                data={motivosData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                isAnimationActive={true}
                                                animationBegin={400}
                                                animationDuration={1500}
                                                animationEasing="ease-out"
                                                onClick={(data) => {
                                                    const key = data.payload.key || data.payload.name;
                                                    setSelectedMotivo(selectedMotivo === key ? null : key);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {motivosData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                        stroke={selectedMotivo === entry.key ? "#000" : "none"}
                                                        strokeWidth={2}
                                                        className="cursor-pointer hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip totalUnits={motivosData.reduce((sum, m) => sum + m.value, 0)} />} />
                                            <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={{ paddingLeft: "10px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </>
    );
}
