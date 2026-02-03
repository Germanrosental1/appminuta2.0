import { ApiProperty } from '@nestjs/swagger';

export class UifAnalysisResponseDto {
    @ApiProperty({ description: 'ID único (UUID)' })
    id: string;

    @ApiProperty({ description: 'ID del cliente asociado' })
    client_id: string;

    @ApiProperty({ description: 'Nombre del análisis' })
    name: string;

    @ApiProperty({ description: 'Estado del análisis', example: 'pending' })
    status: string;

    @ApiProperty({ description: 'Datos financieros consolidados', required: false })
    financial_data?: Record<string, any>;

    @ApiProperty({ description: 'Configuraciones del análisis', required: false })
    analysis_settings?: Record<string, any>;

    @ApiProperty({ description: 'Fecha de creación' })
    created_at: Date;

    @ApiProperty({ description: 'Fecha de actualización' })
    updated_at: Date;
}
