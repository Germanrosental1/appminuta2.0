import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { UifClientsService } from './clients.service';
import { CreateUifClientDto } from './dto/create-client.dto';
import { UpdateUifClientDto } from './dto/update-client.dto';
import { UifAuthGuard } from '../../common/guards/uif-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('uif/clients')
@UseGuards(UifAuthGuard)
export class UifClientsController {
    constructor(private readonly clientsService: UifClientsService) { }

    @Get()
    findAll() {
        return this.clientsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.clientsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateUifClientDto, @CurrentUser() user: any) {
        return this.clientsService.create(dto, user.sub || user.id, user.email);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUifClientDto,
        @CurrentUser() user: any,
    ) {
        return this.clientsService.update(id, dto, user.sub || user.id, user.email);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.clientsService.remove(id, user.sub || user.id, user.email);
    }
}
