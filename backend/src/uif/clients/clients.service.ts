import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaUifService } from '../../prisma-uif/prisma-uif.service';
import { CreateUifClientDto } from './dto/create-client.dto';
import { UpdateUifClientDto } from './dto/update-client.dto';
import { LoggerService } from '../../logger/logger.service';
import { sanitizeObject } from '../../common/sanitize.helper';

// Default templates for financial data
const DEFAULT_FINANCIAL_DATA = {
    datos: { dolar: "1475", nombreYApellido: "" },
    ganancias: {
        anio_fiscal: "",
        fecha_declaracion_jurada: "",
        primera_cat: 0,
        segunda_cat_acciones: 0,
        segunda_cat_instrumentos: 0,
        segunda_cat_dividendos: 0,
        tercera_cat: 0,
        cuarta_cat: 0,
        monto_consumido: 0
    },
    bienes_personales: {
        anio_fiscal: "",
        fecha_declaracion_jurada: "",
        efectivo_pais: 0,
        efectivo_exterior: 0,
        exento_no_alcanzado: 0
    },
    iva: {
        anio_fiscal: "",
        fecha_declaracion_jurada: "",
        debitos_fiscales: []
    },
    recibo_haberes: { sueldo_neto: 0 },
    monotributo: { categoria: "" },
    certificacion_contable: { certificacion_firmada: 0 },
    otros: {
        venta_propiedad: 0,
        arrendamiento: 0,
        escriturasCesionesVentas: 0,
        blanqueo: 0
    },
    datos_balance: {
        caja_y_bancos: 0,
        patrimonio_neto: 0,
        ingresos: 0,
        costos: 0
    },
    estado_resultados_settings: {
        peso_caja_bancos: 70,
        peso_ingresos: 30,
        porcentaje_patrimonio_neto: 10,
        usar_resultado_bruto: false
    }
};

const DEFAULT_ANALYSIS_SETTINGS = {
    weights: {
        ganancias: 70,
        iva: 30,
        monotributo: 70,
        haberes: 100,
        otros: 100,
        bienes_personales: 0,
        certificacion_contable: 0,
        datos_balance: 0
    },
    simulacion: {
        importe_operacion: 0,
        aporte_operacion: 0,
        cantidad_cuotas: 24
    }
};

@Injectable()
export class UifClientsService {
    constructor(
        private readonly prisma: PrismaUifService,
        private readonly logger: LoggerService,
    ) { }

    async findAll() {
        // Only select essential fields for list view (exclude large JSON objects)
        return this.prisma.clients.findMany({
            select: {
                id: true,
                name: true,
                cuit: true,
                status: true,
                person_type: true,
                created_at: true,
                updated_at: true,
                // Omit financial_data and analysis_settings for performance
            },
            orderBy: { updated_at: 'desc' },
        });
    }

    async findOne(id: string) {
        const client = await this.prisma.clients.findUnique({
            where: { id },
            include: {
                documents: { orderBy: { created_at: 'desc' } },
                analyses: { orderBy: { created_at: 'desc' } },
            },
        });

        if (!client) {
            throw new NotFoundException(`Cliente UIF con ID ${id} no encontrado`);
        }

        return client;
    }

    async create(dto: CreateUifClientDto, userId: string, userEmail: string) {
        // Sanitizar datos de entrada
        const sanitizedDto = sanitizeObject(dto);

        const client = await this.prisma.clients.create({
            data: {
                name: sanitizedDto.name,
                cuit: sanitizedDto.cuit,
                person_type: sanitizedDto.person_type || 'PF',
                status: 'Activo',
                financial_data: sanitizedDto.financial_data || DEFAULT_FINANCIAL_DATA,
                analysis_settings: sanitizedDto.analysis_settings || DEFAULT_ANALYSIS_SETTINGS,
            },
        });

        // Audit log
        await this.logger.agregarLog({
            motivo: 'Creación de Cliente UIF',
            descripcion: `Cliente "${client.name}" creado en sistema UIF`,
            impacto: 'Medio',
            tablaafectada: 'uif.clients',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return client;
    }

    async update(id: string, dto: UpdateUifClientDto, userId: string, userEmail: string) {
        // Verificar que existe
        await this.findOne(id);

        const sanitizedDto = sanitizeObject(dto);

        const client = await this.prisma.clients.update({
            where: { id },
            data: sanitizedDto,
        });

        await this.logger.agregarLog({
            motivo: 'Actualización de Cliente UIF',
            descripcion: `Cliente "${client.name}" actualizado`,
            impacto: 'Bajo',
            tablaafectada: 'uif.clients',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return client;
    }

    async remove(id: string, userId: string, userEmail: string) {
        const client = await this.findOne(id);

        await this.prisma.clients.delete({ where: { id } });

        await this.logger.agregarLog({
            motivo: 'Eliminación de Cliente UIF',
            descripcion: `Cliente "${client.name}" eliminado del sistema UIF`,
            impacto: 'Alto',
            tablaafectada: 'uif.clients',
            usuarioID: userId,
            usuarioemail: userEmail,
        });

        return { deleted: true, id };
    }
}
