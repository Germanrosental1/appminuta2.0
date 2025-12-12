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
} from '@nestjs/common';
import { UsuariosRolesService } from '../usuarios-roles/usuarios-roles.service';
import { UsuariosProyectosService } from '../usuarios-proyectos/usuarios-proyectos.service';
import { AssignRoleDto } from '../usuarios-roles/dto/assign-role.dto';
import { AssignUserToProjectDto } from '../usuarios-proyectos/dto/assign-user-to-project.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('usuarios')
export class UsuariosController {
    constructor(
        private readonly usuariosRolesService: UsuariosRolesService,
        private readonly usuariosProyectosService: UsuariosProyectosService,
    ) { }

    // Gestión de roles
    @Get('me/roles')
    @UseGuards(SupabaseAuthGuard)
    getMyRoles(@CurrentUser() user: any) {
        console.log('GET /usuarios/me/roles called');
        try {
            console.log('User payload:', user);
            // Supabase JWT 'sub' claim is the user ID
            const userId = user.sub || user.id;
            if (!userId) {
                console.error('User ID not found in JWT payload. Payload keys:', Object.keys(user));
                throw new Error('User ID not found in token');
            }
            return this.usuariosRolesService.getUserRoles(userId);
        } catch (error) {
            console.error('Error in getMyRoles controller:', error);
            throw error;
        }
    }

    @Get('me/check-role')
    @UseGuards(SupabaseAuthGuard)
    async checkRole(@CurrentUser() user: any, @Query('role') role: string) {
        console.log(`GET /usuarios/me/check-role called for role: ${role}`);
        try {
            // Supabase JWT 'sub' claim is the user ID
            const userId = user.sub || user.id;
            if (!userId) {
                console.error('User ID not found in JWT during checkRole');
                throw new Error('User ID not found');
            }

            const roles = await this.usuariosRolesService.getUserRoles(userId);
            const hasRole = roles.some(r => r.nombre === role);
            console.log(`checkRole result for ${userId} / ${role}: ${hasRole}`);
            return { hasRole };
        } catch (error) {
            console.error('Error in checkRole controller:', error);
            throw error;
        }
    }

    @Post(':id/roles')
    @HttpCode(HttpStatus.CREATED)
    assignRole(@Param('id') id: string, @Body() assignRoleDto: AssignRoleDto) {
        return this.usuariosRolesService.assignRole(id, assignRoleDto.idrol);
    }

    @Delete(':id/roles/:roleId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
        return this.usuariosRolesService.removeRole(id, roleId);
    }

    @Get(':id/permisos')
    getUserPermissions(@Param('id') id: string) {
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
