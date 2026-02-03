import { Controller, Get, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { GastosgeneralesService } from './gastosgenerales.service';
import { UpdateGastosGeneralesDto } from './dto/update-gastos-generales.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { GastosGeneralesResponseDto } from './dto/gastos-generales-response.dto';

@ApiTags('Gastos Generales')
@ApiBearerAuth('bearer')
@Controller('gastosgenerales')
export class GastosgeneralesController {
    constructor(private readonly gastosService: GastosgeneralesService) { }

    @Get('proyecto/:id')
    @ApiOperation({ summary: 'Obtener gastos generales por proyecto' })
    @ApiResponseWrapper(GastosGeneralesResponseDto)
    async findByProject(@Param('id', ParseUUIDPipe) id: string) {
        return this.gastosService.findByProject(id);
    }

    @Patch('proyecto/:id')
    @ApiOperation({ summary: 'Actualizar gastos generales por proyecto' })
    @ApiResponseWrapper(GastosGeneralesResponseDto)
    async updateByProject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateGastosGeneralesDto
    ) {
        return this.gastosService.updateByProject(id, updateDto);
    }
}
