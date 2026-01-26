import { IsString, IsOptional, IsEnum, IsObject, IsNotEmpty } from 'class-validator';

export enum PersonType {
    PF = 'PF',
    PJ = 'PJ',
}

export class CreateUifClientDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    name: string;

    @IsString()
    @IsOptional()
    cuit?: string;

    @IsEnum(PersonType)
    @IsOptional()
    person_type?: PersonType = PersonType.PF;

    @IsObject()
    @IsOptional()
    financial_data?: Record<string, any>;

    @IsObject()
    @IsOptional()
    analysis_settings?: Record<string, any>;
}
