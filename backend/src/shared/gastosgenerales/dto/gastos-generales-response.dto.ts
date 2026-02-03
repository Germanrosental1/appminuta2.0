import { ApiProperty } from '@nestjs/swagger';

export class GastosGeneralesResponseDto {
    @ApiProperty({ description: 'ID único (UUID)' })
    id: string;

    @ApiProperty({ description: 'ID del proyecto asociado' })
    idproyecto: string;

    @ApiProperty({ description: 'Porcentaje de sellado', required: false })
    sellado?: number;

    @ApiProperty({ description: 'Costo de certificación de firmas', required: false })
    certificaciondefirmas?: number;

    @ApiProperty({ description: 'Costo de alajamiento', required: false })
    alajamiento?: number;

    @ApiProperty({ description: 'Costo planos m2 propiedad', required: false })
    planosm2propiedad?: number;

    @ApiProperty({ description: 'Costo planos m2 cochera', required: false })
    planosm2cochera?: number;

    @ApiProperty({ description: 'Porcentaje de comisión inmobiliaria', required: false })
    comisioninmobiliaria?: number;

    @ApiProperty({ description: 'Otros gastos', required: false })
    otrosgastos?: number;

    @ApiProperty({ description: 'Fecha estimada de posesión', required: false })
    fecha_posesion?: string;

    @ApiProperty({ description: 'Etapa o Torre', required: false })
    etapatorre?: string;

    @ApiProperty({ description: 'Fecha de creación' })
    createdAt: Date;

    @ApiProperty({ description: 'Fecha de actualización' })
    updatedAt: Date;
}
