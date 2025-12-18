import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { UpdateUnidadCompleteDto } from './dto/update-unidad-complete.dto';
import { UpdateUnidadAdminDto } from './dto/update-unidad-admin.dto';
import { mapToLimitedResponse } from './dto/unidad-limited-response.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ProjectAccessGuard, RolesGuard, Roles, AuthorizationService } from '../auth/authorization';
import { ROLES } from '../auth/authorization/roles.constants';

@Controller('unidades')
@UseGuards(SupabaseAuthGuard, ProjectAccessGuard)
export class UnidadesController {
    constructor(
        private readonly unidadesService: UnidadesService,
        private readonly authorizationService: AuthorizationService,
    ) { }

    @Post()
    @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
    @UseGuards(RolesGuard)
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
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

    // Generic routes - come after specific routes
    @Get()
    async findAll(@Query() query: FindAllUnidadesQueryDto, @Request() req) {
        const units = await this.unidadesService.findAll(query);

        // Filtrar respuesta según rol del usuario
        if (query.proyecto) {
            const userRole = await this.authorizationService.getUserRoleInProject(
                req.user.id,
                query.proyecto,
            );

            // Si es viewerinmobiliariamv, retornar solo campos limitados
            if (userRole === ROLES.VIEWER_INMOBILIARIA) {
                return units.map(unit => mapToLimitedResponse(unit));
            }
        }

        return units;
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.unidadesService.findOne(id);
    }

    @Get('by-sectorid/:sectorid')
    findBySectorId(@Param('sectorid') sectorid: string) {
        return this.unidadesService.findBySectorId(sectorid);
    }

    @Patch(':id')
    @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
    @UseGuards(RolesGuard)
    update(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(id, updateUnidadDto);
    }

    // Endpoint específico para adminmv (solo estado)
    @Patch(':id/status')
    @Roles(ROLES.ADMIN)
    @UseGuards(RolesGuard)
    updateStatus(@Param('id') id: string, @Body() updateDto: UpdateUnidadAdminDto) {
        return this.unidadesService.updateStatus(id, updateDto.estado_id);
    }

    // Endpoint completo solo para superadminmv
    @Patch(':id/complete')
    @Roles(ROLES.SUPER_ADMIN)
    @UseGuards(RolesGuard)
    updateComplete(@Param('id') id: string, @Body() updateDto: UpdateUnidadCompleteDto) {
        return this.unidadesService.updateComplete(id, updateDto);
    }

    @Delete(':id')
    @Roles(ROLES.SUPER_ADMIN, ROLES.ADMIN)
    @UseGuards(RolesGuard)
    remove(@Param('id') id: string) {
        return this.unidadesService.remove(id);
    }
}
