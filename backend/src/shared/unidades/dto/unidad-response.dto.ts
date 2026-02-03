import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para una Unidad
 *
 * Representa el payload de datos dentro de ApiResponse<UnidadResponseDto>
 */
export class UnidadResponseDto {
  @ApiProperty({
    description: 'ID único de la unidad',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  Id: string;

  @ApiProperty({
    description: 'Identificador de la unidad (ej: Depto 301, Casa 15)',
    example: 'Depto 301'
  })
  Identificador: string;

  @ApiProperty({
    description: 'Nombre del proyecto',
    example: 'Edificio Vista Mar'
  })
  Proyecto: string;

  @ApiProperty({
    description: 'Etapa del proyecto',
    example: 'Torre A',
    nullable: true
  })
  Etapa: string | null;

  @ApiProperty({
    description: 'Tipo de unidad',
    example: 'Departamento',
    nullable: true
  })
  Tipo: string | null;

  @ApiProperty({
    description: 'Sector dentro del proyecto',
    example: 'Norte',
    nullable: true
  })
  Sector: string | null;

  @ApiProperty({
    description: 'Piso de la unidad',
    example: 3,
    nullable: true
  })
  Piso: number | null;

  @ApiProperty({
    description: 'Número de dormitorios',
    example: 2,
    nullable: true
  })
  Dormitorios: number | null;

  @ApiProperty({
    description: 'Número de baños',
    example: 2,
    nullable: true
  })
  Banos: number | null;

  @ApiProperty({
    description: 'Superficie total en m2',
    example: 75.5,
    type: 'number',
    nullable: true
  })
  SuperficieTotal: number | null;

  @ApiProperty({
    description: 'Superficie útil en m2',
    example: 65.5,
    type: 'number',
    nullable: true
  })
  SuperficieUtil: number | null;

  @ApiProperty({
    description: 'Precio total de lista',
    example: 120000000,
    type: 'number',
    nullable: true
  })
  PrecioTotal: number | null;

  @ApiProperty({
    description: 'Orientación de la unidad',
    example: 'Norte',
    nullable: true
  })
  Orientacion: string | null;

  @ApiProperty({
    description: 'Estado de disponibilidad',
    enum: ['Disponible', 'Reservada', 'Vendida', 'Bloqueada'],
    example: 'Disponible'
  })
  Estado: string;

  @ApiProperty({
    description: 'Naturaleza de la unidad',
    example: 'Vivienda',
    nullable: true
  })
  Naturaleza: string | null;

  @ApiProperty({
    description: 'Número de estacionamientos incluidos',
    example: 1,
    nullable: true
  })
  Estacionamientos: number | null;

  @ApiProperty({
    description: 'Número de bodegas incluidas',
    example: 1,
    nullable: true
  })
  Bodegas: number | null;

  @ApiProperty({
    description: 'Observaciones adicionales',
    example: 'Vista al mar, piso alto',
    nullable: true
  })
  Observaciones: string | null;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-15T10:00:00.000Z'
  })
  CreatedAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-02-02T14:30:00.000Z'
  })
  UpdatedAt: Date;
}

/**
 * DTO ligero para listados de unidades
 * Usado en tablas y selects, sin toda la información
 */
export class UnidadListItemDto {
  @ApiProperty({ description: 'ID de la unidad' })
  Id: string;

  @ApiProperty({ description: 'Identificador' })
  Identificador: string;

  @ApiProperty({ description: 'Proyecto' })
  Proyecto: string;

  @ApiProperty({ description: 'Tipo' })
  Tipo: string | null;

  @ApiProperty({ description: 'Estado' })
  Estado: string;

  @ApiProperty({ description: 'Precio total', type: 'number' })
  PrecioTotal: number | null;

  @ApiProperty({ description: 'Superficie total m2', type: 'number' })
  SuperficieTotal: number | null;

  @ApiProperty({ description: 'Dormitorios' })
  Dormitorios: number | null;

  @ApiProperty({ description: 'Baños' })
  Banos: number | null;
}

/**
 * DTO para metadata de unidades
 * Usado en endpoints de filtros dinámicos
 */
export class UnidadMetadataDto {
  @ApiProperty({ description: 'Naturalezas disponibles', type: [String] })
  naturalezas: string[];

  @ApiProperty({ description: 'Tipos disponibles', type: [String] })
  tipos: string[];

  @ApiProperty({ description: 'Proyectos', type: [String] })
  proyectos: string[];

  @ApiProperty({ description: 'Estados', type: [String] })
  estados: string[];
}
