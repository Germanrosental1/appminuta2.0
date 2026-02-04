import { Test, TestingModule } from '@nestjs/testing';
import { MinutasStateService, normalizeEstado } from './minutas-state.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UnitStateService } from './unit-state.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('MinutasStateService', () => {
    let service: MinutasStateService;
    let prismaService: jest.Mocked<PrismaService>;
    let unitStateService: jest.Mocked<UnitStateService>;

    const mockPrismaService = {
        detallesVenta: {
            updateMany: jest.fn(),
        },
    };

    const mockUnitStateService = {
        liberarUnidades: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MinutasStateService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: UnitStateService, useValue: mockUnitStateService },
            ],
        }).compile();

        service = module.get<MinutasStateService>(MinutasStateService);
        jest.clearAllMocks();
    });

    describe('normalizeEstado', () => {
        it('should convert to lowercase and trim', () => {
            expect(normalizeEstado('PENDIENTE')).toBe('pendiente');
            expect(normalizeEstado('  Aprobada  ')).toBe('aprobada');
        });

        it('should handle null/undefined', () => {
            expect(normalizeEstado(undefined as any)).toBe('');
            expect(normalizeEstado(null as any)).toBe('');
        });
    });

    describe('validateStateTransition', () => {
        it('should allow valid transition: pendiente -> aprobada', () => {
            expect(() => service.validateStateTransition('pendiente', 'aprobada')).not.toThrow();
        });

        it('should allow valid transition: aprobada -> firmada', () => {
            expect(() => service.validateStateTransition('aprobada', 'firmada')).not.toThrow();
        });

        it('should reject invalid transition: pendiente -> firmada', () => {
            expect(() => service.validateStateTransition('pendiente', 'firmada'))
                .toThrow(BadRequestException);
        });

        it('should reject transition from final state', () => {
            expect(() => service.validateStateTransition('firmada', 'aprobada'))
                .toThrow(BadRequestException);
        });

        it('should require comments for cancelada state', () => {
            expect(() => service.validateStateTransition('pendiente', 'cancelada'))
                .toThrow(BadRequestException);
            expect(() => service.validateStateTransition('pendiente', 'cancelada', ''))
                .toThrow(BadRequestException);
        });

        it('should require comments for rechazada state', () => {
            expect(() => service.validateStateTransition('provisoria', 'rechazada'))
                .toThrow(BadRequestException);
        });

        it('should require minimum 10 characters for cancelada comments', () => {
            expect(() => service.validateStateTransition('pendiente', 'cancelada', 'short'))
                .toThrow(BadRequestException);
        });

        it('should accept valid cancelada with proper comments', () => {
            expect(() => service.validateStateTransition('pendiente', 'cancelada', 'Este es un motivo válido de cancelación'))
                .not.toThrow();
        });

        it('should handle case insensitivity', () => {
            expect(() => service.validateStateTransition('PENDIENTE', 'APROBADA')).not.toThrow();
        });
    });

    describe('validateApprovalPermissions', () => {
        it('should allow global admin to approve', () => {
            expect(() => service.validateApprovalPermissions('Definitiva', undefined, true))
                .not.toThrow();
        });

        it('should reject non-admin without proper role', () => {
            expect(() => service.validateApprovalPermissions('Definitiva', 'vendedor', false))
                .toThrow(ForbiddenException);
        });

        // Note: Currently no role in ROLE_PERMISSIONS has 'aprobarRechazarMinuta'
        // Only global admins can approve minutas, so this test is not applicable
    });

    describe('handleUnitEffects', () => {
        it('should release units when state changes to cancelada', async () => {
            const minuta = {
                Dato: {
                    unidades: [{ id: 'unit-1' }, { id: 'unit-2' }],
                },
            };

            mockUnitStateService.liberarUnidades.mockResolvedValue(undefined);
            mockPrismaService.detallesVenta.updateMany.mockResolvedValue({ count: 1 });

            await service.handleUnitEffects(minuta, 'cancelada');

            expect(mockUnitStateService.liberarUnidades).toHaveBeenCalledWith(['unit-1', 'unit-2']);
            expect(mockPrismaService.detallesVenta.updateMany).toHaveBeenCalledTimes(2);
        });

        it('should not release units for other state changes', async () => {
            const minuta = {
                Dato: {
                    unidades: [{ id: 'unit-1' }],
                },
            };

            await service.handleUnitEffects(minuta, 'aprobada');

            expect(mockUnitStateService.liberarUnidades).not.toHaveBeenCalled();
        });

        it('should handle minuta without units', async () => {
            const minuta = { Dato: {} };

            await service.handleUnitEffects(minuta, 'cancelada');

            expect(mockUnitStateService.liberarUnidades).not.toHaveBeenCalled();
        });
    });

    describe('isFinalState', () => {
        it('should return true for firmada', () => {
            expect(service.isFinalState('firmada')).toBe(true);
        });

        it('should return true for cancelada', () => {
            expect(service.isFinalState('cancelada')).toBe(true);
        });

        it('should return false for pendiente', () => {
            expect(service.isFinalState('pendiente')).toBe(false);
        });
    });

    describe('getValidTransitions', () => {
        it('should return valid transitions for pendiente', () => {
            const transitions = service.getValidTransitions('pendiente');
            expect(transitions).toContain('aprobada');
            expect(transitions).toContain('cancelada');
        });

        it('should return empty array for final states', () => {
            expect(service.getValidTransitions('firmada')).toEqual([]);
        });
    });
});
