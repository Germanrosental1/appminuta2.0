import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SnapshotsService } from './snapshots.service';

@Injectable()
export class SnapshotsCronService {
    private readonly logger = new Logger(SnapshotsCronService.name);

    constructor(private readonly snapshotsService: SnapshotsService) { }

    /**
     * Cron job that runs every day at midnight (00:00)
     * Generates a DIARIO snapshot
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        name: 'daily-stock-snapshot',
        timeZone: 'America/Argentina/Buenos_Aires', // Ajustar según tu zona horaria
    })
    async handleDailySnapshot() {
        this.logger.log('Starting daily stock snapshot generation...');
        const start = Date.now();

        try {
            const result = await this.snapshotsService.generateSnapshot('DIARIO');
            const duration = Date.now() - start;

            this.logger.log(
                `Daily snapshot completed: ${result.proyectosProcessados} projects processed in ${duration}ms`,
            );

            // Alert if > 5 minutes (300000ms)
            if (duration > 300000) {
                this.logger.warn(`PERFORMANCE ALERT: Daily snapshot took longer than 5 minutes (${(duration / 1000).toFixed(2)}s)`);
            }
        } catch (error: unknown) {
            this.logger.error(`Daily snapshot failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
        }
    }

    /**
     * Cron job that runs on the last day of each month at 23:55
     * Generates a MENSUAL snapshot for end-of-month reports
     */
    @Cron('55 23 28-31 * *', {
        name: 'monthly-stock-snapshot',
        timeZone: 'America/Argentina/Buenos_Aires',
    })
    async handleMonthlySnapshot() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Only run if tomorrow is the 1st (meaning today is the last day of the month)
        if (tomorrow.getDate() !== 1) {
            return;
        }

        this.logger.log('Starting monthly stock snapshot generation...');
        const start = Date.now();

        try {
            const result = await this.snapshotsService.generateSnapshot('MENSUAL');
            const duration = Date.now() - start;

            this.logger.log(
                `Monthly snapshot completed: ${result.proyectosProcessados} projects processed in ${duration}ms`,
            );

            // Alert if > 5 minutes
            if (duration > 300000) {
                this.logger.warn(`PERFORMANCE ALERT: Monthly snapshot took longer than 5 minutes (${(duration / 1000).toFixed(2)}s)`);
            }
        } catch (error: unknown) {
            this.logger.error(`Monthly snapshot failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
        }
    }

}
