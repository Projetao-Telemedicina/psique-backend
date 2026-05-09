import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RescheduleService } from './reschedule.service';
import { CreateRescheduleDto } from './dto/create-reschedule.dto';
import { UpdateRescheduleDto } from './dto/update-reschedule.dto';

@Controller('reschedule')
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  @Post()
  create(@Body() createRescheduleDto: CreateRescheduleDto) {
    return this.rescheduleService.create(createRescheduleDto);
  }

  @Get()
  findAll() {
    return this.rescheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rescheduleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRescheduleDto: UpdateRescheduleDto) {
    return this.rescheduleService.update(+id, updateRescheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rescheduleService.remove(+id);
  }
}
