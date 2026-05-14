import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';

import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import {
  ApproveProfessionalValidationApiDocs,
  GetAdminProfessionalValidationRequestsApiDocs,
  GetProfessionalProfileApiDocs,
  GetProfessionalValidationRequestsApiDocs,
  GetProfessionalValidationRequestApiDocs,
  ProfessionalsControllerApiTags,
  RejectProfessionalValidationApiDocs,
  SubmitProfessionalValidationApiDocs,
  UpdateProfessionalProfileApiDocs,
} from './swagger/index';
import { UpdateProfessionalOnlineModeApiDocs } from './swagger/professionals.update-online-mode.swagger';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RejectProfessionalValidationDto } from './dto/reject-professional-validation.dto';
import { ListProfessionalValidationRequestsDto } from './dto/list-professional-validation-requests.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

type UploadedValidationDocument = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Post('me/validation-request')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @SubmitProfessionalValidationApiDocs()
  submitOwnValidationRequest(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    document: UploadedValidationDocument,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.professionalsService.submitValidationRequest(
      request.user.id,
      document,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Get('me/validation-request')
  @GetProfessionalValidationRequestApiDocs()
  getOwnValidationRequest(@Req() request: AuthenticatedRequest) {
    return this.professionalsService.getOwnLatestValidationRequest(
      request.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Get('me/validation-requests')
  @GetProfessionalValidationRequestsApiDocs()
  listOwnValidationRequests(@Req() request: AuthenticatedRequest) {
    return this.professionalsService.listOwnValidationRequests(request.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/validation-requests')
  @GetAdminProfessionalValidationRequestsApiDocs()
  listValidationRequests(
    @Query() query: ListProfessionalValidationRequestsDto,
  ) {
    return this.professionalsService.listValidationRequests(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/validation-requests/:requestId/approve')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/validation-requests/:requestId/reject')
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

