import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator para especificar roles requeridos en un endpoint
 * Ejemplo: @Roles('admin', 'editor')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
