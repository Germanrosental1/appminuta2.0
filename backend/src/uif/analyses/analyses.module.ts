import { Module } from '@nestjs/common';
import { UifAnalysesController } from './analyses.controller';
import { UifAnalysesService } from './analyses.service';
import { LoggerModule } from '../../logger/logger.module';

@Module({
    imports: [LoggerModule],
    controllers: [UifAnalysesController],
    providers: [UifAnalysesService],
    exports: [UifAnalysesService],
})
export class UifAnalysesModule { }
