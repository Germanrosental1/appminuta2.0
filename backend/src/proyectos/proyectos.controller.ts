import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard as PermissionsGuard } from '../common/guards/global-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación
 * GET /proyectos ahora filtra por proyectos del usuario
 * Operaciones de escritura requieren permiso 'gestionarProyectos'
 */
@Controller('proyectos')
@UseGuards(SupabaseAuthGuard)
export class ProyectosController {
    constructor(private readonly proyectosService: ProyectosService) { }

    /**
     * 🔒 Crear proyecto - requiere permiso 'gestionarProyectos'
     */
    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarProyectos')
    create(@Body() createProyectoDto: CreateProyectoDto) {
        return this.proyectosService.create(createProyectoDto);
    }

    /**
     * Obtener proyectos del usuario autenticado
     */
    @Get('my-projects')
    getMyProjects(@Request() req) {
        const userId = req.user?.sub || req.user?.id;
        return this.proyectosService.findByUserId(userId);
    }

    /**
     * Buscar proyecto por nombre
     */
    @Get('by-name/:name')
    findByName(@Param('name') name: string) {
        return this.proyectosService.findByName(name);
    }

    /**
     * 🔒 SEGURIDAD: Listar solo proyectos a los que el usuario tiene acceso
     * Antes devolvía TODOS los proyectos, ahora filtra por usuario
     */
    @Get()
    findAll(@CurrentUser() user: any) {
        const userId = user?.sub || user?.id;
        return this.proyectosService.findByUserId(userId);
    }

    /**
     * 🔒 Obtener proyecto por ID (validado como UUID)
     */
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.proyectosService.findOne(id);
    }

    /**
     * 🔒 Actualizar proyecto - requiere permiso 'gestionarProyectos'
     */
    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarProyectos')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
        return this.proyectosService.update(id, updateProyectoDto);
    }

    /**
     * 🔒 Eliminar proyecto - requiere permiso 'gestionarProyectos'
     */
    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarProyectos')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.proyectosService.remove(id);
    }
}
