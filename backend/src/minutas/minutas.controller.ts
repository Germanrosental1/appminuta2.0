import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { MinutasService } from './minutas.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 🔒 5 requests per minute (más restrictivo)
  create(@Body() createMinutaDto: CreateMinutaDto, @CurrentUser() user: any) {
    return this.minutasService.create(createMinutaDto, user.id);
  }

  @Post('provisoria')
  @Permissions('generarMinuta')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 🔒 5 requests per minute
  createProvisoria(@Body() data: CreateMinutaProvisoriaDto, @CurrentUser() user: any) {
    return this.minutasService.createProvisoria(data, user.id);
  }

  @Patch('provisoria/:id')
  @Permissions('editarMinuta')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  updateProvisoria(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateMinutaDto) {
    return this.minutasService.updateProvisoria(id, data);
  }

  @Post('generar')
  @Permissions('generarMinuta')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute (resource intensive)
  async generar(@Body() data: any, @Res() res: Response) {
    const { buffer, contentType } = await this.minutasService.generate(data);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  @Get()
  @Permissions('verMinutas') // Requiere permiso específico
  findAll(@Query() query: FindAllMinutasQueryDto, @CurrentUser() user: any) {
    // Filtrar minutas por proyectos asignados al usuario
    return this.minutasService.findAll(query, user.id);
  }

  @Get(':id')
  @Permissions('verMinutas') // Requiere permiso específico
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    // Validar acceso a la minuta (propiedad o acceso a proyecto)
    return this.minutasService.findOne(id, user.id);
  }

  @Patch(':id')
  @Permissions('editarMinuta', 'aprobarRechazarMinuta')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateMinutaDto: UpdateMinutaDto, @CurrentUser() user: any) {
    // El servicio manejará la lógica de qué puede hacer cada rol
    // editarMinuta: puede editar campos generales
    // aprobarRechazarMinuta: puede cambiar estado a Definitiva/Rechazada
    return this.minutasService.update(id, updateMinutaDto, user.id, user.role);
  }

  @Delete(':id')
  @Permissions('editarMinuta')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.minutasService.remove(id, user.id);
  }
}
