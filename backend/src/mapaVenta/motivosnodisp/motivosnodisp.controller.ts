import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MotivosNodispService } from './motivosnodisp.service';
import { CreateMotivoNodispDto } from './dto/create-motivonodisp.dto';
import { UpdateMotivoNodispDto } from './dto/update-motivonodisp.dto';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('motivos-nodisp')
@UseGuards(SupabaseAuthGuard)
export class MotivosNodispController {
    constructor(private readonly motivosNodispService: MotivosNodispService) { }

    @Post()
    create(@Body() createMotivoNodispDto: CreateMotivoNodispDto) {
        return this.motivosNodispService.create(createMotivoNodispDto);
    }

    @Get()
    findAll() {
        return this.motivosNodispService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.motivosNodispService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateMotivoNodispDto: UpdateMotivoNodispDto) {
        return this.motivosNodispService.update(id, updateMotivoNodispDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.motivosNodispService.remove(id);
    }
}
