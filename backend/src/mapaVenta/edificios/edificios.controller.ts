import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { EdificiosService } from './edificios.service';
import { CreateEdificioDto } from './dto/create-edificio.dto';
import { UpdateEdificioDto } from './dto/update-edificio.dto';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('edificios')
@UseGuards(SupabaseAuthGuard)
export class EdificiosController {
    constructor(private readonly edificiosService: EdificiosService) { }

    @Post()
    create(@Body() createEdificioDto: CreateEdificioDto) {
        return this.edificiosService.create(createEdificioDto);
    }

    @Get()
    findAll(@Query('proyectoId') proyectoId?: string) {
        return this.edificiosService.findAll(proyectoId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.edificiosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEdificioDto: UpdateEdificioDto) {
        return this.edificiosService.update(id, updateEdificioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.edificiosService.remove(id);
    }
}
