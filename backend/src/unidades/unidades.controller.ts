import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UnidadesService } from './unidades.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { FindAllUnidadesQueryDto } from './dto/find-all-unidades-query.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

import { UnidadesImportService } from './unidades-import.service';

@Controller('unidades')
@UseGuards(SupabaseAuthGuard)
export class UnidadesController {
    constructor(
        private readonly unidadesService: UnidadesService,
        private readonly importService: UnidadesImportService
    ) { }

    @Post()
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
    }


    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
        return this.importService.importFromExcel(file.buffer, req.user);
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
    @Get('batch')
    findByIds(@Query('ids') ids: string) {
        const idArray = ids ? ids.split(',').filter(Boolean) : [];
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

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(id, updateUnidadDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.unidadesService.remove(id);
    }
}
