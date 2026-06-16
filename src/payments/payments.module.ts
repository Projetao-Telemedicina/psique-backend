import { Module } from '@nestjs/common';
import { AppointmentModule } from '@/appointment/appointment.module';
import { CouponsModule } from '@/coupons/coupons.module';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe/stripe.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [AppointmentModule, CouponsModule],
  controllers: [
    PaymentMethodsController,
    PaymentsController,
    PlansController,
    SubscriptionsController,
  ],
  providers: [
    StripeService,
    PaymentMethodsService,
    PaymentsService,
    PlansService,
    SubscriptionsService,
  ],
  exports: [
    StripeService,
    PaymentMethodsService,
    PaymentsService,
    PlansService,
    SubscriptionsService,
  ],
})
export class PaymentsModule {}
