import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CancelPanicButtonActivationDto } from './dto/cancel-panic-button-activation.dto';
import { CreatePanicButtonActivationDto } from './dto/create-panic-button-activation.dto';
import { RejectPanicButtonOfferDto } from './dto/reject-panic-button-offer.dto';
import { PanicButtonOffersService } from './panic-button-offers.service';
import { PanicButtonService } from './panic-button.service';
import {
  AcceptPanicButtonOfferApiDocs,
  ActivatePanicButtonApiDocs,
  CancelPanicButtonActivationApiDocs,
  GetMyActivePanicButtonApiDocs,
  GetPanicButtonByIdApiDocs,
  PanicButtonControllerApiTags,
  RejectPanicButtonOfferApiDocs,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@PanicButtonControllerApiTags()
@Controller('panic')
export class PanicButtonController {
  constructor(
    private readonly panicButtonService: PanicButtonService,
    private readonly panicButtonOffersService: PanicButtonOffersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Post()
  @ActivatePanicButtonApiDocs()
  activatePanicButton(
    @Body() dto: CreatePanicButtonActivationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.panicButtonService.activatePanicButton(request.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Get('me/active')
  @GetMyActivePanicButtonApiDocs()
  getMyActivePanicButton(@Req() request: AuthenticatedRequest) {
    return this.panicButtonService.getMyActivePanicButtonActivation(
      request.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @Post(':requestId/cancel')
  @CancelPanicButtonActivationApiDocs()
  cancelPanicButtonActivation(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: CancelPanicButtonActivationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.panicButtonService.cancelPanicButtonActivation(
      requestId,
      request.user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.PROFESSIONAL, Role.ADMIN)
  @Get(':requestId')
  @GetPanicButtonByIdApiDocs()
  getPanicButtonActivation(@Param('requestId', ParseUUIDPipe) requestId: string) {
    return this.panicButtonService.getRequestById(requestId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Post('offers/:offerId/accept')
  @AcceptPanicButtonOfferApiDocs()
  acceptPanicButtonOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.panicButtonOffersService.acceptOffer(offerId, request.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @Post('offers/:offerId/reject')
  @RejectPanicButtonOfferApiDocs()
  rejectPanicButtonOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: RejectPanicButtonOfferDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.panicButtonOffersService.rejectOffer(
      offerId,
      request.user.id,
      dto,
    );
  }
}
