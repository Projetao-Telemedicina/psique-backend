import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalProfileDto } from './dto/create-professional-profile.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get(':id')
  getProfessionalProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.professionalsService.getProfessionalProfile(userId);
  }

  @Patch(':id')
  update(@Param('userId', ParseUUIDPipe) userId: string, @Body() updateProfessionalDto: UpdateProfessionalProfileDto) {
    return this.professionalsService.updateProfile(userId, updateProfessionalDto);
  }
}
