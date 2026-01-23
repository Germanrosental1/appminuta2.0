import { PartialType } from '@nestjs/mapped-types';
import { CreateUifClientDto } from './create-client.dto';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateUifClientDto extends PartialType(CreateUifClientDto) {
    @IsString()
    @IsOptional()
    status?: string;

    @IsObject()
    @IsOptional()
    financial_data?: Record<string, any>;

    @IsObject()
    @IsOptional()
    analysis_settings?: Record<string, any>;
}
