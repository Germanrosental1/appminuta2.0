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

@Controller('permisos')
export class PermisosController {
    constructor(private readonly permisosService: PermisosService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createPermisoDto: CreatePermisoDto) {
        return this.permisosService.create(createPermisoDto);
    }

    @Get()
    findAll() {
        return this.permisosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.permisosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePermisoDto: UpdatePermisoDto) {
        return this.permisosService.update(id, updatePermisoDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.permisosService.remove(id);
    }
}
