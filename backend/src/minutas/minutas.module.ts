import { Module } from '@nestjs/common';
import { MinutasService } from './minutas.service';
import { MinutasController } from './minutas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';

@Module({
  imports: [PrismaModule, UsuariosRolesModule],
  controllers: [MinutasController],
  providers: [MinutasService],
})
export class MinutasModule { }
