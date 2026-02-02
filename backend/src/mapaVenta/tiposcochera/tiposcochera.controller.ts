import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposCocheraService } from './tiposcochera.service';
import { CreateTipoCocheraDto, UpdateTipoCocheraDto } from './dto/create-tipocochera.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('tipos-cochera')
@UseGuards(SupabaseAuthGuard)
export class TiposCocheraController {
    constructor(private readonly service: TiposCocheraService) { }

    @Post()
    create(@Body() dto: CreateTipoCocheraDto) {
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
    update(@Param('id') id: string, @Body() dto: UpdateTipoCocheraDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
