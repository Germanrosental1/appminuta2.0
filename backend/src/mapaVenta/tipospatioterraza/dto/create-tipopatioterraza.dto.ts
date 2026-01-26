import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoPatioTerrazaDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;
}

export class UpdateTipoPatioTerrazaDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre?: string;
}
