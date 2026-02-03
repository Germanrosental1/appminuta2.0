import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { NaturalezasService } from './naturalezas.service';
import { CreateNaturalezaDto } from './dto/create-naturaleza.dto';
import { UpdateNaturalezaDto } from './dto/update-naturaleza.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Naturalezas')
@ApiBearerAuth('bearer')
@Controller('naturalezas')
@UseGuards(SupabaseAuthGuard)
export class NaturalezasController {
    constructor(private readonly naturalezasService: NaturalezasService) { }

    @Post()
    @ApiOperation({ summary: 'Crear naturaleza' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createNaturalezaDto: CreateNaturalezaDto) {
        return this.naturalezasService.create(createNaturalezaDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar naturalezas' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.naturalezasService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una naturaleza' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.naturalezasService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar naturaleza' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateNaturalezaDto: UpdateNaturalezaDto) {
        return this.naturalezasService.update(id, updateNaturalezaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.naturalezasService.remove(id);
    }
}
