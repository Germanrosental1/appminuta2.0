import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get('health')
    getHealth(): string {
        return 'Backend is running!';
    }

    // Silenciar petición automática del navegador
    @Get('favicon.ico')
    @HttpCode(HttpStatus.NO_CONTENT)
    getFavicon() {
        return;
    }
}
