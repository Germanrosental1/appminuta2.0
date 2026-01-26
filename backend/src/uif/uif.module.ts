import { Module } from '@nestjs/common';
import { UifClientsModule } from './clients/clients.module';
import { UifDocumentsModule } from './documents/documents.module';
import { UifAnalysesModule } from './analyses/analyses.module';

@Module({
    imports: [
        UifClientsModule,
        UifDocumentsModule,
        UifAnalysesModule,
    ],
    exports: [
        UifClientsModule,
        UifDocumentsModule,
        UifAnalysesModule,
    ],
})
export class UifModule { }
