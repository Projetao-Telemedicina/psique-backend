import {
  dateTimeSchema,
  nullableDateTimeSchema,
  uuidSchema,
} from '../../common/swagger';

const couponCategoryValues = ['SINGLE_APPOINTMENT', 'PLAN_SUBSCRIPTION'];
const couponDiscountTypeValues = ['PERCENTAGE', 'FIXED'];
const couponDistributionTypeValues = ['PUBLIC', 'TARGETED'];

export const createCouponRequestSchema = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'PSIQUE-BEMVINDO' },
    title: { type: 'string', example: 'Bem-vindo ao Psique' },
    description: { type: 'string', example: 'Desconto de boas-vindas', nullable: true },
    category: { type: 'string', enum: couponCategoryValues, example: 'SINGLE_APPOINTMENT' },
    discountType: { type: 'string', enum: couponDiscountTypeValues, example: 'PERCENTAGE' },
    discountValue: { type: 'number', example: 20 },
    maxDiscountCents: { type: 'integer', example: 10000, nullable: true },
    minPurchaseCents: { type: 'integer', example: 0, nullable: true },
    maxUses: { type: 'integer', example: 100, nullable: true },
    maxUsesPerUser: { type: 'integer', example: 1, nullable: true },
    distributionType: {
      type: 'string', enum: couponDistributionTypeValues, example: 'PUBLIC', nullable: true,
    },
    firstMonthOnly: { type: 'boolean', example: false, nullable: true },
    expiresAt: { type: 'string', format: 'date-time', example: '2027-06-01T00:00:00.000Z' },
    isActive: { type: 'boolean', example: true, nullable: true },
  },
  required: ['code', 'title', 'category', 'discountType', 'discountValue', 'expiresAt'],
};

export const couponResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('c0a80121-0001-4000-8000-123456789012'),
    code: { type: 'string', example: 'PSIQUE-BEMVINDO' },
    title: { type: 'string', example: 'Bem-vindo ao Psique' },
    description: { type: 'string', example: 'Desconto de boas-vindas', nullable: true },
    category: { type: 'string', enum: couponCategoryValues, example: 'SINGLE_APPOINTMENT' },
    discountType: { type: 'string', enum: couponDiscountTypeValues, example: 'PERCENTAGE' },
    discountValue: { type: 'number', example: 20 },
    maxDiscountCents: { type: 'integer', example: 10000, nullable: true },
    minPurchaseCents: { type: 'integer', example: 0, nullable: true },
    maxUses: { type: 'integer', example: 100, nullable: true },
    currentUses: { type: 'integer', example: 0 },
    maxUsesPerUser: { type: 'integer', example: 1 },
    distributionType: { type: 'string', enum: couponDistributionTypeValues, example: 'PUBLIC' },
    firstMonthOnly: { type: 'boolean', example: false },
    expiresAt: dateTimeSchema('2027-06-01T00:00:00.000Z'),
    isActive: { type: 'boolean', example: true },
    createdAt: dateTimeSchema('2026-03-01T10:00:00.000Z'),
    updatedAt: dateTimeSchema('2026-03-01T10:00:00.000Z'),
  },
  required: [
    'id', 'code', 'title', 'category', 'discountType', 'discountValue',
    'maxUsesPerUser', 'distributionType', 'firstMonthOnly',
    'expiresAt', 'isActive', 'currentUses', 'createdAt', 'updatedAt',
  ],
};

export const couponListResponseSchema = {
  type: 'array',
  items: couponResponseSchema,
};

export const userCouponResponseSchema = {
  type: 'object',
  properties: {
    userCouponId: uuidSchema('d0a80121-0001-4000-8000-987654321012'),
    code: { type: 'string', example: 'PSIQUE-BEMVINDO' },
    title: { type: 'string', example: 'Bem-vindo ao Psique' },
    category: { type: 'string', enum: couponCategoryValues, example: 'SINGLE_APPOINTMENT' },
    discountType: { type: 'string', enum: couponDiscountTypeValues, example: 'PERCENTAGE' },
    discountValue: { type: 'number', example: 20 },
    maxDiscountCents: { type: 'integer', example: 10000, nullable: true },
    expiresAt: { type: 'string', format: 'date-time', example: '2027-06-01T00:00:00.000Z' },
  },
  required: [
    'userCouponId', 'code', 'title', 'category',
    'discountType', 'discountValue', 'maxDiscountCents', 'expiresAt',
  ],
};

export const userCouponListResponseSchema = {
  type: 'array',
  items: userCouponResponseSchema,
};

export const applyCouponResponseSchema = {
  type: 'object',
  properties: {
    originalAmountCents: { type: 'integer', example: 10000 },
    discountAppliedCents: { type: 'integer', example: 2000 },
    finalAmountCents: { type: 'integer', example: 8000 },
    couponCode: { type: 'string', example: 'PSIQUE-BEMVINDO' },
    message: { type: 'string', example: 'Desconto aplicado' },
    couponStatus: { type: 'string', example: 'applied' },
  },
  required: [
    'originalAmountCents', 'discountAppliedCents', 'finalAmountCents',
    'couponCode', 'message', 'couponStatus',
  ],
};

export const updateCouponRequestSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', example: 'Bem-vindo atualizado', nullable: true },
    description: { type: 'string', example: 'Nova descrição', nullable: true },
    category: { type: 'string', enum: couponCategoryValues, nullable: true },
    discountType: { type: 'string', enum: couponDiscountTypeValues, nullable: true },
    discountValue: { type: 'number', example: 25, nullable: true },
    maxDiscountCents: { type: 'integer', example: 15000, nullable: true },
    minPurchaseCents: { type: 'integer', example: 5000, nullable: true },
    maxUses: { type: 'integer', example: 200, nullable: true },
    maxUsesPerUser: { type: 'integer', example: 2, nullable: true },
    distributionType: { type: 'string', enum: couponDistributionTypeValues, nullable: true },
    firstMonthOnly: { type: 'boolean', example: true, nullable: true },
    expiresAt: { type: 'string', format: 'date-time', nullable: true },
    isActive: { type: 'boolean', example: false, nullable: true },
  },
};

export const distributeCouponResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('e0a80121-0001-4000-8000-111111111111'),
    couponId: uuidSchema('c0a80121-0001-4000-8000-123456789012'),
    userId: uuidSchema('f0a80121-0001-4000-8000-222222222222'),
    claimedAt: dateTimeSchema('2026-03-01T12:00:00.000Z'),
    usedAt: nullableDateTimeSchema(),
    isUsed: { type: 'boolean', example: false },
    reservedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
  },
  required: ['id', 'couponId', 'userId', 'claimedAt', 'isUsed'],
};

export const reserveCouponResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('d0a80121-0001-4000-8000-987654321012'),
    couponId: uuidSchema('c0a80121-0001-4000-8000-123456789012'),
    userId: uuidSchema('f0a80121-0001-4000-8000-222222222222'),
    claimedAt: dateTimeSchema('2026-03-01T12:00:00.000Z'),
    usedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    isUsed: { type: 'boolean', example: false },
    reservedAt: dateTimeSchema('2026-03-01T12:30:00.000Z'),
  },
  required: ['id', 'couponId', 'userId', 'claimedAt', 'isUsed', 'reservedAt'],
};

export const claimCouponResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('d0a80121-0001-4000-8000-987654321012'),
    couponId: uuidSchema('c0a80121-0001-4000-8000-123456789012'),
    userId: uuidSchema('f0a80121-0001-4000-8000-222222222222'),
    claimedAt: dateTimeSchema('2026-03-01T12:00:00.000Z'),
    usedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    isUsed: { type: 'boolean', example: false },
    reservedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
  },
  required: ['id', 'couponId', 'userId', 'claimedAt', 'isUsed'],
};

export const applyCouponRequestSchema = {
  type: 'object',
  properties: {
    userCouponId: uuidSchema('d0a80121-0001-4000-8000-987654321012'),
    amountCents: { type: 'integer', example: 10000 },
    category: { type: 'string', enum: couponCategoryValues, example: 'SINGLE_APPOINTMENT' },
  },
  required: ['userCouponId', 'amountCents', 'category'],
};
