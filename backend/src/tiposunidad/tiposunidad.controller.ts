import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposUnidadService } from './tiposunidad.service';
import { CreateTipoUnidadDto, UpdateTipoUnidadDto } from './dto/create-tipounidad.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('tipos-unidad')
@UseGuards(SupabaseAuthGuard)
export class TiposUnidadController {
    constructor(private readonly service: TiposUnidadService) { }

    @Post()
    create(@Body() dto: CreateTipoUnidadDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTipoUnidadDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
