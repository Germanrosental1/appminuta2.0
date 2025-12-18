import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MinutasService } from './minutas.service';
import { MinutasController } from './minutas.controller';
import { MinutasGateway } from './minutas.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';
import { PrismaMinutasRepository } from './repositories/prisma-minutas.repository';
import { DocumentGenerationService } from './services/document-generation/document-generation.service';
import { N8nDocumentGenerator } from './services/document-generation/n8n-generator.service';
import { UnitStateService } from './services/unit-state.service';

@Module({
  imports: [
    PrismaModule,
    UsuariosRolesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET,
    }),
  ],
  controllers: [MinutasController],
  providers: [
    MinutasService,
    MinutasGateway,
    PrismaMinutasRepository,
    DocumentGenerationService,
    N8nDocumentGenerator,
    UnitStateService,
  ],
  exports: [MinutasService, MinutasGateway, UnitStateService],
})
export class MinutasModule { }

