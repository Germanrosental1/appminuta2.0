import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposPatioTerrazaService } from './tipospatioterraza.service';
import { CreateTipoPatioTerrazaDto, UpdateTipoPatioTerrazaDto } from './dto/create-tipopatioterraza.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('tipos-patio-terraza')
@UseGuards(SupabaseAuthGuard)
export class TiposPatioTerrazaController {
    constructor(private readonly service: TiposPatioTerrazaService) { }

    @Post()
    create(@Body() dto: CreateTipoPatioTerrazaDto) {
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
    update(@Param('id') id: string, @Body() dto: UpdateTipoPatioTerrazaDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
