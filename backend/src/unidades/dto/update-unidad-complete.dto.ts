import { IsNotEmpty, IsOptional, IsString, IsInt, IsUUID, IsNumber, IsDateString, Min } from 'class-validator';

/**
 * DTO para actualización completa de una unidad
 * Incluye campos de las 3 tablas: unidades, unidadesmetricas, detallesventa
 */
export class UpdateUnidadCompleteDto {
    // ==========================================
    // Campos de la tabla: unidades
    // ==========================================
    @IsUUID('4', { message: 'edificio_id debe ser un UUID válido' })
    @IsOptional()
    edificio_id?: string;

    @IsUUID('4', { message: 'tipounidad_id debe ser un UUID válido' })
    @IsOptional()
    tipounidad_id?: string;

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

    // ==========================================
    // Campos de la tabla: unidadesmetricas
    // ==========================================
    @IsNumber()
    @IsOptional()
    m2exclusivos?: number;

    @IsNumber()
    @IsOptional()
    m2patioterraza?: number;

    @IsUUID('4', { message: 'tipopatio_id debe ser un UUID válido' })
    @IsOptional()
    tipopatio_id?: string;

    @IsNumber()
    @IsOptional()
    m2comunes?: number;

    @IsNumber()
    @IsOptional()
    m2calculo?: number;

    @IsNumber()
    @IsOptional()
    m2totales?: number;

    @IsNumber()
    @IsOptional()
    m2cubiertos?: number;

    @IsNumber()
    @IsOptional()
    m2semicubiertos?: number;

    @IsString()
    @IsOptional()
    tamano?: string;

    // ==========================================
    // Campos de la tabla: detallesventa
    // ==========================================
    @IsUUID('4', { message: 'estado_id debe ser un UUID válido' })
    @IsOptional()
    estado_id?: string;

    @IsUUID('4', { message: 'comercial_id debe ser un UUID válido' })
    @IsOptional()
    comercial_id?: string;

    @IsUUID('4', { message: 'motivonodisp_id debe ser un UUID válido' })
    @IsOptional()
    motivonodisp_id?: string;

    @IsNumber()
    @IsOptional()
    preciousd?: number;

    @IsNumber()
    @IsOptional()
    usdm2?: number;

    @IsString()
    @IsOptional()
    clienteinteresado?: string;

    @IsString()
    @IsOptional()
    clientetitularboleto?: string;

    @IsDateString()
    @IsOptional()
    fechareserva?: string;

    @IsDateString()
    @IsOptional()
    fechafirmaboleto?: string;

    @IsDateString()
    @IsOptional()
    fechaposesion?: string;

    @IsString()
    @IsOptional()
    obs?: string;

    @IsUUID('4', { message: 'tipocochera_id debe ser un UUID válido' })
    @IsOptional()
    tipocochera_id?: string;

    @IsUUID('4', { message: 'unidadcomprador_id debe ser un UUID válido' })
    @IsOptional()
    unidadcomprador_id?: string;
}
