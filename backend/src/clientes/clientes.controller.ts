import { Controller, Post, Get, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { VerificarCrearClienteDto } from './dto/verificar-crear-cliente.dto';

@Controller('clientes')
export class ClientesController {
    constructor(private readonly clientesService: ClientesService) { }

    @Post('verificar-o-crear')
    async verificarOCrearCliente(@Body() dto: VerificarCrearClienteDto) {
        return this.clientesService.verificarOCrearCliente(dto);
    }

    @Get('buscar')
    async buscar(@Query('q') query: string) {
        if (!query || query.trim() === '') {
            return [];
        }
        return this.clientesService.buscar(query);
    }

    @Get(':dni')
    async buscarPorDni(@Param('dni', ParseIntPipe) dni: number) {
        return this.clientesService.buscarPorDni(dni);
    }
}
