import { useState, useEffect } from "react";
import { Building2, Plus, MoreVertical, Edit2, Trash2, LayoutGrid, Home, Activity, Briefcase, Warehouse, Map as MapIcon, BarChart2 } from "lucide-react";
import { backendAPI } from "@/services/backendAPI";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockSalesMaps } from "@/data/mock-data";

interface UserProject {
  id: string;
  nombre: string;
  created_at: string;
  id_org: bigint | null;
  organizacion: {
    id: bigint;
    nombre: string;
  } | null;
}

interface ProjectsByOrg {
  organizacion: string;
  orgId: string | null;
  proyectos: UserProject[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [salesMaps] = useState(mockSalesMaps);

  // Estado para almacenar proyectos del usuario agrupados por organización
  const [projectsByOrg, setProjectsByOrg] = useState<ProjectsByOrg[]>([]);
  const [loading, setLoading] = useState(true);

  // Agrupar proyectos por organización
  const groupProjectsByOrganization = (projects: UserProject[]): ProjectsByOrg[] => {
    const grouped = new Map<string, ProjectsByOrg>();

    projects.forEach(project => {
      const orgName = project.organizacion?.nombre || 'Sin Organización';
      const orgId = project.organizacion?.id?.toString() || null;
      const key = orgId || 'no-org';

      if (!grouped.has(key)) {
        grouped.set(key, {
          organizacion: orgName,
          orgId: orgId,
          proyectos: []
        });
      }

      grouped.get(key)!.proyectos.push(project);
    });

    return Array.from(grouped.values());
  };

  // Cargar proyectos accesibles por el usuario
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const projects = await backendAPI.getMyProjects();
        const grouped = groupProjectsByOrganization(projects);
        setProjectsByOrg(grouped);
      } catch (error) {
        console.error('Error loading user projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const isActive = (mapId: string) => currentPath.includes(mapId);
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-12" : "w-52"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-sidebar-primary" />
            <span className="text-base font-semibold text-sidebar-primary">Mapas de venta</span>
          </div>
        )}
        {isCollapsed && (
          <Building2 className="h-6 w-6 text-sidebar-primary mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Navegación</span>
              </div>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="flex-1">
                  <NavLink
                    to="/"
                    className="hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    end
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    {!isCollapsed && <span className="text-xs">Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="flex-1">
                  <NavLink
                    to="/units"
                    className="hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {!isCollapsed && <span className="text-xs">Todas las Unidades</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="flex-1">
                  <NavLink
                    to="/diagnostic"
                    className="hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    {!isCollapsed && <span className="text-xs">Diagnóstico</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Projects grouped by organization */}
        {loading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Cargando proyectos...
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : projectsByOrg.length === 0 ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No hay proyectos disponibles
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          projectsByOrg.map((group) => (
            <SidebarGroup key={group.orgId || 'no-org'}>
              <SidebarGroupLabel className="px-3">
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 w-full">
                    <Building2 className="h-3.5 w-3.5 text-sidebar-primary" />
                    <span className="text-sm font-semibold">
                      {group.organizacion}
                    </span>
                  </div>
                )}
                {isCollapsed && (
                  <div className="flex justify-center">
                    <Building2 className="h-4 w-4 text-sidebar-primary" />
                  </div>
                )}
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {group.proyectos.map((proyecto) => (
                    <SidebarMenuItem key={proyecto.id}>
                      <SidebarMenuButton asChild className="flex-1">
                        <NavLink
                          to={`/map/${proyecto.nombre}`}
                          className="hover:bg-sidebar-accent transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <MapIcon className="h-3.5 w-3.5" />
                          {!isCollapsed && (
                            <span className="text-xs">{proyecto.nombre}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
    </Sidebar>
  );
}
