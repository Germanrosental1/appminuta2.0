import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposPatioTerrazaService } from './tipospatioterraza.service';
import { CreateTipoPatioTerrazaDto, UpdateTipoPatioTerrazaDto } from './dto/create-tipopatioterraza.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Tipos Patio Terraza')
@ApiBearerAuth('bearer')
@Controller('tipos-patio-terraza')
@UseGuards(SupabaseAuthGuard)
export class TiposPatioTerrazaController {
    constructor(private readonly service: TiposPatioTerrazaService) { }

    @Post()
    @ApiOperation({ summary: 'Crear tipo de patio/terraza' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() dto: CreateTipoPatioTerrazaDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar tipos de patio/terraza' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de patio/terraza' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar tipo de patio/terraza' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() dto: UpdateTipoPatioTerrazaDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
