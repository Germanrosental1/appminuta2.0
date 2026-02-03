import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para una Minuta
 *
 * IMPORTANTE: Este DTO representa SOLO el payload de datos.
 * El wrapper ApiResponse<MinutaResponseDto> agrega metadatos adicionales.
 *
 * DISEÑO:
 * - Separar DTOs de entrada (CreateMinutaDto) de salida (MinutaResponseDto)
 * - Permite controlar exactamente qué campos se exponen al cliente
 * - Facilita versionado de API sin cambiar entidades de DB
 */
export class MinutaResponseDto {
  @ApiProperty({
    description: 'ID único de la minuta',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  Id: string;

  @ApiProperty({
    description: 'Número correlativo de la minuta',
    example: 'MIN-2026-001'
  })
  Numero: string;

  @ApiProperty({
    description: 'Estado de la minuta',
    enum: ['Provisoria', 'Definitiva', 'Rechazada', 'Anulada'],
    example: 'Provisoria'
  })
  Estado: string;

  @ApiProperty({
    description: 'Tipo de minuta',
    enum: ['Venta', 'Reserva', 'Promesa'],
    example: 'Venta'
  })
  Tipo: string;

  @ApiProperty({
    description: 'ID del proyecto asociado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  ProyectoId: string;

  @ApiProperty({
    description: 'Nombre del proyecto',
    example: 'Edificio Vista Mar'
  })
  ProyectoNombre: string;

  @ApiProperty({
    description: 'ID de la unidad asociada',
    example: '789e0123-e89b-12d3-a456-426614174999',
    nullable: true
  })
  UnidadId: string | null;

  @ApiProperty({
    description: 'Identificador de la unidad (ej: Depto 301)',
    example: 'Depto 301',
    nullable: true
  })
  UnidadIdentificador: string | null;

  @ApiProperty({
    description: 'RUT del cliente',
    example: '12.345.678-9'
  })
  ClienteRut: string;

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez González'
  })
  ClienteNombre: string;

  @ApiProperty({
    description: 'Precio total de la minuta',
    example: 150000000,
    type: 'number'
  })
  PrecioTotal: number;

  @ApiProperty({
    description: 'ID del usuario que creó la minuta',
    example: 'auth0|123456789'
  })
  CreadoPor: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-02-02T10:30:00.000Z'
  })
  CreatedAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-02-02T15:45:00.000Z'
  })
  UpdatedAt: Date;



  @ApiProperty({
    description: 'Comentarios o observaciones',
    example: 'Cliente requiere modificaciones',
    nullable: true
  })
  Comentario: string | null;

  @ApiProperty({
    description: 'Datos JSON de la minuta (Wizard)',
    example: { "proyecto_id": "..." },
    nullable: true
  })
  Dato: any;

  @ApiProperty({
    description: 'Datos adicionales JSON',
    nullable: true
  })
  DatoAdicional: any;

  @ApiProperty({
    description: 'Datos del mapa de ventas JSON',
    nullable: true
  })
  DatoMapaVenta: any;
}

/**
 * DTO de respuesta simple para listados
 * Versión ligera sin relaciones anidadas
 */
export class MinutaListItemDto {
  @ApiProperty({ description: 'ID de la minuta' })
  Id: string;

  @ApiProperty({ description: 'Número de minuta' })
  Numero: string;

  @ApiProperty({ description: 'Estado' })
  Estado: string;

  @ApiProperty({ description: 'Tipo' })
  Tipo: string;

  @ApiProperty({ description: 'Nombre del proyecto' })
  ProyectoNombre: string;

  @ApiProperty({ description: 'Cliente RUT' })
  ClienteRut: string;

  @ApiProperty({ description: 'Cliente nombre' })
  ClienteNombre: string;

  @ApiProperty({ description: 'Precio total', type: 'number' })
  PrecioTotal: number;

  @ApiProperty({ description: 'Fecha de creación' })
  CreatedAt: Date;
}
