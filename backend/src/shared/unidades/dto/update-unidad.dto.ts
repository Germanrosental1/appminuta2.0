import { PartialType } from '@nestjs/swagger';
import { CreateUnidadDto } from './create-unidad.dto';

export class UpdateUnidadDto extends PartialType(CreateUnidadDto) { }
