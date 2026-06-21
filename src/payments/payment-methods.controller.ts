import {
  Body,
  Controller,
  Delete,
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
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreatePaymentMethodApiDocs,
  CreateSetupIntentApiDocs,
  ListPaymentMethodsApiDocs,
  PaymentMethodsApiTags,
  RemovePaymentMethodApiDocs,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@PaymentMethodsApiTags()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post('setup-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.PROFESSIONAL)
  @CreateSetupIntentApiDocs()
  createSetupIntent(@Req() request: AuthenticatedRequest) {
    return this.paymentMethodsService.createSetupIntent(request.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.PROFESSIONAL)
  @CreatePaymentMethodApiDocs()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SavePaymentMethodDto,
  ) {
    return this.paymentMethodsService.savePaymentMethod(request.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.PROFESSIONAL)
  @ListPaymentMethodsApiDocs()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.paymentMethodsService.listMyPaymentMethods(request.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT, Role.PROFESSIONAL)
  @RemovePaymentMethodApiDocs()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentMethodsService.removePaymentMethod(request.user.id, id);
  }
}
