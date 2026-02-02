import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService, HealthCheckResult } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    /**
     * ⚡ MONITORING: Enhanced health check with DB ping and memory metrics
     */
    @Get('health')
    async getHealth(): Promise<HealthCheckResult> {
        return this.appService.getHealthCheck();
    }

    // Silenciar peticion automatica del navegador
    @Get('favicon.ico')
    @HttpCode(HttpStatus.NO_CONTENT)
    getFavicon() {
        return;
    }
}
