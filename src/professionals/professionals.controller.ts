import {
  Body,
  Controller,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';

import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import {
  GetProfessionalProfileApiDocs,
  GetProfessionalValidationRequestsApiDocs,
  GetProfessionalValidationRequestApiDocs,
  ProfessionalsControllerApiTags,
  SubmitProfessionalValidationApiDocs,
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
  @Roles(Role.PROFESSIONAL)
  @Post('me/validation-request')
  @UseInterceptors(
    FileInterceptor('document', {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @SubmitProfessionalValidationApiDocs()
  submitOwnValidationRequest(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
        ],
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
}

