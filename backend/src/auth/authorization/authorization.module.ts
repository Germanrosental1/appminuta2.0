import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ProjectAccessGuard } from './project-access.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [AuthorizationService, ProjectAccessGuard, RolesGuard, PermissionsGuard],
  exports: [AuthorizationService, ProjectAccessGuard, RolesGuard, PermissionsGuard],
})
export class AuthorizationModule { }
