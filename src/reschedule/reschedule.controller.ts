import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRescheduleDto } from './dto/create-reschedule.dto';
import { UpdateRescheduleDto } from './dto/update-reschedule.dto';
import { RescheduleService } from './reschedule.service';

@Controller('reschedule')
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  @Post()
  create(@Body() createRescheduleDto: CreateRescheduleDto) {
    return this.rescheduleService.create(createRescheduleDto);
  }

  @Get()
  findAll() {
    return this.rescheduleService.getAllRescheduleRequests();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rescheduleService.getRescheduleRequestById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRescheduleDto: UpdateRescheduleDto,
  ) {
    return this.rescheduleService.update(id, updateRescheduleDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rescheduleService.remove(id);
  }
}
