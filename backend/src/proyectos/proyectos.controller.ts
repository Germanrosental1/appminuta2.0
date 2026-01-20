import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación
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
     * Listar todos los proyectos activos
     */
    @Get()
    findAll() {
        return this.proyectosService.findAll();
    }

    /**
     * 🔒 Obtener proyecto por ID (validado como UUID)
     * SEGURIDAD: Verifica que el usuario tenga acceso al proyecto
     */
    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        const userId = user?.sub || user?.id;

        // 🔒 SEGURIDAD: Verificar que el usuario tiene acceso a este proyecto
        const userProjects = await this.proyectosService.findByUserId(userId);
        const hasAccess = userProjects.some(p => p.id === id);

        if (!hasAccess) {
            throw new ForbiddenException('No tienes acceso a este proyecto');
        }

        return this.proyectosService.findOne(id);
    }

    /**
     * 🔒 Actualizar proyecto - requiere permiso 'gestionarProyectos'
     */
    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarProyectos')
    update(@Param('id') id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
        return this.proyectosService.update(id, updateProyectoDto);
    }

    /**
     * 🔒 Eliminar proyecto - requiere permiso 'gestionarProyectos'
     */
    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions('gestionarProyectos')
    remove(@Param('id') id: string) {
        return this.proyectosService.remove(id);
    }
}
