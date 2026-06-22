import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Body } from '@nestjs/common';
import { SubscribePlanDto } from './dto/subscribe-plan.dto';
import { SubscriptionsService } from './subscriptions.service';
import {
  CancelSubscriptionApiDocs,
  GetMySubscriptionApiDocs,
  SubscribeToPlanApiDocs,
  SubscriptionsApiTags,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@SubscriptionsApiTags()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @SubscribeToPlanApiDocs()
  checkout(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SubscribePlanDto,
  ) {
    return this.subscriptionsService.subscribeToPlan(request.user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @GetMySubscriptionApiDocs()
  getMine(@Req() request: AuthenticatedRequest) {
    return this.subscriptionsService.getMySubscription(request.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @CancelSubscriptionApiDocs()
  cancelAtPeriodEnd(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionsService.cancelAtPeriodEnd(request.user.id, id);
  }
}
