import { Controller, Post, Get, Param, Query, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { VerificarCrearClienteDto } from './dto/verificar-crear-cliente.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación
 * Todos los endpoints requieren token JWT válido
 */
@Controller('clientes')
@UseGuards(SupabaseAuthGuard)
export class ClientesController {
    constructor(private readonly clientesService: ClientesService) { }

    @Post('verificar-o-crear')
    async verificarOCrearCliente(@Body() dto: VerificarCrearClienteDto) {
        const result = await this.clientesService.verificarOCrearCliente(dto);
        // Serialize BigInt to number for JSON response
        return {
            ...result,
            dni: result.Dni ? Number(result.Dni) : null
        };
    }

    @Get('buscar')
    async buscarClientes(@Query('q') query: string) {
        const clientes = await this.clientesService.buscarClientes(query || '');
        // Serialize BigInt to number for JSON response
        return clientes.map(c => ({
            ...c,
            dni: c.Dni ? Number(c.Dni) : null
        }));
    }

    @Get(':dni')
    async buscarPorDni(@Param('dni', ParseIntPipe) dni: number) {
        const cliente = await this.clientesService.buscarPorDni(dni);
        // Serialize BigInt to number for JSON response
        return {
            ...cliente,
            dni: cliente.Dni ? Number(cliente.Dni) : null
        };
    }
}
