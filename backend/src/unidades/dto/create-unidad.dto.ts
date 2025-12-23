import { IsNotEmpty, IsOptional, IsString, IsInt, IsUUID, Min } from 'class-validator';

/**
 * DTO para crear una nueva unidad
 * Validado automáticamente por ValidationPipe global
 */
export class CreateUnidadDto {
    @IsString()
    @IsNotEmpty({ message: 'sectorid es requerido' })
    sectorid: string;

    @IsUUID('4', { message: 'tipounidad_id debe ser un UUID válido' })
    @IsNotEmpty({ message: 'tipounidad_id es requerido' })
    tipounidad_id: string;

    @IsUUID('4', { message: 'edificio_id debe ser un UUID válido' })
    @IsOptional()
    edificio_id?: string;

    @IsUUID('4', { message: 'etapa_id debe ser un UUID válido' })
    @IsOptional()
    etapa_id?: string;

    @IsString()
    @IsOptional()
    piso?: string;

    @IsString()
    @IsOptional()
    nrounidad?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    dormitorios?: number;

    @IsString()
    @IsOptional()
    manzana?: string;

    @IsString()
    @IsOptional()
    destino?: string;

    @IsString()
    @IsOptional()
    frente?: string;
}
