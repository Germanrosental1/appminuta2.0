import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsCronService } from './snapshots-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SnapshotsController],
    providers: [SnapshotsService, SnapshotsCronService],
    exports: [SnapshotsService],
})
export class SnapshotsModule { }
