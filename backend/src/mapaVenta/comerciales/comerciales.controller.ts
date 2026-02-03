import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ComercialesService } from './comerciales.service';
import { CreateComercialDto } from './dto/create-comercial.dto';
import { UpdateComercialDto } from './dto/update-comercial.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../common/dto/catalog-response.dto';

@ApiTags('Catálogos / Comerciales')
@ApiBearerAuth('bearer')
@Controller('comerciales')
@UseGuards(SupabaseAuthGuard)
export class ComercialesController {
    constructor(private readonly comercialesService: ComercialesService) { }

    @Post()
    @ApiOperation({ summary: 'Crear comercial' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    create(@Body() createComercialDto: CreateComercialDto) {
        return this.comercialesService.create(createComercialDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar comerciales' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.comercialesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un comercial' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.comercialesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar comercial' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateComercialDto: UpdateComercialDto) {
        return this.comercialesService.update(id, updateComercialDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.comercialesService.remove(id);
    }
}
