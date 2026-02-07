import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Request, BadRequestException, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiUnauthorizedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiCreatedResponse,
} from '@nestjs/swagger';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { UnidadResponseDto, UnidadListItemDto } from './dto/unidad-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdjustPricesDto } from './dto/adjust-prices.dto';
import { BruteForceGuard } from '../../common/guards/brute-force.guard';
import { BruteForceInterceptor } from '../../common/interceptors/brute-force.interceptor';
import { UnidadesImportService } from './unidades-import.service';
import {
    ApiResponseWrapper,
    ApiCreatedResponseWrapper,
    ApiPaginatedResponseWrapper,
} from '../../common/decorators/api-response-wrapper.decorator';

@ApiTags('Unidades')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'No autorizado - Token JWT inválido o ausente' })
@ApiForbiddenResponse({ description: 'Prohibido - No tiene los permisos necesarios' })
@Controller('unidades')
@UseGuards(SupabaseAuthGuard)
export class UnidadesController {
    constructor(
        private readonly unidadesService: UnidadesService,
        private readonly unidadesQueryService: UnidadesQueryService,
        private readonly importService: UnidadesImportService,
        private readonly authService: AuthorizationService
    ) { }

    @Post()
    @ApiOperation({
        summary: 'Crear una nueva unidad',
        description: 'Registra una unidad inmobiliaria. Requiere permiso `gestionarUnidades`.',
    })
    @ApiCreatedResponseWrapper(UnidadResponseDto)
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarUnidades')
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
    }

    @Patch('adjust-prices')
    @ApiOperation({
        summary: 'Ajuste masivo de precios',
        description: 'Ajusta los precios de múltiples unidades por porcentaje o valor fijo. Requiere permiso `gestionarUnidades`.',
    })
    @ApiOkResponse({ description: 'Precios ajustados correctamente' })
    @ApiBadRequestResponse({ description: 'Configuración de ajuste inválida' })
    @UseGuards(GlobalPermissionsGuard, BruteForceGuard)
    @UseInterceptors(BruteForceInterceptor)
    @Permissions('gestionarUnidades')
    async adjustPrices(
        @Body() adjustPricesDto: AdjustPricesDto,
        @CurrentUser() user: any
    ) {
        const userAccessibleProjects = await this.authService.getUserProjects(user.sub);
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

    @Post('import')
    @ApiOperation({
        summary: 'Importar unidades desde Excel/URL',
        description: 'Procesa un archivo .xlsx o una URL de Excel para carga masiva. Requiere permiso `gestionarUnidades`.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary', description: 'Archivo Excel' },
                excel: { type: 'string', description: 'URL alternativa del archivo' },
            },
        },
    })
    @ApiCreatedResponse({ description: 'Proceso de importación iniciado/completado' })
    @UseGuards(GlobalPermissionsGuard, BruteForceGuard)
    @Permissions('gestionarUnidades')
    @UseInterceptors(FileInterceptor('file'), BruteForceInterceptor)
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req: any) {
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

        if (body && (body.excel || body.linkArchivo)) {
            const url = body.excel || body.linkArchivo;
            return await this.importService.importFromUrl(url, req.user);
        }

        throw new BadRequestException('Debe proporcionar un archivo (file) o una URL (excel/linkArchivo) en el body');
    }

    @Get('metadata/naturalezas')
    @ApiOperation({ summary: 'Obtener naturalezas disponibles', description: 'Retorna lista de tipos de naturaleza (Vivienda, Oficina, etc.)' })
    @ApiResponseWrapper(String, true)
    getNaturalezas() {
        return this.unidadesQueryService.getNaturalezas();
    }

    @Get('metadata/tipos-disponibles')
    @ApiOperation({ summary: 'Obtener tipos disponibles', description: 'Retorna lista de tipos (Departamento, Casa, etc.)' })
    @ApiResponseWrapper(String, true)
    getTiposDisponibles() {
        return this.unidadesQueryService.getTiposDisponibles();
    }

    @Get('metadata/proyectos')
    @ApiOperation({ summary: 'Listar proyectos por tipo', description: 'Filtra proyectos que contienen unidades de un tipo específico.' })
    @ApiResponseWrapper(String, true)
    getProyectosPorTipo(@Query('tipo') tipo: string) {
        return this.unidadesQueryService.getProyectosPorTipo(tipo);
    }

    @Get('metadata/etapas')
    @ApiOperation({ summary: 'Obtener etapas de un proyecto' })
    @ApiResponseWrapper(String, true)
    async getEtapas(@Query('proyecto') proyecto: string, @CurrentUser() user: any) {
        if (proyecto) {
            await this.validateProjectAccess(user.id, proyecto);
        }
        return this.unidadesQueryService.getEtapas(proyecto);
    }

    @Get('metadata/tipos')
    @ApiOperation({ summary: 'Obtener tipos por proyecto/etapa' })
    @ApiResponseWrapper(String, true)
    async getTipos(
        @Query('proyecto') proyecto: string,
        @CurrentUser() user: any,
        @Query('etapa') etapa?: string
    ) {
        if (proyecto) {
            await this.validateProjectAccess(user.id, proyecto);
        }
        return await this.unidadesQueryService.getTipos(proyecto, etapa);
    }

    @Get('metadata/sectores')
    @ApiOperation({ summary: 'Obtener sectores por proyecto/etapa/tipo' })
    @ApiResponseWrapper(String, true)
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

    private async validateProjectAccess(userId: string, projectName: string): Promise<void> {
        // Check if user has global admin role (superadminmv or adminmv)
        const userAccessInfo = await this.authService.getUserAccessInfo(userId);
        const isGlobalAdmin = userAccessInfo?.UsuariosRoles?.some(
            ur => ur.Roles?.Nombre === 'superadminmv' || ur.Roles?.Nombre === 'adminmv'
        );

        // Global admins have access to all projects
        if (isGlobalAdmin) {
            return;
        }

        // For non-admin users, check project-specific access
        const userProjects = await this.authService.getUserProjectsDetailed(userId);
        const hasAccess = userProjects.some(p =>
            p.Nombre.toLowerCase() === projectName.toLowerCase()
        );
        if (!hasAccess) {
            throw new ForbiddenException('No tienes acceso a este proyecto');
        }
    }

    @Get('batch')
    @ApiOperation({ summary: 'Obtener unidades por IDs (Batch)', description: 'Obtiene hasta 50 unidades por sus UUIDs.' })
    @ApiResponseWrapper(UnidadResponseDto, true)
    findByIds(@Query('ids') ids: string) {
        const idArray = ids ? ids.split(',').filter(Boolean) : [];
        const MAX_BATCH_SIZE = 50;
        if (idArray.length > MAX_BATCH_SIZE) {
            throw new BadRequestException(`Máximo ${MAX_BATCH_SIZE} IDs permitidos por request`);
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const invalidIds = idArray.filter(id => !uuidRegex.test(id));
        if (invalidIds.length > 0) {
            throw new BadRequestException('IDs inválidos: deben ser UUIDs válidos');
        }
        return this.unidadesQueryService.findByIds(idArray);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas las unidades', description: 'Búsqueda paginada con filtros avanzados.' })
    @ApiPaginatedResponseWrapper(UnidadListItemDto)
    findAll(@Query() query: FindAllUnidadesQueryDto) {
        return this.unidadesQueryService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver detalle de unidad', description: 'Obtiene todos los campos de una unidad por UUID.' })
    @ApiResponseWrapper(UnidadResponseDto)
    @ApiNotFoundResponse({ description: 'Unidad no encontrada' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.unidadesQueryService.findOne(id);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Actualización completa de unidad (Admin)', description: 'Permite editar todos los campos técnicos de la unidad. Requiere `gestionarUnidades`.' })
    @ApiResponseWrapper(UnidadResponseDto)
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarUnidades')
    updateComplete(@Param('id', ParseUUIDPipe) id: string, @Body() updateUnidadDto: UpdateUnidadCompleteDto) {
        return this.unidadesService.updateComplete(id, updateUnidadDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar unidad', description: 'Actualización parcial de campos comerciales/comunes.' })
    @ApiResponseWrapper(UnidadResponseDto)
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarUnidades')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(id, updateUnidadDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar unidad', description: 'Eliminación lógica de la unidad.' })
    @ApiOkResponse({ description: 'Unidad eliminada correctamente' })
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarUnidades')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.unidadesService.remove(id);
    }
}
