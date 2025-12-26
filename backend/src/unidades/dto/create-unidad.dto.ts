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

    // --- Métricas ---
    @IsOptional()
    m2exclusivos?: number;

    @IsOptional()
    m2totales?: number;

    @IsOptional()
    m2comunes?: number;

    @IsOptional()
    m2patioterraza?: number;

    @IsString()
    @IsOptional()
    tamano?: string;

    // --- Detalles Venta ---
    @IsOptional()
    preciousd?: number;

    @IsOptional()
    usdm2?: number;

    @IsString()
    @IsOptional()
    clienteinteresado?: string;

    @IsString()
    @IsOptional()
    obs?: string;

    @IsOptional()
    fechareserva?: Date;

    @IsString()
    @IsOptional()
    estadocomercial?: string; // Nombre del estado (ej: Disponible)

    @IsString()
    @IsOptional()
    comercial?: string; // Nombre del comercial

}
