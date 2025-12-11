import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { MinutasService } from './minutas.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';
import { FindAllMinutasQueryDto } from './dto/find-all-minutas-query.dto';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('minutas')
@UseGuards(SupabaseAuthGuard)
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) { }

  @Post()
  create(@Body() createMinutaDto: CreateMinutaDto, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.minutasService.create(createMinutaDto, userId);
  }

  @Post('provisoria')
  createProvisoria(@Body() data: any, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.minutasService.createProvisoria(data, userId);
  }

  @Patch('provisoria/:id')
  updateProvisoria(@Param('id') id: string, @Body() data: any) {
    return this.minutasService.updateProvisoria(id, data);
  }

  @Post('generar')
  async generar(@Body() data: any, @Res() res: Response) {
    const { buffer, contentType } = await this.minutasService.generate(data);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  @Get()
  findAll(@Query() query: FindAllMinutasQueryDto) {
    return this.minutasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.minutasService.findOne(id, userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMinutaDto: UpdateMinutaDto, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    // Obtener rol del usuario desde la base de datos o JWT
    // Por ahora, pasar undefined hasta implementar sistema de roles (Fase 2)
    const userRole = undefined;
    return this.minutasService.update(id, updateMinutaDto, userId, userRole);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.minutasService.remove(id, userId);
  }
}
