import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Query,
    ForbiddenException,
} from '@nestjs/common';
import { UsuariosRolesService } from '../usuarios-roles/usuarios-roles.service';
import { UsuariosProyectosService } from '../usuarios-proyectos/usuarios-proyectos.service';
import { AssignRoleDto } from '../usuarios-roles/dto/assign-role.dto';
import { AssignUserToProjectDto } from '../usuarios-proyectos/dto/assign-user-to-project.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';


@Controller('usuarios')
export class UsuariosController {
    constructor(
        private readonly usuariosRolesService: UsuariosRolesService,
        private readonly usuariosProyectosService: UsuariosProyectosService,
    ) { }

    @Get('me/roles')
    @UseGuards(SupabaseAuthGuard)
    getMyRoles(@CurrentUser() user: any) {
        // Supabase JWT 'sub' claim is the user ID
        const userId = user.sub || user.id;
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        return this.usuariosRolesService.getUserRoles(userId);
    }

    @Get('me/check-role')
    @UseGuards(SupabaseAuthGuard)
    async checkRole(@CurrentUser() user: any, @Query('role') role: string) {
        // Supabase JWT 'sub' claim is the user ID
        const userId = user.sub || user.id;
        if (!userId) {
            throw new Error('User ID not found');
        }

        const roles = await this.usuariosRolesService.getUserRoles(userId);
        const hasRole = roles.some(r => r.nombre === role);
        return { hasRole };
    }

    @Post(':id/roles')
    @UseGuards(SupabaseAuthGuard, PermissionsGuard)
    @Permissions('gestionarRoles') // Solo administradores
    @HttpCode(HttpStatus.CREATED)
    assignRole(
        @Param('id') id: string,
        @Body() assignRoleDto: AssignRoleDto,
        @CurrentUser() user: any
    ) {
        // 🔒 SEGURIDAD: Prevenir auto-asignación de roles
        if (id === user.id || id === user.sub) {
            throw new ForbiddenException(
                'No puedes modificar tus propios roles. Contacta a otro administrador.'
            );
        }
        return this.usuariosRolesService.assignRole(id, assignRoleDto.idrol);
    }

    @Delete(':id/roles/:roleId')
    @UseGuards(SupabaseAuthGuard, PermissionsGuard)
    @Permissions('gestionarRoles') // Solo administradores
    @HttpCode(HttpStatus.NO_CONTENT)
    removeRole(
        @Param('id') id: string,
        @Param('roleId') roleId: string,
        @CurrentUser() user: any
    ) {
        // 🔒 SEGURIDAD: Prevenir auto-remoción de roles
        if (id === user.id || id === user.sub) {
            throw new ForbiddenException(
                'No puedes modificar tus propios roles. Contacta a otro administrador.'
            );
        }
        return this.usuariosRolesService.removeRole(id, roleId);
    }

    @Get(':id/permisos')
    @UseGuards(SupabaseAuthGuard)
    getUserPermissions(@Param('id') id: string, @CurrentUser() user: any) {
        // 🔒 SEGURIDAD: Solo puede ver sus propios permisos (a menos que sea admin)
        if (id !== user.id && id !== user.sub) {
            // Verificar si tiene permiso de gestión de usuarios
            // Por ahora, solo permitir ver propios permisos
            throw new ForbiddenException(
                'Solo puedes ver tus propios permisos.'
            );
        }
        return this.usuariosRolesService.getUserPermissions(id);
    }

    // Gestión de proyectos
    @Get(':id/proyectos')
    getUserProjects(@Param('id') id: string) {
        return this.usuariosProyectosService.getUserProjects(id);
    }

    @Post(':id/proyectos')
    @HttpCode(HttpStatus.CREATED)
    assignUserToProject(
        @Param('id') id: string,
        @Body() assignUserToProjectDto: AssignUserToProjectDto,
    ) {
        return this.usuariosProyectosService.assignUserToProject(
            id,
            assignUserToProjectDto.idproyecto,
            assignUserToProjectDto.idrol,
        );
    }

    @Delete(':id/proyectos/:projectId/roles/:roleId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeUserFromProject(
        @Param('id') id: string,
        @Param('projectId') projectId: string,
        @Param('roleId') roleId: string,
    ) {
        return this.usuariosProyectosService.removeUserFromProject(
            id,
            projectId,
            roleId,
        );
    }
}
