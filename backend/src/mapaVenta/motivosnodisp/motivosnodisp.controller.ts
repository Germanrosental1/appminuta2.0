import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MotivosNodispService } from './motivosnodisp.service';
import { CreateMotivoNodispDto } from './dto/create-motivonodisp.dto';
import { UpdateMotivoNodispDto } from './dto/update-motivonodisp.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Motivos No Disponibilidad')
@ApiBearerAuth('bearer')
@Controller('motivos-nodisp')
@UseGuards(SupabaseAuthGuard)
export class MotivosNodispController {
    constructor(private readonly motivosNodispService: MotivosNodispService) { }

    @Post()
    @ApiOperation({ summary: 'Crear motivo de no disponibilidad' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createMotivoNodispDto: CreateMotivoNodispDto) {
        return this.motivosNodispService.create(createMotivoNodispDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar motivos de no disponibilidad' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.motivosNodispService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un motivo de no disponibilidad' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.motivosNodispService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar motivo de no disponibilidad' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateMotivoNodispDto: UpdateMotivoNodispDto) {
        return this.motivosNodispService.update(id, updateMotivoNodispDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.motivosNodispService.remove(id);
    }
}
