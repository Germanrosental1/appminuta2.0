import { Module } from '@nestjs/common';
import { MinutasService } from './minutas.service';
import { MinutasController } from './minutas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';
import { PrismaMinutasRepository } from './repositories/prisma-minutas.repository';
import { DocumentGenerationService } from './services/document-generation/document-generation.service';
import { N8nDocumentGenerator } from './services/document-generation/n8n-generator.service';

@Module({
  imports: [PrismaModule, UsuariosRolesModule],
  controllers: [MinutasController],
  providers: [
    MinutasService,
    PrismaMinutasRepository,
    DocumentGenerationService,
    N8nDocumentGenerator,
  ],
  exports: [MinutasService],
})
export class MinutasModule { }
