import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MinutasService } from './minutas.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('minutas')
@UseGuards(SupabaseAuthGuard)
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) { }

  @Post()
  create(@Body() createMinutaDto: CreateMinutaDto) {
    return this.minutasService.create(createMinutaDto);
  }

  @Post('provisoria')
  createProvisoria(@Body() data: any) {
    return this.minutasService.createProvisoria(data);
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
  findAll(@Query() query: any) {
    return this.minutasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.minutasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMinutaDto: UpdateMinutaDto) {
    return this.minutasService.update(id, updateMinutaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.minutasService.remove(id);
  }
}
