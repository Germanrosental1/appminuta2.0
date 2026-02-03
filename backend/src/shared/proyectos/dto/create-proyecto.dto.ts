import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProyectoDto {
    @ApiProperty({
        description: 'Nombre del proyecto inmobiliario',
        example: 'Edificio Vista Mar',
    })
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @ApiProperty({
        description: 'Nombre de la tabla técnica asociada',
        example: 'vista_mar_unidades',
    })
    @IsString()
    @IsNotEmpty()
    tabla_nombre: string;

    @ApiPropertyOptional({
        description: 'Descripción detallada del proyecto',
        example: 'Residencial de 20 pisos con vista al océano.',
    })
    @IsString()
    @IsOptional()
    descripcion?: string;

    @ApiPropertyOptional({
        description: 'Dirección física del proyecto',
        example: 'Av. Costanera 123',
    })
    @IsString()
    @IsOptional()
    direccion?: string;

    @ApiPropertyOptional({
        description: 'Localidad o Ciudad',
        example: 'Rosario',
    })
    @IsString()
    @IsOptional()
    localidad?: string;

    @ApiPropertyOptional({
        description: 'Provincia o Estado',
        example: 'Santa Fe',
    })
    @IsString()
    @IsOptional()
    provincia?: string;

    @ApiPropertyOptional({
        description: 'Indica si el proyecto está activo en el sistema',
        default: true,
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    activo?: boolean;
}
