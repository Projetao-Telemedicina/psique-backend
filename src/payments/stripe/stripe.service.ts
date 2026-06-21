import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripeCardPaymentMethodDetails = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  holderName: string | null;
};

export type StripePaymentIntentResult = {
  id: string;
  status: string;
  clientSecret: string | null;
};

@Injectable()
export class StripeService {
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async createCustomer(input: { email: string; name: string }) {
    return this.stripe.customers.create({
      email: input.email,
      name: input.name,
    });
  }

  async createSetupIntent(customerId: string) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return {
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async getCardPaymentMethodDetails(
    paymentMethodId: string,
  ): Promise<StripeCardPaymentMethodDetails> {
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    if ('deleted' in paymentMethod) {
      throw new Error('Método de pagamento removido no Stripe.');
    }

    return {
      id: paymentMethod.id,
      brand: paymentMethod.card?.brand ?? null,
      last4: paymentMethod.card?.last4 ?? null,
      expMonth: paymentMethod.card?.exp_month ?? null,
      expYear: paymentMethod.card?.exp_year ?? null,
      holderName: paymentMethod.billing_details.name ?? null,
    };
  }

  async updateDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string | null,
  ) {
    return this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId ?? undefined,
      },
    });
  }

  async createAndConfirmPaymentIntent(input: {
    amountCents: number;
    customerId: string;
    paymentMethodId: string;
    metadata: Record<string, string>;
  }): Promise<StripePaymentIntentResult> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: 'brl',
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      payment_method_types: ['card'],
      confirm: true,
      metadata: input.metadata,
    });

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
    };
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    );
  }
}
