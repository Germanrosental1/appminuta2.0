import { IsArray, IsNumber, IsUUID, Min, Max, ArrayMinSize, IsEnum, ValidateIf } from 'class-validator';

/**
 * Modos de ajuste de precio:
 * - PERCENTAGE_TOTAL: Aplica porcentaje al precio total (preciousd y usdm2)
 * - PERCENTAGE_M2: Aplica porcentaje solo al usdm2, recalcula preciousd
 * - FIXED_TOTAL: Establece precio total fijo, recalcula usdm2
 * - FIXED_M2: Establece usdm2 fijo, recalcula preciousd
 */
export enum AdjustmentMode {
    PERCENTAGE_TOTAL = 'PERCENTAGE_TOTAL',
    PERCENTAGE_M2 = 'PERCENTAGE_M2',
    FIXED_TOTAL = 'FIXED_TOTAL',
    FIXED_M2 = 'FIXED_M2'
}

export class AdjustPricesDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Debe seleccionar al menos un proyecto' })
    @IsUUID('4', { each: true, message: 'Cada ID de proyecto debe ser un UUID válido' })
    projectIds: string[];

    @IsEnum(AdjustmentMode, { message: 'Modo de ajuste inválido' })
    mode: AdjustmentMode;

    /**
     * Porcentaje de ajuste (solo para modos PERCENTAGE_*)
     * Positivo para aumentar, negativo para disminuir
     */
    @ValidateIf(o => o.mode === AdjustmentMode.PERCENTAGE_TOTAL || o.mode === AdjustmentMode.PERCENTAGE_M2)
    @IsNumber({}, { message: 'El porcentaje debe ser un número' })
    @Min(-100, { message: 'El porcentaje no puede ser menor a -100%' })
    @Max(1000, { message: 'El porcentaje no puede ser mayor a 1000%' })
    percentage?: number;

    /**
     * Valor fijo a establecer (solo para modos FIXED_*)
     * Para FIXED_TOTAL: nuevo precio en USD
     * Para FIXED_M2: nuevo precio por m2 en USD
     */
    @ValidateIf(o => o.mode === AdjustmentMode.FIXED_TOTAL || o.mode === AdjustmentMode.FIXED_M2)
    @IsNumber({}, { message: 'El valor debe ser un número' })
    @Min(0, { message: 'El valor no puede ser negativo' })
    fixedValue?: number;
}
