import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { VerificarCrearClienteDto } from './dto/verificar-crear-cliente.dto';

@Injectable()
export class ClientesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Busca o crea un cliente por nombreApellido
     * Si existe, lo retorna. Si no, lo crea.
     */
    async verificarOCrearCliente(dto: VerificarCrearClienteDto) {
        const { nombreApellido, telefono, dni } = dto;

        // Try to find by nombreApellido first
        let cliente = await this.prisma.clientes.findFirst({
            where: { NombreApellido: nombreApellido }
        });

        if (cliente) {
            // Update telefono if provided and different
            if (telefono && telefono !== cliente.Telefono) {
                cliente = await this.prisma.clientes.update({
                    where: { Id: cliente.Id },
                    data: { Telefono: telefono }
                });
            }
            return { ...cliente, created: false };
        }

        // Create new cliente
        const newCliente = await this.prisma.clientes.create({
            data: {
                NombreApellido: nombreApellido,
                Telefono: telefono || '',
                Dni: dni ? BigInt(dni) : null
            }
        });

        return { ...newCliente, created: true };
    }

    /**
     * Busca un cliente por DNI
     */
    async buscarPorDni(dni: number) {
        const cliente = await this.prisma.clientes.findFirst({
            where: { Dni: BigInt(dni) }
        });

        if (!cliente) {
            throw new NotFoundException(`Cliente con DNI ${dni} no encontrado`);
        }

        return cliente;
    }

    /**
     * Busca clientes por query (nombre parcial)
     */
    async buscarClientes(query: string) {
        return this.prisma.clientes.findMany({
            where: {
                NombreApellido: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            take: 20,
            orderBy: { NombreApellido: 'asc' }
        });
    }

    /**
     * Obtiene un cliente por ID
     */
    async findById(id: string) {
        const cliente = await this.prisma.clientes.findUnique({
            where: { Id: id }
        });

        if (!cliente) {
            throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
        }

        return cliente;
    }
}
