import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEdificioDto {
    @IsUUID()
    @IsNotEmpty()
    proyecto_id: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    nombreedificio: string;
}
