import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseService } from "@/services/supabaseService";
import { Unit, EstadoUnidad } from "@/types/supabase-types";
import { Building2, Home, DollarSign, Layers, BarChart3, ShoppingBag, Users, Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");

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
  const getMetrics = () => {
    if (!units.length) return {
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
    
    const disponibles = units.filter(u => u.estado === 'Disponible').length;
    const reservadas = units.filter(u => u.estado === 'Reservado').length;
    const vendidas = units.filter(u => u.estado === 'Vendido').length;
    const noDisponibles = units.filter(u => u.estado === 'No disponible').length;
    
    const valorTotal = units.reduce((sum, unit) => sum + (unit.precioUSD || 0), 0);
    const valorPromedio = valorTotal / units.length;
    
    const unidadesConPrecio = units.filter(u => u.precioUSD > 0 && u.m2Totales > 0);
    const precioPromedioM2 = unidadesConPrecio.length 
      ? unidadesConPrecio.reduce((sum, unit) => sum + unit.usdM2, 0) / unidadesConPrecio.length 
      : 0;
    
    const totalM2 = units.reduce((sum, unit) => sum + (unit.m2Totales || 0), 0);
    
    return {
      totalUnits: units.length,
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

  // Calcular distribución por tipo
  const getTipoDistribution = () => {
    const tipoCount: Record<string, number> = {};
    
    units.forEach(unit => {
      const tipo = unit.tipo || 'Sin tipo';
      tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });
    
    return tipoCount;
  };

  // Calcular distribución por dormitorios
  const getDormitoriosDistribution = () => {
    const dormCount: Record<string, number> = {};
    
    units.forEach(unit => {
      const dorms = unit.dormitorios.toString() || '0';
      dormCount[dorms] = (dormCount[dorms] || 0) + 1;
    });
    
    return dormCount;
  };

  // Calcular distribución por comercial
  const getComercialDistribution = () => {
    const comercialCount: Record<string, number> = {};
    
    units.forEach(unit => {
      const comercial = unit.comercial || 'Sin asignar';
      comercialCount[comercial] = (comercialCount[comercial] || 0) + 1;
    });
    
    return comercialCount;
  };

  const metrics = getMetrics();
  const tipoDistribution = getTipoDistribution();
  const dormitoriosDistribution = getDormitoriosDistribution();
  const comercialDistribution = getComercialDistribution();

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
                  Valor Total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <div className="text-2xl font-bold">{formatCurrency(metrics.valorTotal)}</div>
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
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span>Disponibles</span>
                      </div>
                      <span className="font-medium">{metrics.disponibles} ({Math.round(metrics.disponibles / metrics.totalUnits * 100) || 0}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span>Reservadas</span>
                      </div>
                      <span className="font-medium">{metrics.reservadas} ({Math.round(metrics.reservadas / metrics.totalUnits * 100) || 0}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span>Vendidas</span>
                      </div>
                      <span className="font-medium">{metrics.vendidas} ({Math.round(metrics.vendidas / metrics.totalUnits * 100) || 0}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-gray-500" />
                        <span>No disponibles</span>
                      </div>
                      <span className="font-medium">{metrics.noDisponibles} ({Math.round(metrics.noDisponibles / metrics.totalUnits * 100) || 0}%)</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tipoDistribution).map(([tipo, count], index) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-primary-${(index % 5) * 100 + 300}`} 
                               style={{backgroundColor: `hsl(${index * 40}, 70%, 50%)`}} />
                          <span>{tipo}</span>
                        </div>
                        <span className="font-medium">{count} ({Math.round(count / metrics.totalUnits * 100) || 0}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Dormitorios</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(dormitoriosDistribution)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([dorms, count], index) => (
                      <div key={dorms} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" 
                               style={{backgroundColor: `hsl(${index * 30 + 200}, 70%, 50%)`}} />
                          <span>{dorms} dormitorio{parseInt(dorms) !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="font-medium">{count} ({Math.round(count / metrics.totalUnits * 100) || 0}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Comercial</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(comercialDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([comercial, count], index) => (
                      <div key={comercial} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" 
                               style={{backgroundColor: `hsl(${index * 60 + 100}, 70%, 50%)`}} />
                          <span>{comercial}</span>
                        </div>
                        <span className="font-medium">{count} ({Math.round(count / metrics.totalUnits * 100) || 0}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
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
            
            <Card className="bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vendidas
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {metrics.vendidas}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(metrics.vendidas / metrics.totalUnits * 100) || 0}% del total
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 dark:bg-gray-800/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  No disponibles
                </CardTitle>
                <Warehouse className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {metrics.noDisponibles}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(metrics.noDisponibles / metrics.totalUnits * 100) || 0}% del total
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
                  const disponibles = tipoUnits.filter(u => u.estado === 'Disponible').length;
                  const reservadas = tipoUnits.filter(u => u.estado === 'Reservado').length;
                  const vendidas = tipoUnits.filter(u => u.estado === 'Vendido').length;
                  const noDisponibles = tipoUnits.filter(u => u.estado === 'No disponible').length;
                  
                  return (
                    <Card key={tipo} className="overflow-hidden">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">{tipo}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="flex h-2">
                          {disponibles > 0 && (
                            <div 
                              className="bg-green-500 h-full" 
                              style={{width: `${disponibles / tipoUnits.length * 100}%`}}
                              title={`Disponibles: ${disponibles}`}
                            />
                          )}
                          {reservadas > 0 && (
                            <div 
                              className="bg-yellow-500 h-full" 
                              style={{width: `${reservadas / tipoUnits.length * 100}%`}}
                              title={`Reservadas: ${reservadas}`}
                            />
                          )}
                          {vendidas > 0 && (
                            <div 
                              className="bg-blue-500 h-full" 
                              style={{width: `${vendidas / tipoUnits.length * 100}%`}}
                              title={`Vendidas: ${vendidas}`}
                            />
                          )}
                          {noDisponibles > 0 && (
                            <div 
                              className="bg-gray-500 h-full" 
                              style={{width: `${noDisponibles / tipoUnits.length * 100}%`}}
                              title={`No disponibles: ${noDisponibles}`}
                            />
                          )}
                        </div>
                        <div className="px-6 py-3 grid grid-cols-4 text-sm">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>{disponibles}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span>{reservadas}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>{vendidas}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-gray-500" />
                            <span>{noDisponibles}</span>
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
