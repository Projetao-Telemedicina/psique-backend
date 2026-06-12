import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CheckoutAppointmentDto } from './dto/checkout-appointment.dto';
import { PaymentsService } from './payments.service';
import {
  CheckoutAppointmentApiDocs,
  GetPaymentByIdApiDocs,
  PaymentsApiTags,
  StripeWebhookApiDocs,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@PaymentsApiTags()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('appointments/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @CheckoutAppointmentApiDocs()
  checkoutAppointment(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CheckoutAppointmentDto,
  ) {
    return this.paymentsService.checkoutAppointment(request.user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @GetPaymentByIdApiDocs()
  getById(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getPaymentById(request.user.id, request.user.role, id);
  }

  @Post('webhook')
  @StripeWebhookApiDocs()
  handleWebhook(
    @Headers('stripe-signature') signature: string | string[] | undefined,
    @Req() request: RawBodyRequest,
  ) {
    return this.paymentsService.handleWebhook(signature, request.rawBody);
  }
}
