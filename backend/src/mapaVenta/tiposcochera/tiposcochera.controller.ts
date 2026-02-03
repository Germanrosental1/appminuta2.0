import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposCocheraService } from './tiposcochera.service';
import { CreateTipoCocheraDto, UpdateTipoCocheraDto } from './dto/create-tipocochera.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Tipos Cochera')
@ApiBearerAuth('bearer')
@Controller('tipos-cochera')
@UseGuards(SupabaseAuthGuard)
export class TiposCocheraController {
    constructor(private readonly service: TiposCocheraService) { }

    @Post()
    @ApiOperation({ summary: 'Crear tipo de cochera' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() dto: CreateTipoCocheraDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar tipos de cochera' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de cochera' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar tipo de cochera' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() dto: UpdateTipoCocheraDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
