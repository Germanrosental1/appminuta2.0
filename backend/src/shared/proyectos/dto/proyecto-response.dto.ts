import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para un Proyecto
 */
export class ProyectoResponseDto {
  @ApiProperty({
    description: 'ID único del proyecto',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del proyecto',
    example: 'Edificio Vista Mar'
  })
  Nombre: string;

  @ApiProperty({
    description: 'Descripción del proyecto',
    example: 'Proyecto residencial de lujo con vista al mar',
    nullable: true
  })
  Descripcion: string | null;

  @ApiProperty({
    description: 'Dirección del proyecto',
    example: 'Av. del Mar 1234, Viña del Mar',
    nullable: true
  })
  Direccion: string | null;

  @ApiProperty({
    description: 'Ciudad del proyecto',
    example: 'Viña del Mar',
    nullable: true
  })
  Ciudad: string | null;

  @ApiProperty({
    description: 'Región del proyecto',
    example: 'Valparaíso',
    nullable: true
  })
  Region: string | null;

  @ApiProperty({
    description: 'Estado del proyecto',
    enum: ['En Planificación', 'En Construcción', 'En Venta', 'Finalizado'],
    example: 'En Venta'
  })
  Estado: string;

  @ApiProperty({
    description: 'Fecha estimada de entrega',
    example: '2027-06-30',
    nullable: true
  })
  FechaEntrega: Date | null;

  @ApiProperty({
    description: 'Total de unidades del proyecto',
    example: 120,
    nullable: true
  })
  TotalUnidades: number | null;

  @ApiProperty({
    description: 'Unidades disponibles',
    example: 45,
    nullable: true
  })
  UnidadesDisponibles: number | null;

  @ApiProperty({
    description: 'URL de la imagen del proyecto',
    example: 'https://example.com/proyecto-vista-mar.jpg',
    nullable: true
  })
  ImagenUrl: string | null;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-12-01T10:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-15T14:30:00.000Z'
  })
  updatedAt: Date;
}

/**
 * DTO ligero para listados de proyectos
 */
export class ProyectoListItemDto {
  @ApiProperty({ description: 'ID del proyecto' })
  id: string;

  @ApiProperty({ description: 'Nombre' })
  Nombre: string;

  @ApiProperty({ description: 'Ciudad' })
  Ciudad: string | null;

  @ApiProperty({ description: 'Estado' })
  Estado: string;

  @ApiProperty({ description: 'Total de unidades' })
  TotalUnidades: number | null;

  @ApiProperty({ description: 'Unidades disponibles' })
  UnidadesDisponibles: number | null;

  @ApiProperty({ description: 'Fecha de entrega estimada' })
  FechaEntrega: Date | null;
}
