import {
  dateTimeSchema,
  nullableDateTimeSchema,
  nullableStringSchema,
  nullableUuidSchema,
  onlineStatusEnumValues,
  professionalApprovalStatusEnumValues,
  roleEnumValues,
  userStatusEnumValues,
  uuidSchema,
} from '../../common/swagger';

export const panicButtonActivationStatusEnumValues = [
  'SEARCHING',
  'OFFER_PENDING',
  'MATCHED',
  'EXPIRED',
  'CANCELLED',
];

export const panicButtonOfferStatusEnumValues = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

const userSummarySchema = {
  type: 'object',
  properties: {
    id: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    name: {
      type: 'string',
      example: 'Maria Oliveira',
    },
    role: {
      type: 'string',
      enum: roleEnumValues,
      example: 'PATIENT',
    },
    status: {
      type: 'string',
      enum: userStatusEnumValues,
      example: 'ACTIVE',
    },
  },
  required: ['id', 'name', 'role', 'status'],
};

const patientSummarySchema = {
  type: 'object',
  properties: {
    user: userSummarySchema,
  },
  required: ['user'],
};

const professionalSummarySchema = {
  type: 'object',
  properties: {
    userId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    crp: {
      type: 'string',
      example: '06/123456',
    },
    approvalStatus: {
      type: 'string',
      enum: professionalApprovalStatusEnumValues,
      example: 'APPROVED',
    },
    onlineStatus: {
      type: 'string',
      enum: onlineStatusEnumValues,
      example: 'ONLINE',
    },
    availableForEmergency: {
      type: 'boolean',
      example: true,
    },
    user: userSummarySchema,
  },
  required: [
    'userId',
    'crp',
    'approvalStatus',
    'onlineStatus',
    'availableForEmergency',
    'user',
  ],
};

export const panicButtonOfferResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('f6db4926-dcb9-4b01-a16c-27ecb4d63c4a'),
    emergencyRequestId: uuidSchema('ef1f9fb2-65b9-45cd-aaf3-4b7758b7b9c0'),
    professionalId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    status: {
      type: 'string',
      enum: panicButtonOfferStatusEnumValues,
      example: 'PENDING',
    },
    attemptNumber: {
      type: 'integer',
      minimum: 1,
      example: 1,
    },
    sentAt: dateTimeSchema('2026-05-20T18:00:00.000Z'),
    expiresAt: dateTimeSchema('2026-05-20T18:00:15.000Z'),
    respondedAt: nullableDateTimeSchema('2026-05-20T18:00:12.000Z'),
    rejectionReason: nullableStringSchema('Profissional indisponível no momento.'),
    createdAt: dateTimeSchema('2026-05-20T18:00:00.000Z'),
    updatedAt: dateTimeSchema('2026-05-20T18:00:12.000Z'),
    professional: professionalSummarySchema,
  },
  required: [
    'id',
    'emergencyRequestId',
    'professionalId',
    'status',
    'attemptNumber',
    'sentAt',
    'expiresAt',
    'createdAt',
    'updatedAt',
    'professional',
  ],
};

export const panicButtonActivationResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('ef1f9fb2-65b9-45cd-aaf3-4b7758b7b9c0'),
    patientId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    status: {
      type: 'string',
      enum: panicButtonActivationStatusEnumValues,
      example: 'SEARCHING',
    },
    matchedProfessionalId: nullableUuidSchema(
      'c19d0f32-4892-4e95-b445-2481d6e65b5c',
    ),
    notes: nullableStringSchema(
      'Paciente em situação de sofrimento agudo e precisa de acolhimento.',
    ),
    expiresAt: dateTimeSchema('2026-05-20T18:01:00.000Z'),
    matchedAt: nullableDateTimeSchema('2026-05-20T18:00:12.000Z'),
    cancelledAt: nullableDateTimeSchema('2026-05-20T18:02:00.000Z'),
    closedAt: nullableDateTimeSchema('2026-05-20T18:02:00.000Z'),
    createdAt: dateTimeSchema('2026-05-20T18:00:00.000Z'),
    updatedAt: dateTimeSchema('2026-05-20T18:00:12.000Z'),
    patient: patientSummarySchema,
    matchedProfessional: {
      ...professionalSummarySchema,
      nullable: true,
    },
    offers: {
      type: 'array',
      items: panicButtonOfferResponseSchema,
    },
  },
  required: [
    'id',
    'patientId',
    'status',
    'expiresAt',
    'createdAt',
    'updatedAt',
    'patient',
    'offers',
  ],
};

export const createPanicButtonActivationSchema = {
  type: 'object',
  properties: {
    notes: {
      type: 'string',
      maxLength: 1000,
      example:
        'Paciente em situação de sofrimento agudo e precisa de acolhimento.',
    },
  },
};

export const cancelPanicButtonActivationSchema = {
  type: 'object',
  properties: {
    reason: {
      type: 'string',
      maxLength: 500,
      example: 'Paciente conseguiu apoio por outro canal.',
    },
  },
};

export const rejectPanicButtonOfferSchema = {
  type: 'object',
  properties: {
    reason: {
      type: 'string',
      maxLength: 500,
      example: 'Não consigo assumir atendimento urgente neste momento.',
    },
  },
};
