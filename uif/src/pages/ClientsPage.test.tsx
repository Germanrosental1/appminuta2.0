import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ClientsPage from './ClientsPage';
import { uifApi } from '@/lib/api-client';
import * as useToastModule from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  uifApi: {
    clients: {
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

const mockClients = [
  {
    id: 'client-1',
    name: 'Juan Pérez',
    cuit: '20-12345678-9',
    person_type: 'PF',
    status: 'active',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-15T15:30:00Z',
  },
  {
    id: 'client-2',
    name: 'Empresa SA',
    cuit: '30-98765432-1',
    person_type: 'PJ',
    status: 'under_review',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-20T12:00:00Z',
  },
];

describe('ClientsPage', () => {
  let queryClient: QueryClient;
  const mockToast = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useToastModule.useToast).mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });

    vi.mocked(uifApi.clients.list).mockResolvedValue(mockClients as any);
  });

  const renderClientsPage = () => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ClientsPage />
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  it('should render page title', () => {
    renderClientsPage();
    expect(screen.getByText('Clientes UIF')).toBeInTheDocument();
  });

  it('should show loading skeleton initially', () => {
    renderClientsPage();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('should display clients after loading', async () => {
    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Empresa SA')).toBeInTheDocument();
    });
  });

  it('should display client CUIT', async () => {
    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText('20-12345678-9')).toBeInTheDocument();
      expect(screen.getByText('30-98765432-1')).toBeInTheDocument();
    });
  });

  it('should show status badges', async () => {
    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('En revisión')).toBeInTheDocument();
    });
  });

  it('should filter clients by search', async () => {
    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    // Wait for debounce
    await waitFor(
      () => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.queryByText('Empresa SA')).not.toBeInTheDocument();
      },
      { timeout: 400 }
    );
  });

  it('should show create client button', () => {
    renderClientsPage();
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
  });

  it('should open create dialog', async () => {
    renderClientsPage();

    const createButton = screen.getByText('Nuevo Cliente');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Crear nuevo cliente')).toBeInTheDocument();
    });
  });

  it('should create new client', async () => {
    const newClient = {
      id: 'client-3',
      name: 'Nuevo Cliente',
      cuit: '20-11111111-1',
      person_type: 'PF',
      status: 'active',
    };

    vi.mocked(uifApi.clients.create).mockResolvedValue(newClient as any);

    renderClientsPage();

    // Open dialog
    const createButton = screen.getByText('Nuevo Cliente');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/nombre/i);
    const cuitInput = screen.getByLabelText(/cuit/i);

    fireEvent.change(nameInput, { target: { value: 'Nuevo Cliente' } });
    fireEvent.change(cuitInput, { target: { value: '20-11111111-1' } });

    // Submit
    const submitButton = screen.getByText('Crear');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(uifApi.clients.create).toHaveBeenCalled();
    });
  });

  it('should show empty state', async () => {
    vi.mocked(uifApi.clients.list).mockResolvedValue([]);

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/no hay clientes registrados/i)).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    vi.mocked(uifApi.clients.list).mockRejectedValue(new Error('API Error'));

    renderClientsPage();

    await waitFor(() => {
      // Component should handle error gracefully
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });
  });

  it('should render links to client details', async () => {
    renderClientsPage();

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it('should show client count', async () => {
    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/2 clientes/i)).toBeInTheDocument();
    });
  });
});
