import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EtapasService } from './etapas.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Etapas')
@ApiBearerAuth('bearer')
@Controller('etapas')
@UseGuards(SupabaseAuthGuard)
export class EtapasController {
    constructor(private readonly etapasService: EtapasService) { }

    @Post()
    @ApiOperation({ summary: 'Crear etapa' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createEtapaDto: CreateEtapaDto) {
        return this.etapasService.create(createEtapaDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar etapas' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.etapasService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una etapa' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.etapasService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar etapa' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateEtapaDto: UpdateEtapaDto) {
        return this.etapasService.update(id, updateEtapaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.etapasService.remove(id);
    }
}
