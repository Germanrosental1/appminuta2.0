import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  Moon
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

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-semibold text-sidebar-foreground">Compliance UIF</h1>
              <p className="text-xs text-sidebar-foreground/60">Gestión Financiera</p>
            </div>
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
                  isActive && 'active'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Breadcrumb */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Dashboard</span>
            {location.pathname !== '/' && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {location.pathname.includes('/clientes/')
                    ? 'Detalle Cliente'
                    : navItems.find(item => item.to === location.pathname)?.label || 'Página'
                  }
                </span>
              </>
            )}
          </div>

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

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

