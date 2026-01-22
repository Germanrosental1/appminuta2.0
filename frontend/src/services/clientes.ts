import { apiFetch } from '@/lib/api-client';

export interface VerificarCrearClienteDto {
    dni: number;
    nombreApellido: string;
    telefono?: string;
}

export interface ClienteResponse {
    dni: number;
    nombreApellido: string;
    telefono?: string | null;
    CreatedAt: Date;
    created: boolean;
}

export async function verificarOCrearCliente(dto: VerificarCrearClienteDto): Promise<ClienteResponse> {
    return apiFetch<ClienteResponse>('/clientes/verificar-o-crear', {
        method: 'POST',
        body: JSON.stringify(dto),
    });
}

export async function buscarClientePorDni(dni: number): Promise<ClienteResponse> {
    return apiFetch<ClienteResponse>(`/clientes/${dni}`);
}

export async function buscarClientes(query: string): Promise<ClienteResponse[]> {
    return apiFetch<ClienteResponse[]>(`/clientes/buscar?q=${encodeURIComponent(query)}`);
}
