import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEtapaDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;
}
