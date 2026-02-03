import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService, HealthCheckResult } from './app.service';
import { ApiResponseWrapper } from './common/decorators/api-response-wrapper.decorator';

@ApiTags('System')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    @ApiOperation({ summary: 'Health Check simple', description: 'Retorna un saludo del sistema.' })
    @ApiResponseWrapper(String)
    getHello(): string {
        return this.appService.getHello();
    }

    @Get('health')
    @ApiOperation({
        summary: 'Monitorización de Salud Avanzada',
        description: 'Verifica conexión a la base de datos y métricas de memoria.',
    })
    @ApiResponseWrapper(Object) // HealthCheckResult is complex, Object is safer here or I could define a DTO
    async getHealth(): Promise<HealthCheckResult> {
        return this.appService.getHealthCheck();
    }

    @Get('favicon.ico')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Favicon silenciador', description: 'Evita errores 404 en navegadores.' })
    getFavicon() {
        return;
    }
}
