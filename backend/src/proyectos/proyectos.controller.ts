import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { AssignUserToProjectDto } from './dto/assign-user-to-project.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AuthorizationService } from '../auth/authorization';

@Controller('proyectos')
@UseGuards(SupabaseAuthGuard)
export class ProyectosController {
    constructor(
        private readonly proyectosService: ProyectosService,
        private readonly authorizationService: AuthorizationService,
    ) { }

    @Post()
    create(@Body() createProyectoDto: CreateProyectoDto) {
        return this.proyectosService.create(createProyectoDto);
    }

    @Get()
    findAll() {
        return this.proyectosService.findAll();
    }

    // Nuevo endpoint: proyectos accesibles por el usuario autenticado
    @Get('my-projects')
    async getMyProjects(@Request() req) {
        const userId = req.user.id;
        return this.authorizationService.getUserProjectsDetailed(userId);
    }

    // Nuevo endpoint: asignar usuario a proyecto (solo owners)
    @Post(':projectId/assign-user')
    async assignUserToProject(
        @Param('projectId') projectId: string,
        @Body() assignDto: AssignUserToProjectDto,
        @Request() req
    ) {
        const assignedBy = req.user.id;
        return this.authorizationService.assignUserToProject(
            assignDto.userId,
            projectId,
            assignDto.roleId,
            assignedBy
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.proyectosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
        return this.proyectosService.update(id, updateProyectoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.proyectosService.remove(id);
    }
}
