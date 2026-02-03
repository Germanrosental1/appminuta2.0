import { ApiProperty } from '@nestjs/swagger';

export class ClienteResponseDto {
    @ApiProperty({ description: 'ID único (UUID)' })
    Id: string;

    @ApiProperty({ description: 'DNI del cliente' })
    dni: number;

    @ApiProperty({ description: 'Nombre y Apellido' })
    NombreApellido: string;

    @ApiProperty({ description: 'Teléfono', required: false })
    Telefono?: string;

    @ApiProperty({ description: 'Fecha de creación' })
    CreatedAt: Date;
}
