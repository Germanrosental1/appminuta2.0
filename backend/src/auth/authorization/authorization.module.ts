import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ProjectAccessGuard } from './project-access.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuthorizationService, ProjectAccessGuard, RolesGuard, PermissionsGuard],
  exports: [AuthorizationService, ProjectAccessGuard, RolesGuard, PermissionsGuard],
})
export class AuthorizationModule { }
