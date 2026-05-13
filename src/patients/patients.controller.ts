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
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PatientsService } from './patients.service';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import {
  GetPatientProfileApiDocs,
  PatientsControllerApiTags,
  UpdatePatientProfileApiDocs,
} from './swagger/index';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@PatientsControllerApiTags()
@Controller('patient')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get(':userId/profile')
  @GetPatientProfileApiDocs()
  getPatientProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.patientsService.getPatientProfile(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Patch('me/profile')
  @UpdatePatientProfileApiDocs()
  updateOwnProfile(
    @Body() updateDto: UpdatePatientProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.patientsService.updateProfile(request.user.id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:userId/profile')
  @UpdatePatientProfileApiDocs({ admin: true })
  updateProfileAsAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(userId, updateDto);
  }
}

