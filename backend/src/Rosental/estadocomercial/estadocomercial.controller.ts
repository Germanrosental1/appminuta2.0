import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EstadoComercialService } from './estadocomercial.service';
import { CreateEstadoComercialDto } from './dto/create-estadocomercial.dto';
import { UpdateEstadoComercialDto } from './dto/update-estadocomercial.dto';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('estado-comercial')
@UseGuards(SupabaseAuthGuard)
export class EstadoComercialController {
    constructor(private readonly estadoComercialService: EstadoComercialService) { }

    @Post()
    create(@Body() createEstadoComercialDto: CreateEstadoComercialDto) {
        return this.estadoComercialService.create(createEstadoComercialDto);
    }

    @Get()
    findAll() {
        return this.estadoComercialService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.estadoComercialService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEstadoComercialDto: UpdateEstadoComercialDto) {
        return this.estadoComercialService.update(id, updateEstadoComercialDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.estadoComercialService.remove(id);
    }
}
