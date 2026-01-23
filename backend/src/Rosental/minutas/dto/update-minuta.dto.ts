import { PartialType } from '@nestjs/mapped-types';
import { CreateMinutaDto } from './create-minuta.dto';

export class UpdateMinutaDto extends PartialType(CreateMinutaDto) {}
