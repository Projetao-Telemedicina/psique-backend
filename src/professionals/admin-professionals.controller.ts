import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ListProfessionalValidationRequestsDto } from './dto/list-professional-validation-requests.dto';
import { RejectProfessionalValidationDto } from './dto/reject-professional-validation.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { ProfessionalsService } from './professionals.service';
import {
  ApproveProfessionalValidationApiDocs,
  GetAdminProfessionalValidationRequestsApiDocs,
  ProfessionalsControllerApiTags,
  RejectProfessionalValidationApiDocs,
  UpdateProfessionalProfileApiDocs,
} from './swagger';
import { UpdateProfessionalOnlineModeApiDocs } from './swagger/professionals.update-online-mode.swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ProfessionalsControllerApiTags()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/professionals')
export class AdminProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Patch(':userId')
  @UpdateProfessionalProfileApiDocs({ admin: true })
  updateProfileAsAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateProfessionalDto: UpdateProfessionalProfileDto,
  ) {
    return this.professionalsService.updateProfile(userId, updateProfessionalDto);
  }

  @Patch(':userId/online-mode')
  @UpdateProfessionalOnlineModeApiDocs({ admin: true })
  updateOnlineModeAsAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: UpdateOnlineStatusDto,
  ) {
    return this.professionalsService.updateOnlineMode(userId, updateDto.onlineMode);
  }

  @Get('validation-requests')
  @GetAdminProfessionalValidationRequestsApiDocs()
  listValidationRequests(@Query() query: ListProfessionalValidationRequestsDto) {
    return this.professionalsService.listValidationRequests(query);
  }

  @Patch('validation-requests/:requestId/approve')
  @ApproveProfessionalValidationApiDocs()
  approveValidationRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.professionalsService.approveValidationRequest(
      requestId,
      request.user.id,
    );
  }

  @Patch('validation-requests/:requestId/reject')
  @RejectProfessionalValidationApiDocs()
  rejectValidationRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RejectProfessionalValidationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.professionalsService.rejectValidationRequest(
      requestId,
      request.user.id,
      dto,
    );
  }
}
