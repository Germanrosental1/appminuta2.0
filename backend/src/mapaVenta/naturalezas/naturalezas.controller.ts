import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { NaturalezasService } from './naturalezas.service';
import { CreateNaturalezaDto } from './dto/create-naturaleza.dto';
import { UpdateNaturalezaDto } from './dto/update-naturaleza.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('naturalezas')
@UseGuards(SupabaseAuthGuard)
export class NaturalezasController {
    constructor(private readonly naturalezasService: NaturalezasService) { }

    @Post()
    create(@Body() createNaturalezaDto: CreateNaturalezaDto) {
        return this.naturalezasService.create(createNaturalezaDto);
    }

    @Get()
    findAll() {
        return this.naturalezasService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.naturalezasService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateNaturalezaDto: UpdateNaturalezaDto) {
        return this.naturalezasService.update(id, updateNaturalezaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.naturalezasService.remove(id);
    }
}
