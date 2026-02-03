import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../../common/dto/catalog-response.dto';

@ApiTags('IAM / Permisos')
@ApiBearerAuth('bearer')
@Controller('permisos')
export class PermisosController {
    constructor(private readonly permisosService: PermisosService) { }

    @Post()
    @ApiOperation({ summary: 'Crear permiso' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createPermisoDto: CreatePermisoDto) {
        return this.permisosService.create(createPermisoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar permisos' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.permisosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un permiso' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.permisosService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar permiso' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updatePermisoDto: UpdatePermisoDto) {
        return this.permisosService.update(id, updatePermisoDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.permisosService.remove(id);
    }
}
