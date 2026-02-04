import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MinutasService } from './minutas.service';
import { MinutasController } from './minutas.controller';
import { MinutasGateway } from './minutas.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../shared/iam/usuarios-roles/usuarios-roles.module';
import { AuthorizationModule } from '../auth/authorization/authorization.module';
import { PrismaMinutasRepository } from './repositories/prisma-minutas.repository';
import { DocumentGenerationService } from './services/document-generation/document-generation.service';
import { N8nDocumentGenerator } from './services/document-generation/n8n-generator.service';
import { UnitStateService } from './services/unit-state.service';
import { MinutasStateService } from './services/minutas-state.service';
import { MinutasQueryService } from './services/minutas-query.service';
import { MinutasCommandService } from './services/minutas-command.service';
import { MinutasPermissionsService } from './services/minutas-permissions.service';
import { LoggerModule } from '../logger/logger.module';
import { PermissionsCacheModule } from '../shared/iam/services/permissions-cache.module';

@Module({
  imports: [
    PrismaModule,
    UsuariosRolesModule,
    AuthorizationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET,
    }),
    LoggerModule,
    PermissionsCacheModule,
  ],
  controllers: [MinutasController],
  providers: [
    MinutasService,
    MinutasGateway,
    PrismaMinutasRepository,
    DocumentGenerationService,
    N8nDocumentGenerator,
    UnitStateService,
    MinutasStateService,
    MinutasQueryService,
    MinutasCommandService,
    MinutasPermissionsService,
  ],
  exports: [
    MinutasService,
    MinutasGateway,
    UnitStateService,
    MinutasStateService,
    MinutasQueryService,
    MinutasCommandService,
    MinutasPermissionsService,
  ],
})
export class MinutasModule { }
