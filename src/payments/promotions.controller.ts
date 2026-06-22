import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CheckoutPromotionDto } from './dto/checkout-promotion.dto';
import { PromotionsService } from './promotions.service';
import { CheckoutPromotionApiDocs, PromotionsApiTags } from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@PromotionsApiTags()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @CheckoutPromotionApiDocs()
  checkout(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CheckoutPromotionDto,
  ) {
    return this.promotionsService.checkoutPromotion(request.user.id, dto);
  }
}
