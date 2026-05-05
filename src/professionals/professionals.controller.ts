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
}
