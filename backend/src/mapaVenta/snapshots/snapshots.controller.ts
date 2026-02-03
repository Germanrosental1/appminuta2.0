import { Controller, Post, Get, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard, Roles, AuthorizationService } from '../../auth/authorization';
import { GenerateSnapshotDto, GetSnapshotByDateDto, GetSnapshotRangeDto, GetComparativoDto } from './dto/snapshots.dto';
import { ApiResponseWrapper, ApiCreatedResponseWrapper } from '../../common/decorators/api-response-wrapper.decorator';
import { SnapshotResponseDto, SnapshotComparativoResponseDto } from './dto/snapshot-response.dto';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';

// Roles que pueden ver datos financieros sensibles
const FINANCIAL_DATA_ROLES = new Set(['superadminmv', 'adminmv']);

@ApiTags('Snapshots & Estadísticas')
@ApiBearerAuth('bearer')
@Controller('snapshots')
@UseGuards(SupabaseAuthGuard)
export class SnapshotsController {
    constructor(
        private readonly snapshotsService: SnapshotsService,
        private readonly authorizationService: AuthorizationService,
    ) { }

    /**
     * Helper para verificar si el usuario puede ver datos financieros
     */
    private async canViewFinancialData(userId: string): Promise<boolean> {
        // Obtener roles del usuario en cualquier proyecto o org
        const userInfo = await this.authorizationService.getUserAccessInfo(userId);

        if (!userInfo) return false;

        // Verificar roles globales
        const globalRoles = userInfo.UsuariosRoles?.map(ur => ur.Roles?.Nombre) || [];
        if (globalRoles.some(role => role && FINANCIAL_DATA_ROLES.has(role))) {
            return true;
        }

        // Verificar roles en proyectos
        const projectRoles = userInfo.UsuariosProyectos?.map(up => up.Roles?.Nombre) || [];
        return projectRoles.some(role => role && FINANCIAL_DATA_ROLES.has(role));
    }

    /**
     * Helper para filtrar datos sensibles de snapshots
     */
    private filterSensitiveData(snapshots: any[], canViewFinancial: boolean): any[] {
        if (canViewFinancial) return snapshots;

        return snapshots.map(snap => {
            const { ValorStockUSD, M2TotalesStock, ...safeData } = snap;
            return safeData;
        });
    }

    /**
     * Generate a snapshot manually
     * POST /snapshots/generate?tipo=DIARIO|MENSUAL
     * 
     * SECURITY:
     * - Requires authentication (SupabaseAuthGuard)
     * - Requires admin role (RolesGuard + @Roles)
     * - Rate limited to 1 request per minute
     * - Validates tipo parameter
     */
    @Post('generate')
    @UseGuards(RolesGuard)
    @Roles('superadminmv', 'adminmv')
    @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
    @ApiOperation({ summary: 'Generar snapshot manualmente' })
    @ApiCreatedResponseWrapper(SuccessResponseDto)
    async generateSnapshot(@Query() query: GenerateSnapshotDto) {
        // Validate tipo
        const validTipos = ['DIARIO', 'MENSUAL'];
        const tipo = query.tipo || 'DIARIO';
        if (!validTipos.includes(tipo)) {
            throw new BadRequestException('tipo debe ser DIARIO o MENSUAL');
        }
        return this.snapshotsService.generateSnapshot(tipo);
    }

    /**
     * Get snapshot for a specific date
     * GET /snapshots?fecha=2026-01-23
     * 
     * SECURITY:
     * - Requires authentication
     * - Validates date format
     * - Rate limited
     * - Filters ValorStockUSD for non-admin users
     */
    @Get()
    @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
    @ApiOperation({ summary: 'Obtener snapshot por fecha' })
    @ApiResponseWrapper(SnapshotResponseDto, true)
    async getSnapshot(@Query() query: GetSnapshotByDateDto, @Request() req: any) {
        if (!query.fecha) {
            throw new BadRequestException('El parámetro fecha es requerido');
        }

        const fecha = new Date(query.fecha);
        if (Number.isNaN(fecha.getTime())) {
            throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
        }

        fecha.setHours(0, 0, 0, 0);
        const snapshots = await this.snapshotsService.getSnapshotByDate(fecha);

        // Filter sensitive data based on user role
        const userId = req.user?.sub || req.user?.id;
        const canViewFinancial = userId ? await this.canViewFinancialData(userId) : false;
        return this.filterSensitiveData(snapshots, canViewFinancial);
    }

    /**
     * Get snapshots in a date range
     * GET /snapshots/range?desde=2026-01-01&hasta=2026-01-31
     * 
     * SECURITY:
     * - Requires authentication
     * - Validates date format
     * - Rate limited
     * - Paginated (max 100 records)
     * - Filters ValorStockUSD for non-admin users
     */
    @Get('range')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Obtener rango de snapshots' })
    @ApiResponseWrapper(SnapshotResponseDto, true) // Ideally should be paginated if it returns result object
    async getSnapshotsRange(
        @Query() query: GetSnapshotRangeDto,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        if (!query.desde || !query.hasta) {
            throw new BadRequestException('Los parámetros desde y hasta son requeridos');
        }

        const desde = new Date(query.desde);
        const hasta = new Date(query.hasta);

        if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
            throw new BadRequestException('Fechas inválidas. Use formato YYYY-MM-DD');
        }

        if (desde > hasta) {
            throw new BadRequestException('La fecha "desde" debe ser anterior a "hasta"');
        }

        desde.setHours(0, 0, 0, 0);
        hasta.setHours(0, 0, 0, 0);

        // Pagination with defaults
        const pageNum = Math.max(1, Number.parseInt(page || '1', 10) || 1);
        const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit || '100', 10) || 100));

        const result = await this.snapshotsService.getSnapshotsInRange(desde, hasta, pageNum, limitNum);

        // Filter sensitive data based on user role
        const userId = req?.user?.sub || req?.user?.id;
        const canViewFinancial = userId ? await this.canViewFinancialData(userId) : false;

        return {
            ...result,
            data: this.filterSensitiveData(result.data, canViewFinancial),
        };
    }

    /**
     * Get comparison between two dates (typically month-end snapshots)
     * GET /snapshots/comparativo?mesActual=2026-01-31&mesAnterior=2025-12-31
     * 
     * SECURITY:
     * - Requires authentication
     * - Validates date format
     * - Rate limited
     * - Filters valorStock for non-admin users
     */
    @Get('comparativo')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Obtener comparativo entre fechas' })
    @ApiResponseWrapper(SnapshotComparativoResponseDto, true)
    async getComparativo(@Query() query: GetComparativoDto, @Request() req: any) {
        if (!query.mesActual || !query.mesAnterior) {
            throw new BadRequestException('Los parámetros mesActual y mesAnterior son requeridos');
        }

        const mesActual = new Date(query.mesActual);
        const mesAnterior = new Date(query.mesAnterior);

        if (Number.isNaN(mesActual.getTime()) || Number.isNaN(mesAnterior.getTime())) {
            throw new BadRequestException('Fechas inválidas. Use formato YYYY-MM-DD');
        }

        mesActual.setHours(0, 0, 0, 0);
        mesAnterior.setHours(0, 0, 0, 0);

        const result = await this.snapshotsService.getComparativo(mesActual, mesAnterior);

        // Filter sensitive data based on user role
        const userId = req.user?.sub || req.user?.id;
        const canViewFinancial = userId ? await this.canViewFinancialData(userId) : false;

        if (canViewFinancial) {
            return result;
        }

        // Remove valorStock from comparativo for non-admins
        return result.map(item => ({
            ...item,
            actual: { ...item.actual, valorStock: null },
            anterior: item.anterior ? { ...item.anterior, valorStock: null } : null,
        }));
    }
}
