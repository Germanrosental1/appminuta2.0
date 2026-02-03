import { apiGet, apiPost } from '@/lib/api-wrapper-client';

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
    return apiPost<ClienteResponse>('/clientes/verificar-o-crear', dto);
}

export async function buscarClientePorDni(dni: number): Promise<ClienteResponse> {
    return apiGet<ClienteResponse>(`/clientes/${dni}`);
}

export async function buscarClientes(query: string): Promise<ClienteResponse[]> {
    return apiGet<ClienteResponse[]>(`/clientes/buscar?q=${encodeURIComponent(query)}`);
}
