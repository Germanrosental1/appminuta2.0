import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EtapasService } from './etapas.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('etapas')
@UseGuards(SupabaseAuthGuard)
export class EtapasController {
    constructor(private readonly etapasService: EtapasService) { }

    @Post()
    create(@Body() createEtapaDto: CreateEtapaDto) {
        return this.etapasService.create(createEtapaDto);
    }

    @Get()
    findAll() {
        return this.etapasService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.etapasService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEtapaDto: UpdateEtapaDto) {
        return this.etapasService.update(id, updateEtapaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.etapasService.remove(id);
    }
}
