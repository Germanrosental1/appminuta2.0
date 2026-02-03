import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposUnidadService } from './tiposunidad.service';
import { CreateTipoUnidadDto, UpdateTipoUnidadDto } from './dto/create-tipounidad.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Tipos Unidad')
@ApiBearerAuth('bearer')
@Controller('tipos-unidad')
@UseGuards(SupabaseAuthGuard)
export class TiposUnidadController {
    constructor(private readonly service: TiposUnidadService) { }

    @Post()
    @ApiOperation({ summary: 'Crear tipo de unidad' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() dto: CreateTipoUnidadDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los tipos de unidad' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.service.findAll();
    }

    @Get('proyecto/:id')
    @ApiOperation({ summary: 'Listar tipos de unidad por proyecto' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findByProyect(@Param('id') id: string) {
        return this.service.findByProyect(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de unidad' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar tipo de unidad' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() dto: UpdateTipoUnidadDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
