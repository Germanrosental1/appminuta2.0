import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Request, BadRequestException, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdjustPricesDto } from './dto/adjust-prices.dto';

import { UnidadesImportService } from './unidades-import.service';

/**
 * Controller protegido con autenticación
 * Endpoints de metadata validan acceso al proyecto
 * Operaciones de escritura requieren permiso 'gestionarUnidades'
 */
@Controller('unidades')
@UseGuards(SupabaseAuthGuard)
export class UnidadesController {
    constructor(
        private readonly unidadesService: UnidadesService,
        private readonly unidadesQueryService: UnidadesQueryService,
        private readonly importService: UnidadesImportService,
        private readonly authService: AuthorizationService
    ) { }

    /**
     * Crear unidad - requiere permiso 'gestionarUnidades'
     */
    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
    }

    /**
     * Ajustar precios masivamente por proyectos - requiere permiso 'gestionarUnidades'
     * 🔒 SEGURIDAD: Valida que el usuario tenga acceso a cada proyecto antes de ajustar
     */
    @Patch('adjust-prices')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    async adjustPrices(
        @Body() adjustPricesDto: AdjustPricesDto,
        @CurrentUser() user: any
    ) {
        // 🔒 SEGURIDAD: Obtener proyectos a los que el usuario tiene acceso
        const userAccessibleProjects = await this.authService.getUserProjects(user.sub);

        // Verificar que todos los projectIds solicitados estén en los accesibles
        const unauthorizedProjects = adjustPricesDto.projectIds.filter(
            pid => !userAccessibleProjects.includes(pid)
        );

        if (unauthorizedProjects.length > 0) {
            throw new ForbiddenException(
                `No tienes acceso a los siguientes proyectos: ${unauthorizedProjects.length} proyecto(s)`
            );
        }

        return this.unidadesService.adjustPricesByProjects(
            adjustPricesDto.projectIds,
            adjustPricesDto.mode,
            adjustPricesDto.percentage,
            adjustPricesDto.fixedValue
        );
    }

    /**
     * Importar unidades desde Excel - requiere permiso 'gestionarUnidades'
     * Valida el tipo de archivo antes de procesar
     */
    @Post('import')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req) {

        // 🔒 SEGURIDAD: No loguear detalles de archivos ni URLs
        // El AllExceptionsFilter maneja errores de forma segura

        // Opción 1: Archivo subido
        if (file) {
            const allowedMimes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            if (!allowedMimes.includes(file.mimetype)) {
                throw new BadRequestException('Solo se permiten archivos Excel (.xlsx, .xls)');
            }

            return await this.importService.importFromExcel(file.buffer, req.user);
        }

        // Opción 2: URL en el body (para n8n/automations)
        if (body && (body.excel || body.linkArchivo)) {
            const url = body.excel || body.linkArchivo;
            return await this.importService.importFromUrl(url, req.user);
        }

        throw new BadRequestException('Debe proporcionar un archivo (file) o una URL (excel/linkArchivo) en el body');
    }

    // Metadata endpoints - MUST come before generic GET routes
    @Get('metadata/naturalezas')
    getNaturalezas() {
        return this.unidadesQueryService.getNaturalezas();
    }

    @Get('metadata/tipos-disponibles')
    getTiposDisponibles() {
        return this.unidadesQueryService.getTiposDisponibles();
    }

    @Get('metadata/proyectos')
    getProyectosPorTipo(@Query('tipo') tipo: string) {
        return this.unidadesQueryService.getProyectosPorTipo(tipo);
    }

    /**
     * Valida acceso al proyecto antes de retornar etapas
     */
    @Get('metadata/etapas')
    async getEtapas(@Query('proyecto') proyecto: string, @CurrentUser() user: any) {
        if (proyecto) {
            await this.validateProjectAccess(user.id, proyecto);
        }
        return this.unidadesQueryService.getEtapas(proyecto);
    }

    /**
     * Valida acceso al proyecto antes de retornar tipos
     */
    @Get('metadata/tipos')
    async getTipos(
        @Query('proyecto') proyecto: string,
        @CurrentUser() user: any,
        @Query('etapa') etapa?: string
    ) {
        console.log(`[DEBUG] getTipos requested for project: ${proyecto}, user: ${user.id}`);
        if (proyecto) {
            try {
                await this.validateProjectAccess(user.id, proyecto);
                console.log(`[DEBUG] Access granted for user ${user.id} to project ${proyecto}`);
            } catch (error) {
                console.error(`[DEBUG] Access DENIED for user ${user.id} to project ${proyecto}`, error);
                throw error;
            }
        }
        const result = await this.unidadesQueryService.getTipos(proyecto, etapa);
        console.log(`[DEBUG] getTipos result for ${proyecto}: ${result.length} types found`);
        return result;
    }

    /**
     * Valida acceso al proyecto antes de retornar sectores
     */
    @Get('metadata/sectores')
    async getSectores(
        @Query('proyecto') proyecto: string,
        @CurrentUser() user: any,
        @Query('etapa') etapa?: string,
        @Query('tipo') tipo?: string
    ) {
        if (proyecto) {
            await this.validateProjectAccess(user.id, proyecto);
        }
        return this.unidadesQueryService.getSectores(proyecto, etapa, tipo);
    }

    /**
     * Helper: Valida que el usuario tenga acceso al proyecto por nombre
     */
    private async validateProjectAccess(userId: string, projectName: string): Promise<void> {
        const userProjects = await this.authService.getUserProjectsDetailed(userId);
        const hasAccess = userProjects.some(p =>
            p.Nombre.toLowerCase() === projectName.toLowerCase()
        );
        if (!hasAccess) {
            throw new ForbiddenException('No tienes acceso a este proyecto');
        }
    }

    // OPTIMIZACIÓN: Batch endpoint para obtener múltiples unidades
    // Validar UUIDs y limitar cantidad
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

        return this.unidadesQueryService.findByIds(idArray);
    }

    // Generic routes - come after specific routes
    @Get()
    findAll(@Query() query: FindAllUnidadesQueryDto) {
        return this.unidadesQueryService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.unidadesQueryService.findOne(id);
    }

    /**
     * Actualizar unidad completa - requiere permiso 'gestionarUnidades'
     */
    @Patch(':id/complete')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    updateComplete(@Param('id', ParseUUIDPipe) id: string, @Body() updateUnidadDto: UpdateUnidadCompleteDto) {
        return this.unidadesService.updateComplete(id, updateUnidadDto);
    }

    /**
     * Actualizar unidad - requiere permiso 'gestionarUnidades'
     */
    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(id, updateUnidadDto);
    }

    /**
     * Eliminar unidad - requiere permiso 'gestionarUnidades'
     */
    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarUnidades')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.unidadesService.remove(id);
    }
}
