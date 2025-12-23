import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseService } from "@/services/supabaseService";
import { Unit } from "@/types/supabase-types";
import { Building2, Home, DollarSign, Layers, BarChart3, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Componente de Tooltip personalizado
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDorms, setSelectedDorms] = useState<string | null>(null);
  const [showTotalValue, setShowTotalValue] = useState(false);

  // Helper to get units filtered by everything EXCEPT the specified dimension
  const getFilteredUnits = (exclude: 'status' | 'type' | 'dorms' | 'none') => {
    return units.filter(u => {
      // 1. Status Filter
      if (exclude !== 'status' && selectedStatus) {
        const statusMap: Record<string, string> = {
          'Disponibles': 'Disponible',
          'Reservadas': 'Reservado',
          'Vendidas': 'Vendido',
          'No disponibles': 'No disponible'
        };
        const dbStatus = statusMap[selectedStatus] || selectedStatus;
        if (u.estado !== dbStatus) return false;
      }

      // 2. Type Filter
      if (exclude !== 'type' && selectedType) {
        const tipo = u.tipo || 'Sin tipo';
        if (tipo !== selectedType) return false;
      }

      // 3. Dorms Filter
      if (exclude !== 'dorms' && selectedDorms) {
        // Handle "X dorms" format via raw key stored in selection
        const dorms = u.dormitorios.toString() || '0';
        if (dorms !== selectedDorms) return false;
      }

      return true;
    });
  };

  // Data for Charts
  const unitsForStatus = getFilteredUnits('status');
  const unitsForType = getFilteredUnits('type');
  const unitsForDorms = getFilteredUnits('dorms');

  // Data for Metrics (Apply ALL filters)
  const filteredUnitsForMetrics = getFilteredUnits('none');

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Cargar proyectos
        const projectsData = await supabaseService.getProjects();
        setProjects(projectsData);

        // Cargar todas las unidades
        const unitsData = await supabaseService.getAllUnits();
        setUnits(unitsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Filtrar unidades cuando cambia el proyecto seleccionado
  useEffect(() => {
    const loadFilteredUnits = async () => {
      try {
        setLoading(true);

        let filteredUnits: Unit[] = [];

        if (selectedProject !== "all" && selectedProject) {
          filteredUnits = await supabaseService.getUnitsByProject(selectedProject);
        } else {
          filteredUnits = await supabaseService.getAllUnits();
        }

        setUnits(filteredUnits);
      } catch (error) {
        console.error("Error loading filtered units:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFilteredUnits();
  }, [selectedProject]);

  // Calcular métricas
  const getMetrics = (data: Unit[]) => {
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
  };

  // Calcular distribución por estado (dinámico)
  const getStatusDistribution = (data: Unit[]) => {
    const counts = {
      'Disponible': 0,
      'Reservado': 0,
      'Vendido': 0,
      'No disponible': 0
    };
    data.forEach(u => {
      if (u.estado && u.estado in counts) {
        counts[u.estado as keyof typeof counts]++;
      }
    });
    return counts;
  };

  // Calcular distribución por tipo (dinámico)
  const getTipoDistribution = (data: Unit[]) => {
    const tipoCount: Record<string, number> = {};
    data.forEach(unit => {
      const tipo = unit.tipo || 'Sin tipo';
      tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });
    return tipoCount;
  };

  // Calcular distribución por dormitorios (dinámico)
  const getDormitoriosDistribution = (data: Unit[]) => {
    const dormCount: Record<string, number> = {};
    data.forEach(unit => {
      const dorms = unit.dormitorios.toString() || '0';
      dormCount[dorms] = (dormCount[dorms] || 0) + 1;
    });
    return dormCount;
  };

  // getComercialDistribution removed

  const metrics = getMetrics(filteredUnitsForMetrics);

  // Calculate dynamic distributions
  const statusDist = getStatusDistribution(unitsForStatus);
  const tipoDistribution = getTipoDistribution(unitsForType);
  const dormitoriosDistribution = getDormitoriosDistribution(unitsForDorms);

  // Formatear números para mostrar
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-AR').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Preparar datos para gráficos
  const statusData = [
    { name: 'Disponibles', value: statusDist['Disponible'], color: '#22c55e' },
    { name: 'Reservadas', value: statusDist['Reservado'], color: '#eab308' },
    { name: 'Vendidas', value: statusDist['Vendido'], color: '#3b82f6' },
    { name: 'No disponibles', value: statusDist['No disponible'], color: '#6b7280' },
  ].filter(item => item.value > 0);

  const tipoData = Object.entries(tipoDistribution).map(([name, value], index) => ({
    name,
    value,
    color: `hsl(${index * 40}, 70%, 50%)`
  }));

  const dormitoriosData = Object.entries(dormitoriosDistribution)
    .filter(([dorms]) => dorms !== '0')
    .sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
    .map(([dorms, value], index) => ({
      name: `${dorms} dorm${dorms === '1' ? '' : 's'}`,
      key: dorms,
      value,
      color: `hsl(${index * 30 + 200}, 70%, 50%)`
    }));

  // comercialData removed

  // Componente de Tooltip personalizado eliminado de aquí

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Dashboard de Ventas</h1>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map(project => (
                <SelectItem key={project} value={project}>{project}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="metricas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="metricas">Métricas Generales</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {/* Status Chart */}
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
                            // Toggle filter: if already selected, clear it; otherwise set it
                            setSelectedStatus(current => current === data.name ? null : data.name);
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

            {/* Type Chart */}
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
                            setSelectedType(current => current === data.name ? null : data.name);
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${(!selectedType || selectedType === 'Departamento')
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
                        <PieChart>
                          <Pie
                            data={dormitoriosData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onClick={(data) => {
                              // data.key contains the raw number string (e.g. "2")
                              // data.payload.key is safest
                              const key = data.payload.key || data.payload.name.split(' ')[0];
                              setSelectedDorms(current => current === key ? null : key);
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
            </div>

          </div>
        </TabsContent>
        {/* ... (rest of the file content for stock tab etc, kept as is or minimized if not changed) ... */}
        {/* Wait, I cannot just remove the Stock Tab content. I must include it. */}

        <TabsContent value="stock">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Inventario por Tipo y Estado</h3>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {Object.entries(tipoDistribution).map(([tipo, _]) => {
                  const tipoUnits = units.filter(u => u.tipo === tipo);

                  // Filter for Stock (Disponible + Reservado)
                  const stockUnits = tipoUnits.filter(u => u.estado === 'Disponible' || u.estado === 'Reservado');

                  const stockCount = stockUnits.length;
                  const totalM2 = stockUnits.reduce((sum, u) => sum + (u.m2Totales || 0), 0);
                  const totalValue = stockUnits.reduce((sum, u) => sum + (u.precioUSD || 0), 0);

                  return (
                    <Card key={tipo} className="overflow-hidden">
                      <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-sm font-medium">{tipo}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
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
                            <span className="text-muted-foreground text-xs">Total</span>
                            <span className="font-bold text-lg">{formatCurrency(totalValue)}</span>
                            <span className="text-xs text-muted-foreground">USD</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
