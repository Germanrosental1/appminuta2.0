import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO genérico para entidades de catálogo simples (Id, Nombre)
 * Utilizado por múltiples módulos para estandarizar respuestas
 */
export class CatalogResponseDto {
    @ApiProperty({
        description: 'ID único de la entidad (UUID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    Id: string;

    @ApiProperty({
        description: 'Nombre descriptivo',
        example: 'Ejemplo de Item',
    })
    Nombre: string;

    @ApiProperty({
        description: 'ID del proyecto asociado (opcional)',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        required: false,
    })
    ProyectoId?: string;

    @ApiProperty({
        description: 'Fecha de creación',
        example: '2026-02-02T10:30:00.000Z',
        required: false,
    })
    CreatedAt?: Date;

    @ApiProperty({
        description: 'Fecha de última actualización',
        required: false,
    })
    UpdatedAt?: Date;
}
