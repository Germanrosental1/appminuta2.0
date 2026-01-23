import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoUnidadDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;
}

export class UpdateTipoUnidadDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre?: string;
}
