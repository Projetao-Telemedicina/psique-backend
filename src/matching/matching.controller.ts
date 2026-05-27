import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { MatchingService } from './matching.service';
import { CreatePatientQuestionnaireDto } from './dto/patient-questionnaire.dto';
import { CreateProfessionalQuestionnaireDto } from './dto/professional-questionnaire.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import {
  GetRecommendationsApiDocs,
  MatchingControllerApiTags,
  UpsertPatientQuestionnaireApiDocs,
  UpsertProfessionalQuestionnaireApiDocs,
} from './swagger/index';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@MatchingControllerApiTags()
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Post('patient/questionnaire')
  @UpsertPatientQuestionnaireApiDocs()
  upsertPatientQuestionnaire(
    @Body() dto: CreatePatientQuestionnaireDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchingService.upsertPatientQuestionnaire(
      request.user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Post('professional/questionnaire')
  @UpsertProfessionalQuestionnaireApiDocs()
  upsertProfessionalQuestionnaire(
    @Body() dto: CreateProfessionalQuestionnaireDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchingService.upsertProfessionalQuestionnaire(
      request.user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Get('recommendations')
  @GetRecommendationsApiDocs()
  getRecommendations(
    @Req() request: AuthenticatedRequest,
  ): Promise<MatchResponseDto> {
    return this.matchingService.getRecommendationsForPatient(request.user.id);
  }
}
