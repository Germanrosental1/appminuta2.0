import { Controller, Get, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { GastosgeneralesService } from './gastosgenerales.service';
import { UpdateGastosGeneralesDto } from './dto/update-gastos-generales.dto';

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
