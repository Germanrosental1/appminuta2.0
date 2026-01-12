import { Controller, Get, Patch, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { GastosgeneralesService } from './gastosgenerales.service';
import { UpdateGastosGeneralesDto } from './dto/update-gastos-generales.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

// @UseGuards(SupabaseAuthGuard) // Comentado temporalmente si no hay auth configurada
@Controller('gastosgenerales')
export class GastosgeneralesController {
    constructor(private readonly gastosService: GastosgeneralesService) { }

    @Get('proyecto/:id')
    async findByProject(@Param('id', ParseUUIDPipe) id: string) {
        return this.gastosService.findByProject(id);
    }

    @Patch('proyecto/:id')
    async updateByProject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateGastosGeneralesDto
    ) {
        return this.gastosService.updateByProject(id, updateDto);
    }
}
