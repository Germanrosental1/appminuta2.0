import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
} from '@nestjs/swagger';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { ProyectoResponseDto, ProyectoListItemDto } from './dto/proyecto-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
    ApiResponseWrapper,
    ApiCreatedResponseWrapper,
} from '../../common/decorators/api-response-wrapper.decorator';

@ApiTags('Proyectos')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'No autorizado - Token JWT inválido o ausente' })
@ApiForbiddenResponse({ description: 'Prohibido - No tiene los permisos necesarios' })
@Controller('proyectos')
@UseGuards(SupabaseAuthGuard)
export class ProyectosController {
    constructor(private readonly proyectosService: ProyectosService) { }

    @Post()
    @ApiOperation({
        summary: 'Crear un nuevo proyecto',
        description: 'Registra un proyecto inmobiliario en el sistema. Requiere permiso `gestionarProyectos`.',
    })
    @ApiCreatedResponseWrapper(ProyectoResponseDto)
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarProyectos')
    create(@Body() createProyectoDto: CreateProyectoDto) {
        return this.proyectosService.create(createProyectoDto);
    }

    @Get('my-projects')
    @ApiOperation({
        summary: 'Listar mis proyectos',
        description: 'Retorna los proyectos asignados al usuario autenticado.',
    })
    @ApiResponseWrapper(ProyectoListItemDto, true)
    getMyProjects(@Request() req) {
        const userId = req.user?.sub || req.user?.id;
        return this.proyectosService.findByUserId(userId);
    }

    @Get('by-name/:name')
    @ApiOperation({
        summary: 'Buscar proyecto por nombre',
        description: 'Busca un proyecto por su nombre exacto.',
    })
    @ApiResponseWrapper(ProyectoResponseDto)
    @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
    findByName(@Param('name') name: string) {
        return this.proyectosService.findByName(name);
    }

    @Get()
    @ApiOperation({
        summary: 'Listar todos los proyectos accesibles',
        description: 'Retorna todos los proyectos a los que el usuario tiene acceso.',
    })
    @ApiResponseWrapper(ProyectoListItemDto, true)
    findAll(@CurrentUser() user: any) {
        const userId = user?.sub || user?.id;
        return this.proyectosService.findByUserId(userId);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Obtener detalle de proyecto',
        description: 'Obtiene todos los campos de un proyecto por UUID.',
    })
    @ApiResponseWrapper(ProyectoResponseDto)
    @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        const userId = user?.sub || user?.id;

        // 🔒 SEGURIDAD: Verificar que el usuario tiene acceso a este proyecto
        const userProjects = await this.proyectosService.findByUserId(userId);
        const hasAccess = userProjects.some(p => p.id === id || p.Id === id);

        if (!hasAccess) {
            throw new ForbiddenException('No tienes acceso a este proyecto');
        }

        return this.proyectosService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Actualizar proyecto',
        description: 'Actualización parcial de los datos de un proyecto. Requiere `gestionarProyectos`.',
    })
    @ApiResponseWrapper(ProyectoResponseDto)
    @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarProyectos')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
        return this.proyectosService.update(id, updateProyectoDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Eliminar proyecto',
        description: 'Eliminación física/lógica de un proyecto del sistema. Requiere `gestionarProyectos`.',
    })
    @ApiOkResponse({ description: 'Proyecto eliminado con éxito' })
    @UseGuards(GlobalPermissionsGuard)
    @Permissions('gestionarProyectos')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.proyectosService.remove(id);
    }
}
