import { IsOptional, IsString } from 'class-validator';

export class CreateNaturalezaDto {
    @IsOptional()
    @IsString()
    nombre?: string;
}
