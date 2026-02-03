import { ApiProperty } from '@nestjs/swagger';
import { CatalogResponseDto } from '../../../../common/dto/catalog-response.dto';

export class UserProjectResponseDto {
    @ApiProperty({ type: () => CatalogResponseDto })
    proyecto: CatalogResponseDto;

    @ApiProperty({ type: () => CatalogResponseDto })
    rol: CatalogResponseDto;
}

export class CheckRoleResponseDto {
    @ApiProperty({ example: true })
    hasRole: boolean;
}
