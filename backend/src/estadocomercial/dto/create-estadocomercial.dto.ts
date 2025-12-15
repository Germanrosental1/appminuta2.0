import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEstadoComercialDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombreestado: string;
}
