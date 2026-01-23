import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('snapshots')
@UseGuards(SupabaseAuthGuard)
export class SnapshotsController {
    constructor(private readonly snapshotsService: SnapshotsService) { }

    /**
     * Generate a snapshot manually
     * POST /snapshots/generate?tipo=DIARIO|MENSUAL
     */
    @Post('generate')
    async generateSnapshot(@Query('tipo') tipo?: 'DIARIO' | 'MENSUAL') {
        return this.snapshotsService.generateSnapshot(tipo || 'DIARIO');
    }

    /**
     * Get snapshot for a specific date
     * GET /snapshots?fecha=2026-01-23
     */
    @Get()
    async getSnapshot(@Query('fecha') fechaStr: string) {
        const fecha = new Date(fechaStr);
        fecha.setHours(0, 0, 0, 0);
        return this.snapshotsService.getSnapshotByDate(fecha);
    }

    /**
     * Get snapshots in a date range
     * GET /snapshots/range?desde=2026-01-01&hasta=2026-01-31
     */
    @Get('range')
    async getSnapshotsRange(
        @Query('desde') desdeStr: string,
        @Query('hasta') hastaStr: string,
    ) {
        const desde = new Date(desdeStr);
        const hasta = new Date(hastaStr);
        desde.setHours(0, 0, 0, 0);
        hasta.setHours(0, 0, 0, 0);
        return this.snapshotsService.getSnapshotsInRange(desde, hasta);
    }

    /**
     * Get comparison between two dates (typically month-end snapshots)
     * GET /snapshots/comparativo?mesActual=2026-01-31&mesAnterior=2025-12-31
     */
    @Get('comparativo')
    async getComparativo(
        @Query('mesActual') mesActualStr: string,
        @Query('mesAnterior') mesAnteriorStr: string,
    ) {
        const mesActual = new Date(mesActualStr);
        const mesAnterior = new Date(mesAnteriorStr);
        mesActual.setHours(0, 0, 0, 0);
        mesAnterior.setHours(0, 0, 0, 0);
        return this.snapshotsService.getComparativo(mesActual, mesAnterior);
    }
}
