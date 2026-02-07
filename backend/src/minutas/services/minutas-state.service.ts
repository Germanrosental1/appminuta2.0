import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UnitStateService } from './unit-state.service';
import { ROLE_PERMISSIONS } from '../../auth/authorization/roles.constants';

/**
 * Valid state transitions for minutas (all lowercase)
 */
export const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
    'pendiente': ['aprobada', 'cancelada', 'en_edicion'],
    'aprobada': ['firmada', 'cancelada', 'en_edicion'],
    'en_edicion': ['pendiente'],
    'firmada': [], // Final state
    'cancelada': [], // Final state
    // Legacy states for backwards compatibility
    'provisoria': ['en revisión', 'pendiente', 'rechazada'],
    'en revisión': ['definitiva', 'aprobada', 'provisoria', 'rechazada'],
    'definitiva': [],
    'rechazada': ['provisoria', 'pendiente'],
};

/**
 * Normalize state to lowercase for consistent comparisons
 */
export function normalizeEstado(estado: string): string {
    return estado?.toLowerCase().trim() || '';
}

/**
 * Service responsible for minuta state machine logic:
 * - State transitions validation
 * - Approval permissions validation
 * - Unit effects on state changes (release on cancellation)
 */
@Injectable()
export class MinutasStateService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly unitStateService: UnitStateService,
    ) { }

    /**
     * Validate and execute a state transition
     * @throws BadRequestException if transition is invalid
     * @throws ForbiddenException if user lacks permission
     */
    async handleStateChange(
        minuta: { Estado: string; Dato?: unknown },
        newState: string,
        comments: string | undefined,
        userRoleInProject: string | undefined,
        isGlobalAdmin: boolean
    ): Promise<void> {
        // 1. Validate transition
        this.validateStateTransition(minuta.Estado, newState, comments);

        // 2. Validate approval permissions
        this.validateApprovalPermissions(newState, userRoleInProject, isGlobalAdmin);

        // 3. Handle unit effects
        await this.handleUnitEffects(minuta, newState);
    }

    /**
     * Validate that a state transition is allowed
     * @throws BadRequestException if transition is invalid or comments required
     */
    validateStateTransition(currentState: string, newState: string, comments?: string): void {
        const estadoActual = normalizeEstado(currentState);
        const estadoNuevo = normalizeEstado(newState);

        const validTransitions = VALID_STATE_TRANSITIONS[estadoActual];
        if (!validTransitions) {
            throw new BadRequestException(`Estado actual '${currentState}' no es válido`);
        }

        if (!validTransitions.includes(estadoNuevo)) {
            throw new BadRequestException(
                `Transición de estado inválida: '${currentState}' → '${newState}'. Transiciones válidas: ${validTransitions.join(', ')}`
            );
        }

        // Require comments for cancelada and rechazada
        if (['cancelada', 'rechazada'].includes(estadoNuevo)) {
            if (!comments || comments.trim() === '') {
                const accion = estadoNuevo === 'cancelada' ? 'cancelación' : 'rechazo';
                throw new BadRequestException(`El motivo de ${accion} es obligatorio para fines de auditoría.`);
            }

            // Minimum length validation
            if (comments.trim().length < 10) {
                throw new BadRequestException(
                    'El motivo debe tener al menos 10 caracteres para ser descriptivo.'
                );
            }
        }
    }

    /**
     * Validate approval permissions for specific state changes
     * @throws ForbiddenException if user lacks permission
     */
    validateApprovalPermissions(
        newState: string,
        userRoleInProject: string | undefined,
        isGlobalAdmin: boolean
    ): void {
        if (['Definitiva'].includes(newState)) {
            if (!isGlobalAdmin) {
                const permissionsInProject = userRoleInProject
                    ? (ROLE_PERMISSIONS[userRoleInProject] || [])
                    : [];
                if (!permissionsInProject.includes('aprobarRechazarMinuta')) {
                    throw new ForbiddenException('No tienes permiso para aprobar minutas en este proyecto.');
                }
            }
        }
    }

    /**
     * Handle side effects on units when state changes
     * - Releases units when minuta is cancelled
     */
    async handleUnitEffects(
        minuta: { Dato?: unknown },
        newState: string
    ): Promise<void> {
        const estadoNuevo = normalizeEstado(newState);
        const minutaData = minuta.Dato as { unidades?: { id: string }[] };
        const unidadIds = minutaData?.unidades?.map((u) => u.id).filter(Boolean) || [];

        if (unidadIds.length > 0 && estadoNuevo === 'cancelada') {
            await this.unitStateService.liberarUnidades(unidadIds);

            // Parallel updates for performance
            const updateOperations = unidadIds.map(unidadId =>
                this.prisma.detallesVenta.updateMany({
                    where: { UnidadId: unidadId },
                    data: { ClienteInteresado: null },
                })
            );
            await Promise.all(updateOperations);
        }
    }

    /**
     * Check if a state is final (no more transitions allowed)
     */
    isFinalState(state: string): boolean {
        const normalized = normalizeEstado(state);
        return VALID_STATE_TRANSITIONS[normalized]?.length === 0;
    }

    /**
     * Get valid next states from current state
     */
    getValidTransitions(currentState: string): string[] {
        const normalized = normalizeEstado(currentState);
        return VALID_STATE_TRANSITIONS[normalized] || [];
    }
}
