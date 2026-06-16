import {
  dateTimeSchema,
  nullableDateTimeSchema,
  nullableStringSchema,
  nullableUuidSchema,
  uuidSchema,
} from '@/common/swagger';

const paymentStatusValues = [
  'PENDING',
  'APPROVED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELED',
];

const paymentMethodTypeValues = ['CARD', 'PIX', 'BOLETO', 'WALLET'];
const planBillingCycleValues = ['MONTHLY', 'YEARLY'];
const subscriptionStatusValues = [
  'PENDING',
  'ACTIVE',
  'OVERDUE',
  'CANCELED',
  'EXPIRED',
];

export const setupIntentResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      example: 'seti_123456789',
    },
    clientSecret: {
      type: 'string',
      example: 'seti_123456789_secret_abc',
      nullable: true,
    },
  },
  required: ['id', 'clientSecret'],
};

export const savePaymentMethodRequestSchema = {
  type: 'object',
  properties: {
    stripePaymentMethodId: {
      type: 'string',
      example: 'pm_123456789',
    },
    isDefault: {
      type: 'boolean',
      example: true,
      nullable: true,
    },
  },
  required: ['stripePaymentMethodId'],
};

export const paymentMethodResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('a95d0c83-31c2-4d15-b06c-d11fa1c2e5f4'),
    userId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    type: {
      type: 'string',
      enum: paymentMethodTypeValues,
      example: 'CARD',
    },
    gatewayToken: {
      type: 'string',
      example: 'pm_123456789',
    },
    brand: nullableStringSchema('visa'),
    last4: nullableStringSchema('4242'),
    holderName: nullableStringSchema('Maria Oliveira'),
    expiresMonth: {
      type: 'integer',
      example: 12,
      nullable: true,
    },
    expiresYear: {
      type: 'integer',
      example: 2030,
      nullable: true,
    },
    isDefault: {
      type: 'boolean',
      example: true,
    },
    createdAt: dateTimeSchema('2026-06-12T18:00:00.000Z'),
  },
  required: ['id', 'userId', 'type', 'gatewayToken', 'isDefault', 'createdAt'],
};

export const paymentMethodListResponseSchema = {
  type: 'array',
  items: paymentMethodResponseSchema,
};

export const removePaymentMethodResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('a95d0c83-31c2-4d15-b06c-d11fa1c2e5f4'),
    removed: {
      type: 'boolean',
      example: true,
    },
  },
  required: ['id', 'removed'],
};

export const checkoutAppointmentRequestSchema = {
  type: 'object',
  properties: {
    professionalId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    paymentMethodId: uuidSchema('a95d0c83-31c2-4d15-b06c-d11fa1c2e5f4'),
    startsAt: dateTimeSchema('2026-06-20T14:00:00.000Z'),
    endsAt: dateTimeSchema('2026-06-20T14:50:00.000Z'),
    priceCents: {
      type: 'integer',
      minimum: 0,
      example: 15000,
    },
    userCouponId: nullableUuidSchema('d0a80121-0001-4000-8000-987654321012'),
  },
  required: ['professionalId', 'paymentMethodId', 'startsAt', 'endsAt', 'priceCents'],
};

export const paymentResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('d28d2d90-f6c3-4f35-9ec4-55ff49540d2a'),
    userId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    paymentMethodId: nullableUuidSchema('a95d0c83-31c2-4d15-b06c-d11fa1c2e5f4'),
    purpose: {
      type: 'string',
      example: 'PLAN_SUBSCRIPTION',
    },
    appointmentId: nullableUuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
    subscriptionId: nullableUuidSchema('4e4ff9ff-95e0-47c3-93a0-f5546af13e2f'),
    userCouponId: nullableUuidSchema('d0a80121-0001-4000-8000-987654321012'),
    originalAmountCents: {
      type: 'integer',
      example: 15000,
    },
    discountAmountCents: {
      type: 'integer',
      example: 3000,
    },
    walletAmountCents: {
      type: 'integer',
      example: 0,
    },
    finalAmountCents: {
      type: 'integer',
      example: 12000,
    },
    status: {
      type: 'string',
      enum: paymentStatusValues,
      example: 'APPROVED',
    },
    gatewayTransactionId: nullableStringSchema('pi_123456789'),
    createdAt: dateTimeSchema('2026-06-12T18:00:00.000Z'),
    paidAt: nullableDateTimeSchema('2026-06-12T18:01:00.000Z'),
  },
  required: [
    'id',
    'userId',
    'purpose',
    'originalAmountCents',
    'discountAmountCents',
    'walletAmountCents',
    'finalAmountCents',
    'status',
    'createdAt',
  ],
};

export const checkoutAppointmentResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('d28d2d90-f6c3-4f35-9ec4-55ff49540d2a'),
    appointmentId: nullableUuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
    status: {
      type: 'string',
      enum: paymentStatusValues,
      example: 'PENDING',
    },
    originalAmountCents: {
      type: 'integer',
      example: 15000,
    },
    discountAmountCents: {
      type: 'integer',
      example: 3000,
    },
    finalAmountCents: {
      type: 'integer',
      example: 12000,
    },
    gatewayTransactionId: nullableStringSchema('pi_123456789'),
    paidAt: nullableDateTimeSchema('2026-06-12T18:01:00.000Z'),
    clientSecret: {
      type: 'string',
      example: 'pi_123456789_secret_abc',
      nullable: true,
    },
    appointmentConfirmed: {
      type: 'boolean',
      example: false,
    },
  },
  required: [
    'id',
    'status',
    'originalAmountCents',
    'discountAmountCents',
    'finalAmountCents',
    'appointmentConfirmed',
  ],
};

export const webhookResponseSchema = {
  type: 'object',
  properties: {
    received: {
      type: 'boolean',
      example: true,
    },
  },
  required: ['received'],
};

export const createPlanRequestSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      example: 'Plano Essencial',
    },
    description: {
      type: 'string',
      example: 'Plano mensal com benefícios exclusivos para pacientes frequentes.',
      nullable: true,
    },
    priceCents: {
      type: 'integer',
      minimum: 0,
      example: 4990,
    },
    billingCycle: {
      type: 'string',
      enum: planBillingCycleValues,
      example: 'MONTHLY',
    },
    benefits: {
      type: 'array',
      items: { type: 'string' },
      example: [
        'Consultas com valor reduzido',
        'Pacote mensal de atendimento',
      ],
    },
    stripeProductId: {
      type: 'string',
      example: 'prod_plan_essential',
    },
    stripePriceId: {
      type: 'string',
      example: 'price_plan_essential_monthly',
    },
  },
  required: [
    'name',
    'priceCents',
    'billingCycle',
    'benefits',
    'stripeProductId',
    'stripePriceId',
  ],
};

export const planResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('8cf67c13-70a1-44dd-b6c9-b53c58a627f7'),
    name: {
      type: 'string',
      example: 'Plano Essencial',
    },
    description: nullableStringSchema(
      'Plano mensal com benefícios exclusivos para pacientes frequentes.',
    ),
    priceCents: {
      type: 'integer',
      example: 4990,
    },
    billingCycle: {
      type: 'string',
      enum: planBillingCycleValues,
      example: 'MONTHLY',
    },
    benefits: {
      type: 'array',
      items: { type: 'string' },
      example: [
        'Consultas com valor reduzido',
        'Pacote mensal de atendimento',
      ],
    },
    stripeProductId: {
      type: 'string',
      example: 'prod_plan_essential',
    },
    stripePriceId: {
      type: 'string',
      example: 'price_plan_essential_monthly',
    },
    isActive: {
      type: 'boolean',
      example: true,
    },
    createdAt: dateTimeSchema('2026-06-12T20:30:00.000Z'),
    updatedAt: dateTimeSchema('2026-06-12T20:30:00.000Z'),
  },
  required: [
    'id',
    'name',
    'priceCents',
    'billingCycle',
    'benefits',
    'stripeProductId',
    'stripePriceId',
    'isActive',
    'createdAt',
    'updatedAt',
  ],
};

export const planListResponseSchema = {
  type: 'array',
  items: planResponseSchema,
};

export const subscribePlanRequestSchema = {
  type: 'object',
  properties: {
    planId: uuidSchema('8cf67c13-70a1-44dd-b6c9-b53c58a627f7'),
    paymentMethodId: uuidSchema('a95d0c83-31c2-4d15-b06c-d11fa1c2e5f4'),
    userCouponId: nullableUuidSchema('d0a80121-0001-4000-8000-987654321012'),
  },
  required: ['planId', 'paymentMethodId'],
};

export const latestSubscriptionPaymentSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('b588cb9f-3ca6-4df4-b6fd-878ed60f0af0'),
    status: {
      type: 'string',
      enum: paymentStatusValues,
      example: 'APPROVED',
    },
    finalAmountCents: {
      type: 'integer',
      example: 3990,
    },
    paidAt: nullableDateTimeSchema('2026-06-12T20:35:00.000Z'),
    createdAt: dateTimeSchema('2026-06-12T20:34:00.000Z'),
  },
  required: ['id', 'status', 'finalAmountCents', 'createdAt'],
};

export const subscriptionResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('4e4ff9ff-95e0-47c3-93a0-f5546af13e2f'),
    userId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    planId: uuidSchema('8cf67c13-70a1-44dd-b6c9-b53c58a627f7'),
    status: {
      type: 'string',
      enum: subscriptionStatusValues,
      example: 'ACTIVE',
    },
    stripeSubscriptionId: nullableStringSchema('sub_123456789'),
    startedAt: nullableDateTimeSchema('2026-06-12T20:35:00.000Z'),
    currentPeriodStart: nullableDateTimeSchema('2026-06-12T20:35:00.000Z'),
    currentPeriodEnd: nullableDateTimeSchema('2026-07-12T20:35:00.000Z'),
    cancelAtPeriodEnd: {
      type: 'boolean',
      example: false,
    },
    canceledAt: nullableDateTimeSchema('2026-07-12T20:35:00.000Z'),
    endedAt: nullableDateTimeSchema('2026-07-12T20:35:00.000Z'),
    createdAt: dateTimeSchema('2026-06-12T20:34:00.000Z'),
    updatedAt: dateTimeSchema('2026-06-12T20:35:00.000Z'),
    plan: planResponseSchema,
    latestPayment: {
      ...latestSubscriptionPaymentSchema,
      nullable: true,
    },
  },
  required: [
    'id',
    'userId',
    'planId',
    'status',
    'cancelAtPeriodEnd',
    'createdAt',
    'updatedAt',
    'plan',
  ],
};

export const mySubscriptionResponseSchema = {
  type: 'object',
  properties: {
    subscription: {
      ...subscriptionResponseSchema,
      nullable: true,
    },
  },
  required: ['subscription'],
};

export const subscribePlanResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('d28d2d90-f6c3-4f35-9ec4-55ff49540d2a'),
    subscriptionId: nullableUuidSchema('4e4ff9ff-95e0-47c3-93a0-f5546af13e2f'),
    status: {
      type: 'string',
      enum: paymentStatusValues,
      example: 'PENDING',
    },
    originalAmountCents: {
      type: 'integer',
      example: 4990,
    },
    discountAmountCents: {
      type: 'integer',
      example: 1000,
    },
    finalAmountCents: {
      type: 'integer',
      example: 3990,
    },
    gatewayTransactionId: nullableStringSchema('pi_123456789'),
    paidAt: nullableDateTimeSchema('2026-06-12T20:35:00.000Z'),
    clientSecret: {
      type: 'string',
      example: 'pi_123456789_secret_abc',
      nullable: true,
    },
    currentPeriodStart: nullableDateTimeSchema('2026-06-12T20:35:00.000Z'),
    currentPeriodEnd: nullableDateTimeSchema('2026-07-12T20:35:00.000Z'),
    cancelAtPeriodEnd: {
      type: 'boolean',
      example: false,
    },
    subscriptionActivated: {
      type: 'boolean',
      example: true,
    },
    warning: {
      type: 'string',
      example: 'Desconto aplicado apenas para o primeiro mês',
      nullable: true,
    },
  },
  required: [
    'id',
    'status',
    'originalAmountCents',
    'discountAmountCents',
    'finalAmountCents',
    'cancelAtPeriodEnd',
    'subscriptionActivated',
  ],
};
