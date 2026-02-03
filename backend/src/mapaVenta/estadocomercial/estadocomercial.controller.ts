import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EstadoComercialService } from './estadocomercial.service';
import { CreateEstadoComercialDto } from './dto/create-estadocomercial.dto';
import { UpdateEstadoComercialDto } from './dto/update-estadocomercial.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Estados Comerciales')
@ApiBearerAuth('bearer')
@Controller('estado-comercial')
@UseGuards(SupabaseAuthGuard)
export class EstadoComercialController {
    constructor(private readonly estadoComercialService: EstadoComercialService) { }

    @Post()
    @ApiOperation({ summary: 'Crear estado comercial' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createEstadoComercialDto: CreateEstadoComercialDto) {
        return this.estadoComercialService.create(createEstadoComercialDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar estados comerciales' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.estadoComercialService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un estado comercial' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.estadoComercialService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar estado comercial' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateEstadoComercialDto: UpdateEstadoComercialDto) {
        return this.estadoComercialService.update(id, updateEstadoComercialDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.estadoComercialService.remove(id);
    }
}
