import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Request, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UnidadesService } from './unidades.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { UnidadesImportService } from './unidades-import.service';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación
 * Operaciones de escritura requieren permiso 'gestionarUnidades'
 */
@Controller('unidades')
@UseGuards(SupabaseAuthGuard)
export class UnidadesController {
    constructor(
        private readonly unidadesService: UnidadesService,
        private readonly importService: UnidadesImportService
    ) { }

    /**
     * 🔒 Crear unidad - requiere permiso 'gestionarUnidades'
     */
    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
    }

    /**
     * 🔒 Importar unidades desde Excel - requiere permiso 'gestionarUnidades'
     * Valida el tipo de archivo antes de procesar
     */
    @Post('import')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    @UseInterceptors(FileInterceptor('file'))
<<<<<<< Updated upstream
    uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req) {
=======
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req) {
        // 🔒 SEGURIDAD: No loguear detalles de archivos ni URLs
        // El AllExceptionsFilter maneja errores de forma segura

>>>>>>> Stashed changes
        // Opción 1: Archivo subido
        if (file) {
            const allowedMimes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            if (!allowedMimes.includes(file.mimetype)) {
                throw new BadRequestException('Solo se permiten archivos Excel (.xlsx, .xls)');
            }
<<<<<<< Updated upstream
            return this.importService.importFromExcel(file.buffer, req.user);
=======

            return await this.importService.importFromExcel(file.buffer, req.user);
>>>>>>> Stashed changes
        }

        // Opción 2: URL en el body (para n8n/automations)
        if (body && (body.excel || body.linkArchivo)) {
            const url = body.excel || body.linkArchivo;
<<<<<<< Updated upstream
            return this.importService.importFromUrl(url, req.user);
=======
            return await this.importService.importFromUrl(url, req.user);
>>>>>>> Stashed changes
        }

        throw new BadRequestException('Debe proporcionar un archivo (file) o una URL (excel/linkArchivo) en el body');
    }

    // Metadata endpoints - MUST come before generic GET routes
    @Get('metadata/naturalezas')
    getNaturalezas() {
        return this.unidadesService.getNaturalezas();
    }

    @Get('metadata/tipos-disponibles')
    getTiposDisponibles() {
        return this.unidadesService.getTiposDisponibles();
    }

    @Get('metadata/proyectos')
    getProyectosPorTipo(@Query('tipo') tipo: string) {
        return this.unidadesService.getProyectosPorTipo(tipo);
    }

    @Get('metadata/etapas')
    getEtapas(@Query('proyecto') proyecto: string) {
        return this.unidadesService.getEtapas(proyecto);
    }

    @Get('metadata/tipos')
    getTipos(@Query('proyecto') proyecto: string, @Query('etapa') etapa?: string) {
        return this.unidadesService.getTipos(proyecto, etapa);
    }

    @Get('metadata/sectores')
    getSectores(
        @Query('proyecto') proyecto: string,
        @Query('etapa') etapa?: string,
        @Query('tipo') tipo?: string,
    ) {
        return this.unidadesService.getSectores(proyecto, etapa, tipo);
    }

    // ⚡ OPTIMIZACIÓN: Batch endpoint para obtener múltiples unidades
    // 🔒 SEGURIDAD: Validar UUIDs y limitar cantidad
    @Get('batch')
    findByIds(@Query('ids') ids: string) {
        const idArray = ids ? ids.split(',').filter(Boolean) : [];

        // Validar límite máximo de IDs
        const MAX_BATCH_SIZE = 50;
        if (idArray.length > MAX_BATCH_SIZE) {
            throw new BadRequestException(`Máximo ${MAX_BATCH_SIZE} IDs permitidos por request`);
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const invalidIds = idArray.filter(id => !uuidRegex.test(id));
        if (invalidIds.length > 0) {
            throw new BadRequestException('IDs inválidos: deben ser UUIDs válidos');
        }

        return this.unidadesService.findByIds(idArray);
    }

    // Generic routes - come after specific routes
    @Get()
    findAll(@Query() query: FindAllUnidadesQueryDto) {
        return this.unidadesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.unidadesService.findOne(id);
    }

    /**
     * 🔒 Actualizar unidad completa - requiere permiso 'gestionarUnidades'
     */
    @Patch(':id/complete')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    updateComplete(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadCompleteDto) {
        return this.unidadesService.updateComplete(id, updateUnidadDto);
    }

    /**
     * 🔒 Actualizar unidad - requiere permiso 'gestionarUnidades'
     */
    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    update(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(id, updateUnidadDto);
    }

    /**
     * 🔒 Eliminar unidad - requiere permiso 'gestionarUnidades'
     */
    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    remove(@Param('id') id: string) {
        return this.unidadesService.remove(id);
    }
}
