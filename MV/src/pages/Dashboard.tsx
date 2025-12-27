import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseService } from "@/services/supabaseService";
import { Unit } from "@/types/supabase-types";
import { motion } from "framer-motion";
import { usePersistentProject } from "@/hooks/usePersistentProject";

// Import refactored components
import {
  containerVariants,
  STATUS_NAMES,
  STATUS_COLORS,
  MultiSelectDropdown,
  MetricasTab,
  StockTab,
  TitularTab,
  getMetrics,
  getStatusDistribution,
  getTipoDistribution,
  getDormitoriosDistribution,
  getMotivosDistribution,
} from "@/components/dashboard";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const navigate = useNavigate();

  // Use persistent hook instead of simple state
  const [selectedProject, setSelectedProject] = usePersistentProject("all");

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDorms, setSelectedDorms] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [showTotalValue, setShowTotalValue] = useState(false);

  // State for active tab and titular filter
  const [activeTab, setActiveTab] = useState("metricas");
  const [selectedTitulares, setSelectedTitulares] = useState<string[]>([]);
  const [selectedEstadosFilter, setSelectedEstadosFilter] = useState<string[]>([]);
  const [selectedTiposFilter, setSelectedTiposFilter] = useState<string[]>([]);
  const [selectedProyectosFilter, setSelectedProyectosFilter] = useState<string[]>([]);

  // Open states for dropdowns (to prevent closing on click inside)
  const [openProyectos, setOpenProyectos] = useState(false);
  const [openTipos, setOpenTipos] = useState(false);
  const [openEstados, setOpenEstados] = useState(false);
  const [openTitulares, setOpenTitulares] = useState(false);

  // State to force re-animation on mount/return
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, []);

  // Helper to get units filtered by everything EXCEPT the specified dimension
  const getFilteredUnits = (exclude: 'status' | 'type' | 'dorms' | 'motivo' | 'none') => {
    return units.filter(u => {
      if (exclude !== 'status' && selectedStatus) {
        const dbStatus = STATUS_NAMES[selectedStatus] || selectedStatus;
        if (u.estado !== dbStatus) return false;
      }
      if (exclude !== 'type' && selectedType) {
        const tipo = u.tipo || 'Sin tipo';
        if (tipo !== selectedType) return false;
      }
      if (exclude !== 'dorms' && selectedDorms) {
        const dorms = u.dormitorios.toString() || '0';
        if (dorms !== selectedDorms) return false;
      }
      if (exclude !== 'motivo' && selectedMotivo) {
        const motivo = u.motivoNoDisponibilidad || '';
        if (motivo !== selectedMotivo) return false;
      }
      return true;
    });
  };

  // Data for Charts
  const unitsForStatus = getFilteredUnits('status');
  const unitsForType = getFilteredUnits('type');
  const unitsForDorms = getFilteredUnits('dorms');
  const unitsForMotivo = getFilteredUnits('motivo');
  const filteredUnitsForMetrics = getFilteredUnits('none');

  // Load projects
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const projectsData = await supabaseService.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };
    loadInitialData();
  }, []);

  // Load units when project changes
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

  // Calculate metrics and distributions
  const metrics = getMetrics(filteredUnitsForMetrics);
  const statusDist = getStatusDistribution(unitsForStatus);
  const tipoDistribution = getTipoDistribution(unitsForType);
  const dormitoriosDistribution = getDormitoriosDistribution(unitsForDorms);
  const motivosDistribution = getMotivosDistribution(unitsForMotivo.filter(u => u.motivoNoDisponibilidad && u.motivoNoDisponibilidad.trim() !== ''));

  // Prepare data for charts
  const statusData = [
    { name: 'Disponibles', value: statusDist['Disponible'], color: STATUS_COLORS['Disponible'] },
    { name: 'Reservadas', value: statusDist['Reservado'], color: STATUS_COLORS['Reservado'] },
    { name: 'Vendidas', value: statusDist['Vendido'], color: STATUS_COLORS['Vendido'] },
    { name: 'No disponibles', value: statusDist['No disponible'], color: STATUS_COLORS['No disponible'] },
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

  const motivosData = Object.entries(motivosDistribution)
    .filter(([motivo]) => motivo !== 'Sin motivo')
    .map(([name, value], index) => ({
      name,
      key: name,
      value,
      color: `hsl(${index * 50 + 30}, 60%, 45%)`
    }));

  // Get unique values for filters
  const allTitulares = [...new Set(units
    .filter(u => u.clienteTitularBoleto && u.clienteTitularBoleto.trim() !== '')
    .map(u => u.clienteTitularBoleto)
  )].sort() as string[];

  const allEstados = [...new Set(units
    .filter(u => u.estado)
    .map(u => u.estado)
  )].sort() as string[];

  const allTipos = [...new Set(units
    .filter(u => u.tipo && u.tipo.trim() !== '')
    .map(u => u.tipo)
  )].sort() as string[];

  const allProyectos = [...new Set(units
    .filter(u => u.proyecto && u.proyecto.trim() !== '')
    .map(u => u.proyecto)
  )].sort() as string[];

  return (
    <motion.div
      className="p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Dashboard de Ventas</h1>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Project selector - Hidden on Titular tab */}
          {activeTab !== "titular" && (
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
          )}

          {/* Filters - Only visible on Titular tab */}
          {activeTab === "titular" && (
            <>
              <MultiSelectDropdown
                label="Proyectos"
                items={allProyectos}
                selected={selectedProyectosFilter}
                setSelected={setSelectedProyectosFilter}
                open={openProyectos}
                setOpen={setOpenProyectos}
              />
              <MultiSelectDropdown
                label="Tipos"
                items={allTipos}
                selected={selectedTiposFilter}
                setSelected={setSelectedTiposFilter}
                open={openTipos}
                setOpen={setOpenTipos}
              />
              <MultiSelectDropdown
                label="Estados"
                items={allEstados}
                selected={selectedEstadosFilter}
                setSelected={setSelectedEstadosFilter}
                open={openEstados}
                setOpen={setOpenEstados}
              />
              <MultiSelectDropdown
                label="Titulares"
                items={allTitulares}
                selected={selectedTitulares}
                setSelected={setSelectedTitulares}
                open={openTitulares}
                setOpen={setOpenTitulares}
              />
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="metricas" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="metricas">Métricas Generales</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="titular">Titular</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas">
          <MetricasTab
            loading={loading}
            metrics={metrics}
            statusData={statusData}
            tipoData={tipoData}
            dormitoriosData={dormitoriosData}
            motivosData={motivosData}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedDorms={selectedDorms}
            setSelectedDorms={setSelectedDorms}
            selectedMotivo={selectedMotivo}
            setSelectedMotivo={setSelectedMotivo}
            showTotalValue={showTotalValue}
            setShowTotalValue={setShowTotalValue}
            animationKey={animationKey}
          />
        </TabsContent>

        <TabsContent value="stock">
          <StockTab
            loading={loading}
            metrics={metrics}
            units={units}
            tipoDistribution={tipoDistribution}
          />
        </TabsContent>

        <TabsContent value="titular">
          <TitularTab
            loading={loading}
            units={units}
            selectedProyectosFilter={selectedProyectosFilter}
            selectedTiposFilter={selectedTiposFilter}
            selectedEstadosFilter={selectedEstadosFilter}
            selectedTitulares={selectedTitulares}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
