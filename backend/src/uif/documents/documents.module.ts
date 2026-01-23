import { Module } from '@nestjs/common';
import { UifDocumentsController, UifWebhooksController } from './documents.controller';
import { UifDocumentsService } from './documents.service';
import { LoggerModule } from '../../logger/logger.module';

@Module({
    imports: [LoggerModule],
    controllers: [UifDocumentsController, UifWebhooksController],
    providers: [UifDocumentsService],
    exports: [UifDocumentsService],
})
export class UifDocumentsModule { }
