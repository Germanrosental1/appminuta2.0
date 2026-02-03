import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { MinutasService } from './minutas.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { CreateMinutaProvisoriaDto } from './dto/create-minuta-provisoria.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';
import { MinutaResponseDto, MinutaListItemDto } from './dto/minuta-response.dto';

import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../common/guards/global-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiResponseWrapper,
  ApiCreatedResponseWrapper,
  ApiPaginatedResponseWrapper,
} from '../common/decorators/api-response-wrapper.decorator';

@ApiTags('Minutas')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'No autorizado - Token JWT inválido o ausente' })
@ApiForbiddenResponse({ description: 'Prohibido - No tiene los permisos necesarios' })
@ApiTooManyRequestsResponse({ description: 'Demasiadas solicitudes - Límite de rate limit excedido' })
@Controller('minutas')
@UseGuards(SupabaseAuthGuard, GlobalPermissionsGuard)
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) { }

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva minuta definitiva',
    description: 'Genera una minuta en estado definitivo. Requiere permiso `generarMinuta`.',
  })
  @ApiCreatedResponseWrapper(MinutaResponseDto)
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @Permissions('generarMinuta')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 🔒 5 requests per minute
  create(@Body() createMinutaDto: CreateMinutaDto, @CurrentUser() user: any) {
    return this.minutasService.create(createMinutaDto, user.id);
  }

  @Post('provisoria')
  @ApiOperation({
    summary: 'Crear una minuta provisoria',
    description: 'Genera un borrador de minuta (wizard). Requiere permiso `generarMinuta`.',
  })
  @ApiCreatedResponseWrapper(MinutaResponseDto)
  @Permissions('generarMinuta')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createProvisoria(@Body() data: CreateMinutaProvisoriaDto, @CurrentUser() user: any) {
    return this.minutasService.createProvisoria(data, user.id);
  }

  @Patch('provisoria/:id')
  @ApiOperation({
    summary: 'Actualizar una minuta provisoria',
    description: 'Actualiza los datos de un borrador existente.',
  })
  @ApiResponseWrapper(MinutaResponseDto)
  @ApiNotFoundResponse({ description: 'Minuta no encontrada' })
  @Permissions('editarMinuta')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  updateProvisoria(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateMinutaDto) {
    return this.minutasService.updateProvisoria(id, data);
  }

  @Post('generar')
  @ApiOperation({
    summary: 'Generar documento PDF',
    description: 'Genera y devuelve el PDF de la minuta basada en los datos proporcionados.',
  })
  @ApiOkResponse({ description: 'Archivo PDF generado con éxito', content: { 'application/pdf': {} } })
  @Permissions('generarMinuta')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async generar(@Body() data: any, @Res() res: Response) {
    const { buffer, contentType } = await this.minutasService.generate(data);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas las minutas',
    description: 'Obtiene un listado paginado de minutas filtrado por permisos de proyecto.',
  })
  @ApiPaginatedResponseWrapper(MinutaListItemDto)
  @Permissions('verMinutas')
  findAll(@Query() query: FindAllMinutasQueryDto, @CurrentUser() user: any) {
    return this.minutasService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de una minuta',
    description: 'Obtiene todos los datos de una minuta específica por UUID.',
  })
  @ApiResponseWrapper(MinutaResponseDto)
  @ApiNotFoundResponse({ description: 'Minuta no encontrada' })
  @Permissions('verMinutas')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.minutasService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar minuta',
    description: 'Actualiza datos generales o cambia el estado (Aprobar/Rechazar).',
  })
  @ApiResponseWrapper(MinutaResponseDto)
  @ApiNotFoundResponse({ description: 'Minuta no encontrada' })
  @Permissions('editarMinuta', 'aprobarRechazarMinuta')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateMinutaDto: UpdateMinutaDto, @CurrentUser() user: any) {
    return this.minutasService.update(id, updateMinutaDto, user.id, user.role);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar minuta',
    description: 'Elimina lógicamente una minuta del sistema.',
  })
  @ApiOkResponse({ description: 'Minuta eliminada con éxito' })
  @Permissions('editarMinuta')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.minutasService.remove(id, user.id);
  }
}
