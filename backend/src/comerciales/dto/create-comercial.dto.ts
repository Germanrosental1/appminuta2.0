import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateComercialDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    nombre: string;
}
