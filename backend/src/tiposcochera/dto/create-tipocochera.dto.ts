import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoCocheraDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;
}

export class UpdateTipoCocheraDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre?: string;
}
