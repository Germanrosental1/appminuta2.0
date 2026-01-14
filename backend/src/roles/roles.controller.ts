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
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

/**
 * 🔒 SEGURIDAD: Controller protegido con autenticación y autorización
 * Requiere el permiso 'gestionarRoles' para todas las operaciones
 */
@Controller('roles')
@UseGuards(SupabaseAuthGuard, PermissionsGuard)
@Permissions('gestionarRoles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Get()
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    @Get(':id/permisos')
    getPermissions(@Param('id') id: string) {
        return this.rolesService.getPermissions(id);
    }

    @Post(':id/permisos')
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
