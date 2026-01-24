import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsCronService } from './snapshots-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthorizationModule } from '../../auth/authorization/authorization.module';

@Module({
    imports: [PrismaModule, AuthorizationModule],
    controllers: [SnapshotsController],
    providers: [SnapshotsService, SnapshotsCronService],
    exports: [SnapshotsService],
})
export class SnapshotsModule { }
