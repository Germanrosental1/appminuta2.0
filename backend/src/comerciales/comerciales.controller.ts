import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ComercialesService } from './comerciales.service';
import { CreateComercialDto } from './dto/create-comercial.dto';
import { UpdateComercialDto } from './dto/update-comercial.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('comerciales')
@UseGuards(SupabaseAuthGuard)
export class ComercialesController {
    constructor(private readonly comercialesService: ComercialesService) { }

    @Post()
    create(@Body() createComercialDto: CreateComercialDto) {
        return this.comercialesService.create(createComercialDto);
    }

    @Get()
    findAll() {
        return this.comercialesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.comercialesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateComercialDto: UpdateComercialDto) {
        return this.comercialesService.update(id, updateComercialDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.comercialesService.remove(id);
    }
}
