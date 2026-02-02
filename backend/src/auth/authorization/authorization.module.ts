import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../../logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [AuthorizationService, ProjectAccessGuard, RolesGuard, GlobalPermissionsGuard],
  exports: [AuthorizationService, ProjectAccessGuard, RolesGuard, GlobalPermissionsGuard],
})
export class AuthorizationModule { }
