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
import { UifDocumentsService } from './documents.service';
import { CreateUifDocumentDto } from './dto/create-document.dto';
import { UpdateUifDocumentDto, WebhookDocumentProcessedDto } from './dto/update-document.dto';
import { UifAuthGuard } from '../../common/guards/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { UifDocumentResponseDto } from './dto/document-response.dto';

@ApiTags('UIF / Documents')
@ApiBearerAuth('bearer')
@Controller('uif/documents')
@UseGuards(UifAuthGuard)
export class UifDocumentsController {
    constructor(private readonly documentsService: UifDocumentsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar documentos por cliente' })
    @ApiResponseWrapper(UifDocumentResponseDto, true)
    findByClient(@Query('client_id', ParseUUIDPipe) clientId: string) {
        return this.documentsService.findByClient(clientId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de documento' })
    @ApiResponseWrapper(UifDocumentResponseDto)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.documentsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Registrar nuevo documento' })
    @ApiCreatedResponseWrapper(UifDocumentResponseDto)
    create(@Body() dto: CreateUifDocumentDto, @CurrentUser() user: any) {
        return this.documentsService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar metadata de documento' })
    @ApiResponseWrapper(UifDocumentResponseDto)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifDocumentDto,
        @CurrentUser() user: any,
    ) {
        return this.documentsService.update(id, dto, user.sub || user.id, user.email);
    }

    @Post(':id/analyze')
    @ApiOperation({ summary: 'Solicitar análisis de documento (n8n)' })
    @ApiResponseWrapper(UifDocumentResponseDto)
    analyze(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('signedUrl') signedUrl: string,
        @CurrentUser() user: any,
    ) {
        return this.documentsService.analyze(id, signedUrl, user.sub || user.id, user.email);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.documentsService.remove(id, user.sub || user.id, user.email);
    }
}

/**
 * Controller separado para webhooks (sin autenticación JWT)
 * Usado por n8n para notificar documentos procesados
 */
@Controller('uif/webhooks')
export class UifWebhooksController {
    constructor(private readonly documentsService: UifDocumentsService) { }

    @Post('document-processed')
    async documentProcessed(@Body() dto: WebhookDocumentProcessedDto) {
        return this.documentsService.processWebhook(dto);
    }
}
