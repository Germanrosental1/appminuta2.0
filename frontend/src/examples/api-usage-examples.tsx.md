/**
 * EJEMPLOS DE USO DEL API WRAPPER EN FRONTEND
 *
 * Estos ejemplos muestran cómo usar el nuevo sistema de ApiResponse<T>
 * en componentes React con TypeScript.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiFetchWrapped,
} from '../lib/api-wrapper-client';
import {
  ApiResponse,
  PaginatedData,
  isSuccessResponse,
} from '../types/api-response.types';

/**
 * TIPOS DE DATOS (deben coincidir con los DTOs del backend)
 */
interface Minuta {
  Id: string;
  Numero: string;
  Estado: 'Provisoria' | 'Definitiva' | 'Rechazada' | 'Anulada';
  Tipo: 'Venta' | 'Reserva' | 'Promesa';
  ProyectoNombre: string;
  ClienteNombre: string;
  PrecioTotal: number;
  CreatedAt: string;
  UpdatedAt: string;
}

interface CreateMinutaDto {
  tipo: string;
  proyectoId: string;
  unidadId: string;
  clienteRut: string;
  clienteNombre: string;
  precioTotal: number;
}

interface Unidad {
  Id: string;
  Identificador: string;
  Proyecto: string;
  Tipo: string | null;
  Estado: string;
  PrecioTotal: number | null;
  SuperficieTotal: number | null;
  Dormitorios: number | null;
  Banos: number | null;
}

/**
 * ============================================================================
 * EJEMPLO 1: Fetch simple con unwrapping automático
 * ============================================================================
 */
export function MinutaDetailExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const [minuta, setMinuta] = useState<Minuta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMinuta() {
      try {
        // apiGet retorna directamente Minuta (unwrapped)
        const data = await apiGet<Minuta>(`/minutas/${minutaId}`);
        setMinuta(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMinuta();
  }, [minutaId]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!minuta) return null;

  return (
    <div>
      <h1>Minuta {minuta.Numero}</h1>
      <p>Estado: {minuta.Estado}</p>
      <p>Cliente: {minuta.ClienteNombre}</p>
      <p>Precio: ${minuta.PrecioTotal.toLocaleString()}</p>
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 2: React Query con unwrapping automático
 * ============================================================================
 */
export function MinutasListExample() {
  // React Query con unwrapping automático
  const { data: minutas, isLoading, error } = useQuery({
    queryKey: ['minutas'],
    queryFn: () => apiGet<Minuta[]>('/minutas'),
  });

  if (isLoading) return <div>Cargando minutas...</div>;
  if (error) return <div>Error: {(error).message}</div>;

  return (
    <div>
      <h2>Listado de Minutas</h2>
      <ul>
        {minutas?.map((minuta) => (
          <li key={minuta.Id}>
            {minuta.Numero} - {minuta.ClienteNombre} - ${minuta.PrecioTotal.toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 3: Obtener respuesta completa (raw) con metadatos
 * ============================================================================
 */
export function MinutaWithMetadataExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const [response, setResponse] = useState<ApiResponse<Minuta> | null>(null);

  useEffect(() => {
    async function fetchWithMetadata() {
      // raw: true para obtener ApiResponse<T> completo
      const data = await apiFetchWrapped<Minuta>(`/minutas/${minutaId}`, {
        raw: true,
      }) as ApiResponse<Minuta>;

      setResponse(data);
    }

    fetchWithMetadata();
  }, [minutaId]);

  if (!response) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Minuta con Metadatos</h2>
      <div>
        <strong>Data:</strong>
        <p>Número: {response.data.Numero}</p>
        <p>Cliente: {response.data.ClienteNombre}</p>
      </div>
      <div>
        <strong>Metadatos:</strong>
        <p>Timestamp: {new Date(response.metadata.timestamp).toLocaleString()}</p>
        <p>Duración: {response.metadata.duration}ms</p>
        <p>Path: {response.metadata.path}</p>
        <p>Versión API: {response.metadata.version}</p>
      </div>
      {response.message && <p>Mensaje: {response.message}</p>}
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 4: Manejo de errores sin throw (noThrow)
 * ============================================================================
 */
export function MinutaSafeLoadExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const [result, setResult] = useState<Minuta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSafely() {
      // noThrow: true para manejar errores manualmente
      const response = await apiFetchWrapped<Minuta>(`/minutas/${minutaId}`, {
        noThrow: true,
        raw: true
      });

      if (isSuccessResponse(response)) {
        setResult(response.data);
      } else {
        // response es ApiErrorResponse
        setErrorMessage(response.message);
        console.error('Error code:', response.errorCode);
        console.error('Status:', response.statusCode);
      }
    }

    fetchSafely();
  }, [minutaId]);

  return (
    <div>
      {errorMessage ? (
        <div className="error">Error: {errorMessage}</div>
      ) : result ? (
        <div>Minuta: {result.Numero}</div>
      ) : (
        <div>Cargando...</div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 5: Mutation con React Query (Crear minuta)
 * ============================================================================
 */
export function CreateMinutaExample() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateMinutaDto) =>
      apiPost<Minuta>('/minutas', data),
    onSuccess: (newMinuta) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['minutas'] });
      alert(`Minuta ${newMinuta.Numero} creada exitosamente`);
    },
    onError: (error: Error) => {
      alert(`Error al crear minuta: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      tipo: formData.get('tipo') as string,
      proyectoId: formData.get('proyectoId') as string,
      unidadId: formData.get('unidadId') as string,
      clienteRut: formData.get('clienteRut') as string,
      clienteNombre: formData.get('clienteNombre') as string,
      precioTotal: Number(formData.get('precioTotal')),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear Nueva Minuta</h2>
      <input name="tipo" placeholder="Tipo" required />
      <input name="proyectoId" placeholder="Proyecto ID" required />
      <input name="unidadId" placeholder="Unidad ID" required />
      <input name="clienteRut" placeholder="RUT Cliente" required />
      <input name="clienteNombre" placeholder="Nombre Cliente" required />
      <input name="precioTotal" type="number" placeholder="Precio" required />
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creando...' : 'Crear Minuta'}
      </button>
    </form>
  );
}

/**
 * ============================================================================
 * EJEMPLO 6: Update con PATCH
 * ============================================================================
 */
export function UpdateMinutaExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Minuta>) =>
      apiPatch<Minuta>(`/minutas/${minutaId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutas', minutaId] });
      alert('Minuta actualizada');
    },
  });

  const handleApprove = () => {
    updateMutation.mutate({ Estado: 'Definitiva' });
  };

  const handleReject = () => {
    updateMutation.mutate({ Estado: 'Rechazada' });
  };

  return (
    <div>
      <h3>Acciones</h3>
      <button onClick={handleApprove} disabled={updateMutation.isPending}>
        Aprobar
      </button>
      <button onClick={handleReject} disabled={updateMutation.isPending}>
        Rechazar
      </button>
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 7: Delete
 * ============================================================================
 */
export function DeleteMinutaExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiDelete<{ id: string; deleted: boolean }>(`/minutas/${minutaId}`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['minutas'] });
      alert(`Minuta ${result.id} eliminada`); // delete devuelve objeto simple, probablemente {id:..}
    },
  });

  return (
    <button
      onClick={() => {
        if (confirm('¿Eliminar minuta?')) {
          deleteMutation.mutate();
        }
      }}
      disabled={deleteMutation.isPending}
    >
      Eliminar
    </button>
  );
}

/**
 * ============================================================================
 * EJEMPLO 8: Respuesta paginada
 * ============================================================================
 */
export function PaginatedUnidadesExample() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['unidades', 'paginated', page],
    queryFn: () =>
      apiGet<PaginatedData<Unidad>>(`/unidades/paginated?page=${page}&limit=20`),
  });

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Unidades Paginadas</h2>
      <ul>
        {data?.items.map((unidad) => (
          <li key={unidad.Id}>
            {unidad.Identificador} - {unidad.Proyecto}
          </li>
        ))}
      </ul>
      <div>
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={!data?.pagination.hasPrev}
        >
          Anterior
        </button>
        <span>
          Página {data?.pagination.page} de {data?.pagination.totalPages}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!data?.pagination.hasNext}
        >
          Siguiente
        </button>
      </div>
      <p>Total: {data?.pagination.total} unidades</p>
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 9: Batch fetch (múltiples IDs)
 * ============================================================================
 */
export function BatchUnidadesExample({ unidadIds }: Readonly<{ unidadIds: string[] }>) {
  const { data: unidades } = useQuery({
    queryKey: ['unidades', 'batch', unidadIds],
    queryFn: () =>
      apiGet<Unidad[]>(`/unidades/batch?ids=${unidadIds.join(',')}`),
    enabled: unidadIds.length > 0,
  });

  return (
    <div>
      <h3>Unidades Seleccionadas</h3>
      {unidades?.map((unidad) => (
        <div key={unidad.Id}>{unidad.Identificador}</div>
      ))}
    </div>
  );
}

/**
 * ============================================================================
 * EJEMPLO 10: Hook personalizado reutilizable
 * ============================================================================
 */
export function useMinuta(minutaId: string) {
  return useQuery({
    queryKey: ['minutas', minutaId],
    queryFn: () => apiGet<Minuta>(`/minutas/${minutaId}`),
    enabled: !!minutaId,
  });
}

export function useCreateMinuta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMinutaDto) =>
      apiPost<Minuta>('/minutas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutas'] });
    },
  });
}

// Uso de los hooks personalizados
export function MinutaWithHooksExample({ minutaId }: Readonly<{ minutaId: string }>) {
  const { data: minuta, isLoading, error } = useMinuta(minutaId);
  const createMinuta = useCreateMinuta();

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {(error).message}</div>;
  if (!minuta) return null;

  return (
    <div>
      <h2>{minuta.Numero}</h2>
      <p>{minuta.ClienteNombre}</p>
    </div>
  );
}
