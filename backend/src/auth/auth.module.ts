import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './supabase.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthLoggerService } from './auth-logger.service';
import { AuthLoggerController } from './auth-logger.controller';

@Module({
    imports: [PassportModule, PrismaModule],
    controllers: [AuthLoggerController],
    providers: [SupabaseStrategy, AuthLoggerService],
    exports: [PassportModule, SupabaseStrategy, AuthLoggerService],
})
export class AuthModule { }
