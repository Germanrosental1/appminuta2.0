import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject, IsUUID, IsNumber } from 'class-validator';

export class CreateMinutaDto {
    @ApiPropertyOptional({
        description: 'UUID del proyecto asociado',
        example: '550e8400-e29b-41d4-a716-446655440000',
        nullable: true,
    })
    @IsUUID()
    @IsOptional()
    proyecto?: string | null;

    @ApiProperty({
        description: 'Estado inicial de la minuta',
        example: 'Provisoria',
    })
    @IsString()
    @IsNotEmpty()
    estado: string;

    @ApiProperty({
        description: 'Datos del formulario del wizard (estructura flexible)',
        example: {
            clienteNombre: 'Juan Pérez',
            clienteRut: '12.345.678-9',
            unidadId: '123e4567-e89b-12d3-a456-426614174000',
            precioTotal: 150000000,
        },
    })
    @IsObject()
    @IsNotEmpty()
    datos: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Datos adicionales personalizados',
        example: { descuento: 5, formaPago: 'Crédito hipotecario' },
    })
    @IsObject()
    @IsOptional()
    datos_adicionales?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Metadatos geográficos o del mapa de ventas',
    })
    @IsOptional()
    datos_mapa_ventas?: any;

    @ApiPropertyOptional({
        description: 'Comentarios u observaciones internas',
        example: 'Cliente solicita revisión de terminaciones',
    })
    @IsString()
    @IsOptional()
    comentarios?: string;

    @ApiPropertyOptional({
        description: 'URL del documento PDF generado',
        example: 'https://storage.example.com/minutas/MIN-2026-001.pdf',
    })
    @IsString()
    @IsOptional()
    url_documento?: string;

    @ApiPropertyOptional({
        description: 'DNI del cliente interesado (compatibilidad legacy)',
        example: 12345678,
    })
    @IsNumber()
    @IsOptional()
    clienteInteresadoDni?: number;

    @ApiPropertyOptional({
        description: 'UUID del cliente interesado (referencia a tabla Clientes)',
        example: '789e0123-e89b-12d3-a456-426614174999',
    })
    @IsUUID()
    @IsOptional()
    clienteInteresadoId?: string;
}

