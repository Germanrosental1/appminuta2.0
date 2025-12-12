import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MinutasService } from './minutas.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('minutas')
@UseGuards(SupabaseAuthGuard, PermissionsGuard)
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) { }

  @Post()
  @Permissions('generarMinuta')
  create(@Body() createMinutaDto: CreateMinutaDto, @CurrentUser() user: any) {
    return this.minutasService.create(createMinutaDto, user.id);
  }

  @Post('provisoria')
  @Permissions('generarMinuta')
  createProvisoria(@Body() data: any, @CurrentUser() user: any) {
    return this.minutasService.createProvisoria(data, user.id);
  }

  @Patch('provisoria/:id')
  @Permissions('editarMinuta')
  updateProvisoria(@Param('id') id: string, @Body() data: any) {
    return this.minutasService.updateProvisoria(id, data);
  }

  @Post('generar')
  @Permissions('generarMinuta')
  async generar(@Body() data: any, @Res() res: Response) {
    const { buffer, contentType } = await this.minutasService.generate(data);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  @Get()
  findAll(@Query() query: FindAllMinutasQueryDto) {
    // Ver minutas no requiere permisos específicos - todos los roles pueden ver
    return this.minutasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Ver minuta no requiere permisos específicos - todos los roles pueden ver
    return this.minutasService.findOne(id, user.id);
  }

  @Patch(':id')
  @Permissions('editarMinuta', 'aprobarRechazarMinuta')
  async update(@Param('id') id: string, @Body() updateMinutaDto: UpdateMinutaDto, @CurrentUser() user: any) {
    // El servicio manejará la lógica de qué puede hacer cada rol
    // editarMinuta: puede editar campos generales
    // aprobarRechazarMinuta: puede cambiar estado a Definitiva/Rechazada
    return this.minutasService.update(id, updateMinutaDto, user.id);
  }

  @Delete(':id')
  @Permissions('editarMinuta')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.minutasService.remove(id, user.id);
  }
}
