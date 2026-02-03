import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { EdificiosService } from './edificios.service';
import { CreateEdificioDto } from './dto/create-edificio.dto';
import { UpdateEdificioDto } from './dto/update-edificio.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Edificios')
@ApiBearerAuth('bearer')
@Controller('edificios')
@UseGuards(SupabaseAuthGuard)
export class EdificiosController {
    constructor(private readonly edificiosService: EdificiosService) { }

    @Post()
    @ApiOperation({ summary: 'Crear edificio' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createEdificioDto: CreateEdificioDto) {
        return this.edificiosService.create(createEdificioDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar edificios' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll(@Query('proyectoId') proyectoId?: string) {
        return this.edificiosService.findAll(proyectoId);
    }

    @Get('proyecto/:id')
    @ApiOperation({ summary: 'Listar edificios por proyecto' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findByProyecto(@Param('id') id: string) {
        return this.edificiosService.findAll(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un edificio' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.edificiosService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar edificio' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateEdificioDto: UpdateEdificioDto) {
        return this.edificiosService.update(id, updateEdificioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.edificiosService.remove(id);
    }
}
