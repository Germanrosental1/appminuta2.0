import { Controller, Post, Get, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { VerificarCrearClienteDto } from './dto/verificar-crear-cliente.dto';

@Controller('clientes')
export class ClientesController {
    constructor(private readonly clientesService: ClientesService) { }

    @Post('verificar-o-crear')
    async verificarOCrearCliente(@Body() dto: VerificarCrearClienteDto) {
        const result = await this.clientesService.verificarOCrearCliente(dto);
        // Serialize BigInt to number for JSON response
        return {
            ...result,
            dni: result.dni ? Number(result.dni) : null
        };
    }

    @Get('buscar')
    async buscarClientes(@Query('q') query: string) {
        const clientes = await this.clientesService.buscarClientes(query || '');
        // Serialize BigInt to number for JSON response
        return clientes.map(c => ({
            ...c,
            dni: c.dni ? Number(c.dni) : null
        }));
    }

    @Get(':dni')
    async buscarPorDni(@Param('dni', ParseIntPipe) dni: number) {
        const cliente = await this.clientesService.buscarPorDni(dni);
        // Serialize BigInt to number for JSON response
        return {
            ...cliente,
            dni: cliente.dni ? Number(cliente.dni) : null
        };
    }
}
