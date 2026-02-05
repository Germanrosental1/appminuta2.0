import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    LogOut,
    Moon,
    Sun
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme-provider';

export const Sidebar = () => {
    const { signOut, user } = useAuth();
    const { setTheme, theme } = useTheme();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/comercial/dashboard', roles: ['comercial'] },
        // Add more items here based on role or fixed for now
        // { icon: Building2, label: 'Proyectos', href: '/proyectos', roles: ['administrador'] },
        // { icon: Users, label: 'Usuarios', href: '/usuarios', roles: ['administrador'] },
    ];

    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-border bg-card text-card-foreground lg:flex">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-border px-6">
                <div className="flex items-center gap-2 font-display text-xl font-bold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <span className="material-symbols-outlined text-lg">apartment</span>
                    </span>
                    <span>AppMinuta</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-md shadow-blue-900/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User & Footer */}
            <div className="border-t border-border p-4">
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {user?.Nombre ? user.Nombre[0] : 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="truncate text-sm font-medium text-foreground">{user?.Nombre} {user?.Apellido}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="mb-2 w-full justify-start gap-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <div className="relative h-5 w-5">
                        <Sun className="absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </div>
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </Button>

                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => signOut()}
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    );
};
