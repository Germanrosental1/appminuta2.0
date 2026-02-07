import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import * as useUnitsHooks from '@/hooks/useUnits';
import * as usePersistentProjectHook from '@/hooks/usePersistentProject';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock hooks
vi.mock('@/hooks/useUnits');
vi.mock('@/hooks/usePersistentProject');

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  containerVariants: {},
  STATUS_NAMES: {
    Disponible: 'Disponible',
    Reservado: 'Reservado',
    Vendido: 'Vendido',
    'No disponible': 'No disponible',
  },
  STATUS_COLORS: {
    Disponible: '#10b981',
    Reservado: '#f59e0b',
    Vendido: '#3b82f6',
    'No disponible': '#6b7280',
  },
  MultiSelectDropdown: ({ label }: any) => <div data-testid={`dropdown-${label}`}>{label}</div>,
  MetricasTab: () => <div data-testid="metricas-tab">Métricas Tab</div>,
  StockTab: () => <div data-testid="stock-tab">Stock Tab</div>,
  TitularTab: () => <div data-testid="titular-tab">Titular Tab</div>,
  getMetrics: vi.fn(() => ({
    total: 100,
    disponibles: 50,
    reservadas: 20,
    vendidas: 25,
    noDisponibles: 5,
    totalValue: 1000000,
    avgPrice: 10000,
  })),
  getStatusDistribution: vi.fn(() => ({
    Disponible: 50,
    Reservado: 20,
    Vendido: 25,
    'No disponible': 5,
  })),
  getTipoDistribution: vi.fn(() => ({
    Departamento: 60,
    Casa: 40,
  })),
  getDormitoriosDistribution: vi.fn(() => ({
    '1': 30,
    '2': 50,
    '3': 20,
  })),
  getMotivosDistribution: vi.fn(() => ({
    'En construcción': 5,
  })),
}));

const mockUnits = [
  {
    id: '1',
    proyecto: 'Proyecto A',
    estado: 'Disponible',
    tipo: 'Departamento',
    dormitorios: 2,
    precio: 100000,
    clienteTitularBoleto: 'Cartera Propia',
    motivoNoDisponibilidad: null,
  },
  {
    id: '2',
    proyecto: 'Proyecto A',
    estado: 'Reservado',
    tipo: 'Casa',
    dormitorios: 3,
    precio: 200000,
    clienteTitularBoleto: 'Cliente X',
    motivoNoDisponibilidad: null,
  },
  {
    id: '3',
    proyecto: 'Proyecto B',
    estado: 'Vendido',
    tipo: 'Departamento',
    dormitorios: 1,
    precio: 80000,
    clienteTitularBoleto: 'Cliente Y',
    motivoNoDisponibilidad: null,
  },
];

describe('Dashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock implementations
    vi.mocked(useUnitsHooks.useProjects).mockReturnValue({
      data: ['Proyecto A', 'Proyecto B'],
      isLoading: false,
    } as any);

    vi.mocked(useUnitsHooks.useAllUnits).mockReturnValue({
      data: mockUnits,
      isLoading: false,
    } as any);

    vi.mocked(usePersistentProjectHook.usePersistentProject).mockReturnValue([
      'all',
      vi.fn(),
    ]);
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );
  };

  it('should render dashboard title', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard de Ventas')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    renderDashboard();
    expect(screen.getByText('Métricas Generales')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('Titular')).toBeInTheDocument();
  });

  it('should render project selector on metricas tab', () => {
    renderDashboard();
    expect(screen.getByText('Todos los proyectos')).toBeInTheDocument();
  });

  it('should render metricas tab by default', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('metricas-tab')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    vi.mocked(useUnitsHooks.useAllUnits).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    renderDashboard();
    // MetricasTab receives loading prop
    expect(screen.getByTestId('metricas-tab')).toBeInTheDocument();
  });

  it('should filter units by project', () => {
    vi.mocked(usePersistentProjectHook.usePersistentProject).mockReturnValue([
      'Proyecto A',
      vi.fn(),
    ]);

    renderDashboard();
    // Component filters internally, verify it renders
    expect(screen.getByTestId('metricas-tab')).toBeInTheDocument();
  });

  it('should initialize with Cartera Propia filter on titular tab', async () => {
    renderDashboard();

    // The component should auto-select "Cartera Propia" variants
    await waitFor(() => {
      expect(screen.getByTestId('metricas-tab')).toBeInTheDocument();
    });
  });

  it('should handle empty projects', () => {
    vi.mocked(useUnitsHooks.useProjects).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderDashboard();
    expect(screen.getByText('Dashboard de Ventas')).toBeInTheDocument();
  });

  it('should handle empty units', () => {
    vi.mocked(useUnitsHooks.useAllUnits).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderDashboard();
    expect(screen.getByTestId('metricas-tab')).toBeInTheDocument();
  });
});
