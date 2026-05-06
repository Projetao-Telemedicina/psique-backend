import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';

import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import {
  GetProfessionalProfileApiDocs,
  ProfessionalsControllerApiTags,
  UpdateProfessionalProfileApiDocs,
} from './swagger/index.js';
import { UpdateProfessionalOnlineModeApiDocs } from './swagger/professionals.update-online-mode.swagger';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';

@ProfessionalsControllerApiTags()
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get(':userId')
  @GetProfessionalProfileApiDocs()
  getProfessionalProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.professionalsService.getProfessionalProfile(userId);
  }

  @Patch(':userId')
  @UpdateProfessionalProfileApiDocs()
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateProfessionalDto: UpdateProfessionalProfileDto,
  ) {
    return this.professionalsService.updateProfile(userId, updateProfessionalDto);
  }

  @Patch(':userId/online-mode')
  @UpdateProfessionalOnlineModeApiDocs()
  updateOnlineMode(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateOnlineStatusDto,
  ) {
    return this.professionalsService.updateOnlineMode(userId, updateDto.onlineMode);
  }
}
