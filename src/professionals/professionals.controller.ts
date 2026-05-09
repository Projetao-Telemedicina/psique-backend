import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import {
  GetProfessionalProfileApiDocs,
  ProfessionalsControllerApiTags,
  UpdateProfessionalProfileApiDocs,
} from './swagger/index';
import { UpdateProfessionalOnlineModeApiDocs } from './swagger/professionals.update-online-mode.swagger';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ProfessionalsControllerApiTags()
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get(':userId')
  @GetProfessionalProfileApiDocs()
  getProfessionalProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.professionalsService.getProfessionalProfile(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Patch('me')
  @UpdateProfessionalProfileApiDocs()
  updateOwnProfile(
    @Body() updateProfessionalDto: UpdateProfessionalProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.professionalsService.updateProfile(
      request.user.id,
      updateProfessionalDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:userId')
  @UpdateProfessionalProfileApiDocs({ admin: true })
  updateProfileAsAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateProfessionalDto: UpdateProfessionalProfileDto,
  ) {
    return this.professionalsService.updateProfile(userId, updateProfessionalDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Patch('me/online-mode')
  @UpdateProfessionalOnlineModeApiDocs()
  updateOwnOnlineMode(
    @Body() updateDto: UpdateOnlineStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.professionalsService.updateOnlineMode(
      request.user.id,
      updateDto.onlineMode,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:userId/online-mode')
  @UpdateProfessionalOnlineModeApiDocs({ admin: true })
  updateOnlineModeAsAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateOnlineStatusDto,
  ) {
    return this.professionalsService.updateOnlineMode(userId, updateDto.onlineMode);
  }
}

