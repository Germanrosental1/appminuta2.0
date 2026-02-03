import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { UifAnalysesService } from './analyses.service';
import { CreateUifAnalysisDto, UpdateUifAnalysisDto } from './dto/analysis.dto';
import { UifAuthGuard } from '../../common/guards/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { UifAnalysisResponseDto } from './dto/analysis-response.dto';

@ApiTags('UIF / Analyses')
@ApiBearerAuth('bearer')
@Controller('uif/analyses')
@UseGuards(UifAuthGuard)
export class UifAnalysesController {
    constructor(private readonly analysesService: UifAnalysesService) { }

    @Get()
    @ApiOperation({ summary: 'Listar análisis por cliente' })
    @ApiResponseWrapper(UifAnalysisResponseDto, true)
    findByClient(@Query('client_id', ParseUUIDPipe) clientId: string) {
        return this.analysesService.findByClient(clientId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de análisis' })
    @ApiResponseWrapper(UifAnalysisResponseDto)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.analysesService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear nuevo análisis' })
    @ApiCreatedResponseWrapper(UifAnalysisResponseDto)
    create(@Body() dto: CreateUifAnalysisDto, @CurrentUser() user: any) {
        return this.analysesService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar análisis' })
    @ApiResponseWrapper(UifAnalysisResponseDto)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifAnalysisDto,
        @CurrentUser() user: any,
    ) {
        return this.analysesService.update(id, dto, user.sub || user.id, user.email);
    }

    @Post(':id/finalize')
    @ApiOperation({ summary: 'Finalizar análisis' })
    @ApiResponseWrapper(UifAnalysisResponseDto)
    finalize(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.analysesService.finalize(id, user.sub || user.id, user.email);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.analysesService.remove(id, user.sub || user.id, user.email);
    }
}
