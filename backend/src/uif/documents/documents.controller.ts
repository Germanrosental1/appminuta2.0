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
import { UifAuthGuard } from '../../auth/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('uif/documents')
@UseGuards(UifAuthGuard)
export class UifDocumentsController {
    constructor(private readonly documentsService: UifDocumentsService) { }

    @Get()
    findByClient(@Query('client_id', ParseUUIDPipe) clientId: string) {
        return this.documentsService.findByClient(clientId);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.documentsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateUifDocumentDto, @CurrentUser() user: any) {
        return this.documentsService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifDocumentDto,
        @CurrentUser() user: any,
    ) {
        return this.documentsService.update(id, dto, user.sub || user.id, user.email);
    }

    @Post(':id/analyze')
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
