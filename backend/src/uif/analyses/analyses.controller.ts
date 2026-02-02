import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { UifAnalysesService } from './analyses.service';
import { CreateUifAnalysisDto, UpdateUifAnalysisDto } from './dto/analysis.dto';
import { UifAuthGuard } from '../../common/guards/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('uif/analyses')
@UseGuards(UifAuthGuard)
export class UifAnalysesController {
    constructor(private readonly analysesService: UifAnalysesService) { }

    @Get()
    findByClient(@Query('client_id', ParseUUIDPipe) clientId: string) {
        return this.analysesService.findByClient(clientId);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.analysesService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateUifAnalysisDto, @CurrentUser() user: any) {
        return this.analysesService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifAnalysisDto,
        @CurrentUser() user: any,
    ) {
        return this.analysesService.update(id, dto, user.sub || user.id, user.email);
    }

    @Post(':id/finalize')
    finalize(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.analysesService.finalize(id, user.sub || user.id, user.email);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.analysesService.remove(id, user.sub || user.id, user.email);
    }
}
