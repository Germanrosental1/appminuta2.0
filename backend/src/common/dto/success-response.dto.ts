import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
    @ApiProperty({ description: 'Indica si la operación fue exitosa', example: true })
    success: boolean;

    @ApiProperty({ description: 'Mensaje opcional', required: false })
    message?: string;
}
