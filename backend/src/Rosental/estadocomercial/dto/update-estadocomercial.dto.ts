import { PartialType } from '@nestjs/mapped-types';
import { CreateEstadoComercialDto } from './create-estadocomercial.dto';

export class UpdateEstadoComercialDto extends PartialType(CreateEstadoComercialDto) { }
