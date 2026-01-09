import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('proyectos')
@UseGuards(SupabaseAuthGuard)
export class ProyectosController {
    constructor(private readonly proyectosService: ProyectosService) { }

    @Post()
    create(@Body() createProyectoDto: CreateProyectoDto) {
        return this.proyectosService.create(createProyectoDto);
    }

    @Get('my-projects')
    getMyProjects(@Request() req) {
        const userId = req.user?.sub || req.user?.id;
        return this.proyectosService.findByUserId(userId);
    }

    @Get()
    findAll() {
        return this.proyectosService.findAll();
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
