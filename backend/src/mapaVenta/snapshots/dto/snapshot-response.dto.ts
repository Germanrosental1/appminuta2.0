import { ApiProperty } from '@nestjs/swagger';

export class SnapshotResponseDto {
    @ApiProperty()
    Id: string;

    @ApiProperty()
    FechaSnapshot: Date;

    @ApiProperty()
    TipoSnapshot: string;

    @ApiProperty({ nullable: true })
    ProyectoId: string | null;

    @ApiProperty()
    TotalUnidades: number;

    @ApiProperty()
    Disponibles: number;

    @ApiProperty()
    Reservadas: number;

    @ApiProperty()
    Vendidas: number;

    @ApiProperty()
    NoDisponibles: number;

    @ApiProperty({ nullable: true })
    ValorStockUSD?: number;

    @ApiProperty({ nullable: true })
    M2TotalesStock?: number;
}

class SnapshotValuesDto {
    @ApiProperty()
    disponibles: number;

    @ApiProperty()
    reservadas: number;

    @ApiProperty()
    vendidas: number;

    @ApiProperty({ nullable: true })
    valorStock: number | null;
}

class SnapshotDiferenciaDto {
    @ApiProperty()
    disponibles: number;

    @ApiProperty()
    reservadas: number;

    @ApiProperty()
    vendidas: number;
}

export class SnapshotComparativoResponseDto {
    @ApiProperty()
    proyecto: string;

    @ApiProperty({ type: SnapshotValuesDto })
    actual: SnapshotValuesDto;

    @ApiProperty({ type: SnapshotValuesDto, nullable: true })
    anterior: SnapshotValuesDto | null;

    @ApiProperty({ type: SnapshotDiferenciaDto, nullable: true })
    diferencia: SnapshotDiferenciaDto | null;
}
