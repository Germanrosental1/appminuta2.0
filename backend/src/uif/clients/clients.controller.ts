import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { UifClientsService } from './clients.service';
import { CreateUifClientDto } from './dto/create-client.dto';
import { UpdateUifClientDto } from './dto/update-client.dto';
import { UifAuthGuard } from '../../common/guards/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { UifClientResponseDto } from './dto/client-response.dto';

@ApiTags('UIF / Clients')
@ApiBearerAuth('bearer')
@Controller('uif/clients')
@UseGuards(UifAuthGuard)
export class UifClientsController {
    constructor(private readonly clientsService: UifClientsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar clientes UIF' })
    @ApiResponseWrapper(UifClientResponseDto, true)
    findAll() {
        return this.clientsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de cliente UIF' })
    @ApiResponseWrapper(UifClientResponseDto)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.clientsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear cliente UIF' })
    @ApiCreatedResponseWrapper(UifClientResponseDto)
    create(@Body() dto: CreateUifClientDto, @CurrentUser() user: any) {
        return this.clientsService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar cliente UIF' })
    @ApiResponseWrapper(UifClientResponseDto)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifClientDto,
        @CurrentUser() user: any,
    ) {
        return this.clientsService.update(id, dto, user.sub || user.id, user.email);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.clientsService.remove(id, user.sub || user.id, user.email);
    }
}
