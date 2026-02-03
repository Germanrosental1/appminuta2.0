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
    UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../../common/decorators/api-response-wrapper.decorator';
import { CatalogResponseDto } from '../../../common/dto/catalog-response.dto';
import { GlobalPermissionsGuard } from '../../../common/guards/global-permissions.guard';
import { Permissions } from '../../../auth/decorators/permissions.decorator';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación y autorización
 * Requiere el permiso 'gestionarRoles' para todas las operaciones
 */
@ApiTags('IAM / Roles')
@ApiBearerAuth('bearer')
@Controller('roles')
@UseGuards(SupabaseAuthGuard, GlobalPermissionsGuard)
@Permissions('gestionarRoles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @ApiOperation({ summary: 'Crear rol' })
    @ApiCreatedResponseWrapper(CatalogResponseDto)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar roles' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un rol' })
    @ApiResponseWrapper(CatalogResponseDto)
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar rol' })
    @ApiResponseWrapper(CatalogResponseDto)
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    @Get(':id/permisos')
    @ApiOperation({ summary: 'Obtener permisos de un rol' })
    @ApiResponseWrapper(CatalogResponseDto, true)
    getPermissions(@Param('id') id: string) {
        return this.rolesService.getPermissions(id);
    }

    @Post(':id/permisos')
    @ApiOperation({ summary: 'Asignar permiso a rol' })
    @ApiResponseWrapper(CatalogResponseDto)
    @HttpCode(HttpStatus.CREATED)
    assignPermission(
        @Param('id') id: string,
        @Body() assignPermissionDto: AssignPermissionDto,
    ) {
        return this.rolesService.assignPermission(id, assignPermissionDto.idpermiso);
    }

    @Delete(':id/permisos/:permisoId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removePermission(
        @Param('id') id: string,
        @Param('permisoId') permisoId: string,
    ) {
        return this.rolesService.removePermission(id, permisoId);
    }
}
