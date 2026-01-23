import { PartialType } from '@nestjs/mapped-types';
import { CreateComercialDto } from './create-comercial.dto';

export class UpdateComercialDto extends PartialType(CreateComercialDto) { }
