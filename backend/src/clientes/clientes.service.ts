import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificarCrearClienteDto } from './dto/verificar-crear-cliente.dto';

@Injectable()
export class ClientesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Verifica si un cliente existe por DNI. Si no existe, lo crea.
     * @param dto Datos del cliente
     * @returns Cliente existente o recién creado con flag 'created'
     */
    async verificarOCrearCliente(dto: VerificarCrearClienteDto) {
        try {
            // Buscar cliente existente por DNI
            const clienteExistente = await this.prisma.clientes.findUnique({
                where: { dni: dto.dni },
            });

            if (clienteExistente) {
                return {
                    dni: Number(clienteExistente.dni),
                    nombreApellido: clienteExistente.nombreApellido,
                    telefono: clienteExistente.telefono?.toString() || null,
                    created: false,
                };
            }

            // Cliente no existe, crear nuevo
            const telefonoNumerico = dto.telefono
                ? Number(dto.telefono.replace(/\D/g, ''))
                : null;

            const nuevoCliente = await this.prisma.clientes.create({
                data: {
                    dni: dto.dni,
                    nombreApellido: dto.nombreApellido,
                    // Telefono debe ser número para Prisma Decimal (cast to any para evitar TS error)
                    telefono: telefonoNumerico as any,
                    unidadesInteresadas: null,
                },
            });

            return {
                dni: Number(nuevoCliente.dni),
                nombreApellido: nuevoCliente.nombreApellido,
                telefono: nuevoCliente.telefono?.toString() || null,
                created: true,
            };
        } catch (error) {
            console.error('Error en verificarOCrearCliente:', error);
            if (error.code === 'P2002') {
                throw new ConflictException(`El cliente con DNI ${dto.dni} ya existe`);
            }
            throw error;
        }
    }

    /**
     * Busca un cliente por DNI
     * @param dni DNI del cliente
     * @returns Cliente encontrado
     */
    async buscarPorDni(dni: number) {
        const cliente = await this.prisma.clientes.findUnique({
            where: { dni },
        });

        if (!cliente) {
            throw new NotFoundException(`Cliente con DNI ${dni} no encontrado`);
        }

        return {
            dni: Number(cliente.dni),
            nombreApellido: cliente.nombreApellido,
            telefono: cliente.telefono?.toString() || null,
            unidadesInteresadas: cliente.unidadesInteresadas,
            created_at: cliente.created_at,
        };
    }

    /**
     * Busca clientes por texto (nombre/apellido o DNI)
     * @param query Texto de búsqueda
     * @returns Lista de clientes que coinciden
     */
    async buscar(query: string) {
        // Si el query es numérico, buscar por DNI
        const queryNum = Number.parseInt(query, 10);
        if (!Number.isNaN(queryNum)) {
            const clientes = await this.prisma.clientes.findMany({
                where: {
                    dni: {
                        equals: queryNum,
                    },
                },
                take: 10,
            });

            return clientes.map(c => ({
                dni: Number(c.dni),
                nombreApellido: c.nombreApellido,
                telefono: c.telefono?.toString() || null,
            }));
        }

        // Buscar por nombre/apellido (case insensitive)
        const clientes = await this.prisma.clientes.findMany({
            where: {
                nombreApellido: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            take: 10,
            orderBy: {
                nombreApellido: 'asc',
            },
        });

        return clientes.map(c => ({
            dni: Number(c.dni),
            nombreApellido: c.nombreApellido,
            telefono: c.telefono?.toString() || null,
        }));
    }
}
