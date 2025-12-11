import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('unidades')
@UseGuards(SupabaseAuthGuard)
export class UnidadesController {
    constructor(private readonly unidadesService: UnidadesService) { }

    @Post()
    create(@Body() createUnidadDto: CreateUnidadDto) {
        return this.unidadesService.create(createUnidadDto);
    }

    @Get('metadata/naturalezas')
    getNaturalezas() {
        return this.unidadesService.getNaturalezas();
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

    @Get()
    findAll(@Query() query: any) {
        return this.unidadesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.unidadesService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadDto) {
        return this.unidadesService.update(+id, updateUnidadDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.unidadesService.remove(+id);
    }
}
