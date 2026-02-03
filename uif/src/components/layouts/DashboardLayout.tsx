import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  FileText,
  BarChart3,
  LogOut,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Users, label: 'Clientes', exact: true },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true; // Default to dark
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Get breadcrumb info
  const getBreadcrumbLabel = () => {
    if (location.pathname.includes('/clientes/')) {
      return 'Detalle Cliente';
    }
    return navItems.find(item => item.to === location.pathname)?.label || 'Página';
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar - Fixed and Collapsible */}
      <aside
        className={cn(
          "h-screen bg-sidebar text-sidebar-foreground flex flex-col shadow-lg transition-all duration-300 flex-shrink-0",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className={cn("flex items-center gap-3", isSidebarCollapsed && "justify-center w-full")}>
            <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div>
                <h1 className="font-semibold text-sidebar-foreground">Compliance UIF</h1>
                <p className="text-xs text-sidebar-foreground/60">Gestión Financiera</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  'sidebar-nav-item',
                  isActive && 'active',
                  isSidebarCollapsed && 'justify-center px-0'
                )
              }
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isSidebarCollapsed ? "justify-center px-0" : "justify-start"
            )}
            title={isSidebarCollapsed ? "Expandir panel" : "Colapsar panel"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 mr-2" />
                Ocultar panel
              </>
            )}
          </Button>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 mb-2",
            isSidebarCollapsed && "justify-center px-0"
          )}>
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              isSidebarCollapsed ? "justify-center px-0" : "justify-start"
            )}
            title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!isSidebarCollapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Breadcrumb - Fixed/Sticky */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            {location.pathname !== '/' && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{getBreadcrumbLabel()}</span>
              </>
            )}
          </nav>

          {/* Theme Toggle */}
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-muted-foreground" />
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
              aria-label="Cambiar tema"
            />
            <Moon className="w-4 h-4 text-muted-foreground" />
          </div>
        </header>

        {/* Page content - Scrollable area */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

