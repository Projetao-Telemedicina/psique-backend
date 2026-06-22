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

export type StripeSubscriptionResult = {
  id: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  paymentIntentId: string | null;
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

  async createSubscription(input: {
    customerId: string;
    priceId: string;
    productId: string;
    paymentMethodId: string;
    metadata: Record<string, string>;
    discountAmountCents?: number;
  }): Promise<StripeSubscriptionResult> {
    const subscription = (await this.stripe.subscriptions.create({
      customer: input.customerId,
      collection_method: 'charge_automatically',
      default_payment_method: input.paymentMethodId,
      payment_behavior: 'default_incomplete',
      items: [
        {
          price: input.priceId,
        },
      ],
      ...(input.discountAmountCents && input.discountAmountCents > 0
        ? {
            add_invoice_items: [
              {
                price_data: {
                  currency: 'brl',
                  product: input.productId,
                  unit_amount: -input.discountAmountCents,
                },
                quantity: 1,
              },
            ],
          }
        : {}),
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: input.metadata,
      expand: ['latest_invoice.payment_intent'],
    })) as {
      id: string;
      status: string;
      latest_invoice?:
        | ({
            payment_intent?:
              | {
                  id: string;
                  client_secret?: string | null;
                }
              | string
              | null;
          } & Record<string, unknown>)
        | string
        | null;
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      ended_at: number | null;
    };

    const latestInvoice =
      subscription.latest_invoice && typeof subscription.latest_invoice !== 'string'
        ? subscription.latest_invoice
        : null;
    const paymentIntent =
      latestInvoice?.payment_intent &&
      typeof latestInvoice.payment_intent !== 'string'
        ? latestInvoice.payment_intent
        : null;

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
      paymentIntentId: paymentIntent?.id ?? null,
      clientSecret: paymentIntent?.client_secret ?? null,
    };
  }

  async cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
    const subscription = (await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })) as {
      id: string;
      status: string;
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      ended_at: number | null;
    };

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
      paymentIntentId: null,
      clientSecret: null,
    } satisfies StripeSubscriptionResult;
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    );
  }
}
