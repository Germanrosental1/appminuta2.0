import { Module } from '@nestjs/common';
import { UifClientsController } from './clients.controller';
import { UifClientsService } from './clients.service';
import { LoggerModule } from '../../logger/logger.module';

@Module({
    imports: [LoggerModule],
    controllers: [UifClientsController],
    providers: [UifClientsService],
    exports: [UifClientsService],
})
export class UifClientsModule { }
