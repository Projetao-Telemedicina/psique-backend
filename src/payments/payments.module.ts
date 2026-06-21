import { Module } from '@nestjs/common';
import { AppointmentModule } from '@/appointment/appointment.module';
import { CouponsModule } from '@/coupons/coupons.module';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [AppointmentModule, CouponsModule],
  controllers: [PaymentMethodsController, PaymentsController],
  providers: [StripeService, PaymentMethodsService, PaymentsService],
  exports: [StripeService, PaymentMethodsService, PaymentsService],
})
export class PaymentsModule {}
