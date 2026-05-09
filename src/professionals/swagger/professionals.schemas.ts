import {
  dateTimeSchema,
  nullableDateSchema,
  nullableStringSchema,
  onlineStatusEnumValues,
  professionalApprovalStatusEnumValues,
  roleEnumValues,
  userStatusEnumValues,
  uuidSchema,
} from '../../common/swagger/index';

export const professionalProfileCreateRequestProperties = {
  crp: {
    type: 'string',
    maxLength: 20,
    example: '06/123456',
  },
  specialty: {
    type: 'string',
    maxLength: 80,
    example: 'Terapia Cognitivo-Comportamental',
  },
  approvalStatus: {
    type: 'string',
    enum: professionalApprovalStatusEnumValues,
    example: 'PENDING',
  },
  onlineStatus: {
    type: 'string',
    enum: onlineStatusEnumValues,
    example: 'OFFLINE',
  },
  availableForEmergency: {
    type: 'boolean',
    example: false,
  },
  autoAbsenceMessage: {
    type: 'string',
    maxLength: 255,
    example: 'Retorno em até 2 horas.',
  },
  gapBetweenAppointmentsMinutes: {
    type: 'integer',
    minimum: 0,
    example: 15,
  },
};

export const professionalProfileCreateRequestSchema = {
  type: 'object',
  properties: professionalProfileCreateRequestProperties,
  required: ['crp'],
};

export const professionalProfileUpdateRequestProperties = {
  specialty: professionalProfileCreateRequestProperties.specialty,
  approvalStatus: professionalProfileCreateRequestProperties.approvalStatus,
  onlineStatus: professionalProfileCreateRequestProperties.onlineStatus,
  availableForEmergency:
    professionalProfileCreateRequestProperties.availableForEmergency,
  autoAbsenceMessage:
    professionalProfileCreateRequestProperties.autoAbsenceMessage,
  gapBetweenAppointmentsMinutes:
    professionalProfileCreateRequestProperties.gapBetweenAppointmentsMinutes,
};

export const professionalProfileUpdateRequestSchema = {
  type: 'object',
  properties: professionalProfileUpdateRequestProperties,
};

export const professionalOnlineModeUpdateRequestSchema = {
  type: 'object',
  properties: {
    onlineMode: professionalProfileCreateRequestProperties.onlineStatus,
  },
  required: ['onlineMode'],
};

export const professionalProfileResponseProperties = {
  userId: uuidSchema('1ff7c594-8447-4f93-855d-236d7369a7eb'),
  crp: {
    type: 'string',
    example: '06/123456',
  },
  specialty: nullableStringSchema('Terapia Cognitivo-Comportamental'),
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
  autoAbsenceMessage: nullableStringSchema('Atendimento retomado às 14h.'),
  gapBetweenAppointmentsMinutes: {
    type: 'integer',
    example: 15,
  },
  scoreAvg: {
    type: 'string',
    example: '4.75',
  },
  reviewCount: {
    type: 'integer',
    example: 38,
  },
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const professionalProfileResponseSchema = {
  type: 'object',
  properties: professionalProfileResponseProperties,
  required: [
    'userId',
    'crp',
    'approvalStatus',
    'onlineStatus',
    'availableForEmergency',
    'gapBetweenAppointmentsMinutes',
    'scoreAvg',
    'reviewCount',
    'createdAt',
    'updatedAt',
  ],
};

const professionalUserProperties = {
  name: {
    type: 'string',
    example: 'Dr. Lucas Andrade',
  },
  cpf: nullableStringSchema('98765432100'),
  email: {
    type: 'string',
    format: 'email',
    example: 'lucas.andrade@psique.com',
  },
  birthDate: nullableDateSchema('1988-09-30'),
  gender: nullableStringSchema('Masculino'),
  role: {
    type: 'string',
    enum: roleEnumValues,
    example: 'PROFESSIONAL',
  },
  status: {
    type: 'string',
    enum: userStatusEnumValues,
    example: 'ACTIVE',
  },
  phone: nullableStringSchema('(11) 97777-6666'),
  bio: nullableStringSchema('Psicólogo clínico com foco em ansiedade e burnout.'),
  avatarUrl: nullableStringSchema('https://cdn.psique.com/avatars/professional-01.jpg'),
  cep: nullableStringSchema('04567-000'),
  state: nullableStringSchema('SP'),
  city: nullableStringSchema('São Paulo'),
  neighborhood: nullableStringSchema('Pinheiros'),
  street: nullableStringSchema('Rua dos Pinheiros'),
  number: nullableStringSchema('456'),
  complement: nullableStringSchema('Sala 8'),
};

export const professionalProfileWithUserResponseSchema = {
  type: 'object',
  properties: {
    ...professionalProfileResponseProperties,
    user: {
      type: 'object',
      properties: professionalUserProperties,
      required: ['name', 'email', 'role', 'status'],
    },
  },
  required: [
    'userId',
    'crp',
    'approvalStatus',
    'onlineStatus',
    'availableForEmergency',
    'gapBetweenAppointmentsMinutes',
    'scoreAvg',
    'reviewCount',
    'createdAt',
    'updatedAt',
    'user',
  ],
};

