import { IsArray, IsNumber, IsUUID, Min, Max, ArrayMinSize } from 'class-validator';

export class AdjustPricesDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Debe seleccionar al menos un proyecto' })
    @IsUUID('4', { each: true, message: 'Cada ID de proyecto debe ser un UUID válido' })
    projectIds: string[];

    @IsNumber({}, { message: 'El porcentaje debe ser un número' })
    @Min(-100, { message: 'El porcentaje no puede ser menor a -100%' })
    @Max(1000, { message: 'El porcentaje no puede ser mayor a 1000%' })
    percentage: number;
}
