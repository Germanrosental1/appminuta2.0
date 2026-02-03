import { ApiProperty } from '@nestjs/swagger';
import { PersonType } from './create-client.dto';

export class UifClientResponseDto {
    @ApiProperty({ description: 'ID único (UUID)' })
    id: string;

    @ApiProperty({ description: 'Nombre completo o razón social' })
    name: string;

    @ApiProperty({ description: 'CUIT/CUIL', required: false })
    cuit?: string;

    @ApiProperty({ enum: PersonType, description: 'Tipo de persona' })
    person_type: PersonType;

    @ApiProperty({ description: 'Datos financieros (JSON)', required: false })
    financial_data?: Record<string, any>;

    @ApiProperty({ description: 'Configuraciones de análisis (JSON)', required: false })
    analysis_settings?: Record<string, any>;

    @ApiProperty({ description: 'Fecha de creación' })
    created_at: Date;

    @ApiProperty({ description: 'Fecha de actualización' })
    updated_at: Date;
}
