import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { uifApi } from '@/lib/api-client';
import { Client, DEFAULT_FINANCIAL_DATA, DEFAULT_ANALYSIS_SETTINGS, PersonType } from '@/types/database';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Skeleton para la tabla de clientes
const ClientsTableSkeleton = () => (
  <div className="rounded-lg border bg-card overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>CUIT</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Última modificación</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={`skeleton-${i}`}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCuit, setNewClientCuit] = useState('');
  const [newClientType, setNewClientType] = useState<PersonType>('PF');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // ⚡ PERFORMANCE: useQuery con cache automático
  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await uifApi.clients.list()) as Client[],
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ⚡ PERFORMANCE: Realtime handlers extraídos para evitar nesting > 4 niveles
  const handleRealtimeInsert = useCallback((payload: { new: unknown }) => {
    queryClient.setQueryData<Client[]>(['clients'], (old = []) =>
      [payload.new as Client, ...old]
    );
  }, [queryClient]);

  const handleRealtimeUpdate = useCallback((payload: { new: unknown }) => {
    const updated = payload.new as Client;
    queryClient.setQueryData<Client[]>(['clients'], (old = []) =>
      old.map((c) => (c.id === updated.id ? updated : c))
    );
  }, [queryClient]);

  const handleRealtimeDelete = useCallback((payload: { old: unknown }) => {
    const deleted = payload.old as Client;
    queryClient.setQueryData<Client[]>(['clients'], (old = []) =>
      old.filter((c) => c.id !== deleted.id)
    );
  }, [queryClient]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, handleRealtimeInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'clients' }, handleRealtimeDelete)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeInsert, handleRealtimeUpdate, handleRealtimeDelete]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreating(true);

    try {
      const clientData: Partial<Client> = {
        name: newClientName.trim(),
        cuit: newClientCuit.trim() || null,
        person_type: newClientType,
        financial_data: DEFAULT_FINANCIAL_DATA,
        analysis_settings: DEFAULT_ANALYSIS_SETTINGS,
      };

      await uifApi.clients.create(clientData);

      toast({
        title: 'Cliente creado',
        description: `${newClientName} ha sido agregado exitosamente`,
      });
      setCreateDialogOpen(false);
      setNewClientName('');
      setNewClientCuit('');
      setNewClientType('PF');
      // El realtime se encarga de actualizar el cache automáticamente
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: `No se pudo crear el cliente: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Memoized filtered clients for better performance
  const filteredClients = useMemo(() => {
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (client.cuit?.includes(debouncedSearch))
    );
  }, [clients, debouncedSearch]);

  // ⚡ VIRTUALIZATION: Handle large lists efficiently
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredClients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Altura estimada de fila (53px content + padding)
    overscan: 10,
  });

  return (
    <div className="space-y-6 animate-in h-screen flex flex-col pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes y su documentación de compliance
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateClient}>
              <DialogHeader>
                <DialogTitle>Crear Cliente</DialogTitle>
                <DialogDescription>
                  Ingresa los datos básicos del nuevo cliente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre / Razón Social *</Label>
                  <Input
                    id="name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT (opcional)</Label>
                  <Input
                    id="cuit"
                    value={newClientCuit}
                    onChange={(e) => setNewClientCuit(e.target.value)}
                    placeholder="Ej: 20-12345678-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Persona</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="personType"
                        value="PF"
                        checked={newClientType === 'PF'}
                        onChange={() => setNewClientType('PF')}
                        className="form-radio text-primary"
                      />
                      <span>Física</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="personType"
                        value="PJ"
                        checked={newClientType === 'PJ'}
                        onChange={() => setNewClientType('PJ')}
                        className="form-radio text-primary"
                      />
                      <span>Jurídica</span>
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cliente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table (Virtualized) */}
      {loading ? (
        <ClientsTableSkeleton />
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">
            {search ? 'Sin resultados' : 'No hay clientes'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {search
              ? 'Intenta con otro término de búsqueda'
              : 'Crea tu primer cliente para comenzar'}
          </p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="rounded-lg border bg-card overflow-auto flex-1 relative"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-secondary z-10 shadow-sm">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const client = filteredClients[virtualRow.index];
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50 absolute w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                    onClick={() => navigate(`/clientes/${client.id}`)}
                    onMouseEnter={() => {
                      queryClient.prefetchQuery({
                        queryKey: ['client', client.id],
                        queryFn: () => uifApi.clients.get(client.id),
                        staleTime: 30_000,
                      });
                    }}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {client.cuit || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'Activo' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(client.updated_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/clientes/${client.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
