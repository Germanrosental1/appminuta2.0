import { PartialType } from '@nestjs/mapped-types';
import { CreateMotivoNodispDto } from './create-motivonodisp.dto';

export class UpdateMotivoNodispDto extends PartialType(CreateMotivoNodispDto) { }
