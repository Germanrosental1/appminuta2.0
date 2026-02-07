import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';
import { AuthorizationService, RolesGuard } from '../../auth/authorization';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { BadRequestException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('SnapshotsController', () => {
    let controller: SnapshotsController;

    const mockSnapshotsService = {
        generateSnapshot: jest.fn(),
        getSnapshotByDate: jest.fn(),
        getSnapshotsInRange: jest.fn(),
        getComparativo: jest.fn(),
    };

    const mockAuthorizationService = {
        getUserAccessInfo: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SnapshotsController],
            providers: [
                {
                    provide: SnapshotsService,
                    useValue: mockSnapshotsService,
                },
                {
                    provide: AuthorizationService,
                    useValue: mockAuthorizationService,
                },
            ],
        })
            .overrideGuard(SupabaseAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(ThrottlerGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SnapshotsController>(SnapshotsController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('generateSnapshot', () => {
        it('should generate a snapshot successfully', async () => {
            const query = { tipo: 'DIARIO' as const };
            const expectedResult = { success: true, id: '123' };
            mockSnapshotsService.generateSnapshot.mockResolvedValue(expectedResult);

            const result = await controller.generateSnapshot(query);

            expect(result).toBe(expectedResult);
            expect(mockSnapshotsService.generateSnapshot).toHaveBeenCalledWith('DIARIO');
        });

        it('should throw BadRequestException if tipo is invalid', async () => {
            const query = { tipo: 'INVALID' as any };

            await expect(controller.generateSnapshot(query)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should default to DIARIO if tipo is not provided', async () => {
            const query = { tipo: undefined };
            const expectedResult = { success: true };
            mockSnapshotsService.generateSnapshot.mockResolvedValue(expectedResult);

            await controller.generateSnapshot(query as any);

            expect(mockSnapshotsService.generateSnapshot).toHaveBeenCalledWith('DIARIO');
        });
    });

    describe('getSnapshotsRange (Filtering)', () => {
        const mockUser = { user: { id: 'user-1' } };

        it('should return filtered snapshots within range', async () => {
            const query = {
                desde: '2026-01-01',
                hasta: '2026-01-31',
            };
            const mockData = {
                data: [
                    { Id: '1', FechaSnapshot: new Date('2026-01-15') },
                ],
                pagination: { total: 1, page: 1, limit: 100 },
            };

            mockSnapshotsService.getSnapshotsInRange.mockResolvedValue(mockData);
            mockAuthorizationService.getUserAccessInfo.mockResolvedValue({
                UsuariosRoles: [],
                UsuariosProyectos: []
            });

            const result = await controller.getSnapshotsRange(query, undefined, undefined, mockUser);

            expect(mockSnapshotsService.getSnapshotsInRange).toHaveBeenCalledWith(
                expect.any(Date),
                expect.any(Date),
                1,
                100
            );
            // Verify date conversion
            const callArgs = mockSnapshotsService.getSnapshotsInRange.mock.calls[0];
            const expectedDesde = new Date('2026-01-01');
            expectedDesde.setHours(0, 0, 0, 0);
            const expectedHasta = new Date('2026-01-31');
            expectedHasta.setHours(0, 0, 0, 0);

            expect(callArgs[0]).toEqual(expectedDesde);
            expect(callArgs[1]).toEqual(expectedHasta);
            expect(result.data).toHaveLength(1);
        });

        it('should throw error if dates are missing', async () => {
            await expect(controller.getSnapshotsRange({ desde: '', hasta: '' }, undefined, undefined, mockUser))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error if dates are invalid', async () => {
            await expect(controller.getSnapshotsRange({ desde: 'invalid', hasta: '2026-01-01' }, undefined, undefined, mockUser))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error if start date is after end date', async () => {
            await expect(controller.getSnapshotsRange({ desde: '2026-02-01', hasta: '2026-01-01' }, undefined, undefined, mockUser))
                .rejects.toThrow(BadRequestException);
        });

        it('should filter sensitive financial data for non-admin users', async () => {
            const query = { desde: '2026-01-01', hasta: '2026-01-31' };
            const sensitiveData = {
                data: [{
                    Id: '1',
                    ValorStockUSD: 100000,
                    M2TotalesStock: 500,
                    Disponibles: 10
                }],
                pagination: { total: 1 }
            };

            mockSnapshotsService.getSnapshotsInRange.mockResolvedValue(sensitiveData);
            mockAuthorizationService.getUserAccessInfo.mockResolvedValue({
                UsuariosRoles: [{ Roles: { Nombre: 'vendedor' } }] // Not admin
            });

            const result = await controller.getSnapshotsRange(query, undefined, undefined, mockUser);

            expect(result.data[0]).not.toHaveProperty('ValorStockUSD');
            expect(result.data[0]).not.toHaveProperty('M2TotalesStock');
            expect(result.data[0]).toHaveProperty('Disponibles');
        });

        it('should return financial data for superadmin users', async () => {
            const query = { desde: '2026-01-01', hasta: '2026-01-31' };
            const sensitiveData = {
                data: [{
                    Id: '1',
                    ValorStockUSD: 100000,
                    M2TotalesStock: 500
                }],
                pagination: { total: 1 }
            };

            mockSnapshotsService.getSnapshotsInRange.mockResolvedValue(sensitiveData);
            mockAuthorizationService.getUserAccessInfo.mockResolvedValue({
                UsuariosRoles: [{ Roles: { Nombre: 'superadminmv' } }]
            });

            const result = await controller.getSnapshotsRange(query, undefined, undefined, mockUser);

            expect(result.data[0]).toHaveProperty('ValorStockUSD');
        });
    });
});
