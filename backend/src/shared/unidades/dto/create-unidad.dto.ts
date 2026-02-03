import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, IsUUID, Min } from 'class-validator';

/**
 * DTO para crear una nueva unidad
 * Validado automáticamente por ValidationPipe global
 */
export class CreateUnidadDto {
    @ApiProperty({
        description: 'ID o Código del sector',
        example: 'SEC-Norte-01',
    })
    @IsString()
    @IsNotEmpty({ message: 'sectorid es requerido' })
    sectorid: string;

    @ApiPropertyOptional({
        description: 'UUID del proyecto asociado',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID('4', { message: 'proyecto_id debe ser un UUID válido' })
    @IsOptional()
    proyecto_id?: string;

    @ApiProperty({
        description: 'ID o Nombre del tipo de unidad',
        example: 'Departamento',
    })
    @IsString()
    @IsNotEmpty({ message: 'tipounidad_id es requerido' })
    tipounidad_id: string;

    @ApiPropertyOptional({
        description: 'UUID del edificio asociado',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4', { message: 'edificio_id debe ser un UUID válido' })
    @IsOptional()
    edificio_id?: string;

    @ApiPropertyOptional({
        description: 'UUID de la etapa del proyecto',
        example: '789e0123-e89b-12d3-a456-426614174999',
    })
    @IsUUID('4', { message: 'etapa_id debe ser un UUID válido' })
    @IsOptional()
    etapa_id?: string;

    @ApiPropertyOptional({
        description: 'Piso de la unidad',
        example: '3',
    })
    @IsString()
    @IsOptional()
    piso?: string;

    @ApiPropertyOptional({
        description: 'Número identificador de la unidad',
        example: '301',
    })
    @IsString()
    @IsOptional()
    nrounidad?: string;

    @ApiPropertyOptional({
        description: 'Cantidad de dormitorios',
        example: 2,
        minimum: 0,
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    dormitorios?: number;

    @ApiPropertyOptional({
        description: 'Manzana (para casas o loteos)',
        example: 'A',
    })
    @IsString()
    @IsOptional()
    manzana?: string;

    @ApiPropertyOptional({
        description: 'Destino de la unidad',
        example: 'Vivienda',
    })
    @IsString()
    @IsOptional()
    destino?: string;

    @ApiPropertyOptional({
        description: 'Frente/Orientación',
        example: 'Norte',
    })
    @IsString()
    @IsOptional()
    frente?: string;

    @ApiPropertyOptional({
        description: 'Superficie exclusiva en m2',
        example: 65.5,
    })
    @IsOptional()
    m2exclusivos?: number;

    @ApiPropertyOptional({
        description: 'Superficie total en m2',
        example: 75.2,
    })
    @IsOptional()
    m2totales?: number;

    @ApiPropertyOptional({
        description: 'Superficie común en m2',
        example: 10.5,
    })
    @IsOptional()
    m2comunes?: number;

    @ApiPropertyOptional({
        description: 'Superficie de patio o terraza en m2',
        example: 5.3,
    })
    @IsOptional()
    m2patioterraza?: number;

    @ApiPropertyOptional({
        description: 'Categoría de tamaño',
        example: 'Grande',
    })
    @IsString()
    @IsOptional()
    tamano?: string;

    @ApiPropertyOptional({
        description: 'Precio en USD',
        example: 155000,
    })
    @IsOptional()
    preciousd?: number;

    @ApiPropertyOptional({
        description: 'Precio USD por m2',
        example: 2100,
    })
    @IsOptional()
    usdm2?: number;

    @ApiPropertyOptional({
        description: 'Nombre o ID del cliente interesado',
    })
    @IsString()
    @IsOptional()
    clienteinteresado?: string;

    @ApiPropertyOptional({
        description: 'Observaciones generales',
        example: 'Unidad con vista despejada',
    })
    @IsString()
    @IsOptional()
    obs?: string;

    @ApiPropertyOptional({
        description: 'Fecha de reserva',
        example: '2026-02-02',
    })
    @IsOptional()
    fechareserva?: Date;

    @ApiPropertyOptional({
        description: 'Estado comercial',
        example: 'Disponible',
    })
    @IsString()
    @IsOptional()
    estadocomercial?: string;

    @ApiPropertyOptional({
        description: 'Nombre del vendedor asignado',
        example: 'Marcos Semino',
    })
    @IsString()
    @IsOptional()
    comercial?: string;
}
