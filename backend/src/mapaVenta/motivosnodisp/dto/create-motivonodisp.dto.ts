import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMotivoNodispDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    nombre: string;
}
