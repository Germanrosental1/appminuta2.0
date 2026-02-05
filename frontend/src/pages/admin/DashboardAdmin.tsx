import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery } from '@tanstack/react-query';
import { getAllMinutasDefinitivasForAdmin } from '@/services/minutas';
import { StatCard } from '@/components/dashboard/StatCard';
import { ListaMinutasDefinitivasAdmin } from '@/components/minutas/ListaMinutasDefinitivasAdmin';
import { useRequirePasswordChange } from '@/middleware/RequirePasswordChange';
import '@/components/dashboard/dashboard.css';

interface DashboardAdminProps {
  readOnly?: boolean;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({ readOnly = false }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Verificar si requiere cambio de contraseña
  useRequirePasswordChange();

  // 📡 WebSocket para actualizaciones en tiempo real
  useWebSocket();

  // Cargar minutas para estadísticas
  const { data: allMinutas = [] } = useQuery({
    queryKey: ['minutasDefinitivas', 'admin'],
    queryFn: getAllMinutasDefinitivasForAdmin,
  });

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalARevisar = allMinutas.filter((m: any) =>
      m.Estado === 'pendiente' || m.Estado === 'en_edicion'
    ).length;

    const urgentes = allMinutas.filter((m: any) => {
      if (m.Estado !== 'pendiente') return false;
      const fechaCreacion = new Date(m.FechaCreacion);
      const haceDosDias = new Date();
      haceDosDias.setDate(haceDosDias.getDate() - 2);
      return fechaCreacion < haceDosDias;
    }).length;

    const revisadasHoy = allMinutas.filter((m: any) => {
      if (m.Estado !== 'aprobada' && m.Estado !== 'firmada') return false;
      const fechaActualizacion = m.FechaActualizacion ? new Date(m.FechaActualizacion) : null;
      if (!fechaActualizacion) return false;
      const hoy = new Date();
      return fechaActualizacion.toDateString() === hoy.toDateString();
    }).length;

    return { totalARevisar, urgentes, revisadasHoy };
  }, [allMinutas]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const userName = user?.Nombre && user?.Apellido ? `${user.Nombre} ${user.Apellido}` : user?.email || 'Administrador';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            {/* Logo/Header */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="bg-primary/10 rounded-full size-10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">apartment</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-normal">Portal Admin</h1>
                <p className="text-muted-foreground text-xs font-normal leading-normal">Sistema de Minutas</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white"
                onClick={() => navigate('/admin/dashboard')}
              >
                <span className="material-symbols-outlined text-[24px]">dashboard</span>
                <span className="text-sm font-medium leading-normal">Dashboard</span>
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-white transition-colors"
                onClick={() => navigate('/wizard')}
              >
                <span className="material-symbols-outlined text-[24px]">description</span>
                <span className="text-sm font-medium leading-normal">Wizard de Minutas</span>
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">settings</span>
                <span className="text-sm font-medium leading-normal">Configuración</span>
              </button>
            </nav>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 rounded-lg text-[#fa6538] hover:bg-[#fa6538]/10 transition-colors mt-auto"
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
            <span className="text-sm font-bold leading-normal">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full size-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">apartment</span>
            </div>
            <h1 className="text-white text-lg font-bold">Admin</h1>
          </div>
          <button className="text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight font-display">
                  Panel de Revisión
                </h1>
                <p className="text-muted-foreground text-base font-medium">
                  Bienvenido de nuevo, {userName}. Aquí puedes gestionar las minutas del equipo comercial.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="TOTAL A REVISAR"
                value={stats.totalARevisar}
                subtitle="Minutas en cola de espera"
                icon="folder"
                iconColor="text-muted-foreground"
                borderColor="#334366"
              />
              <StatCard
                title="URGENTES"
                value={stats.urgentes}
                subtitle="Requieren atención inmediata"
                icon="priority_high"
                iconColor="text-red-500"
                borderColor="#ef4444"
              />
              <StatCard
                title="REVISADAS HOY"
                value={stats.revisadasHoy}
                trend={{
                  value: '+5 más que ayer',
                  positive: true
                }}
                icon="check_circle"
                iconColor="text-green-500"
                borderColor="#22c55e"
              />
            </div>

            {/* Tabla de Minutas */}
            <ListaMinutasDefinitivasAdmin readOnly={readOnly} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;

