import {
    appointmentCanceledByEnumValues,
    appointmentStatusEnumValues,
    dateTimeSchema,
    nullableDateTimeSchema,
    nullableStringSchema,
    nullableUuidSchema,
    uuidSchema,
} from '../../common/swagger';

const userMiniSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      example: 'Maria Oliveira',
    },
    avatarUrl: nullableStringSchema(
      'https://cdn.psique.com/avatars/user-01.jpg',
    ),
  },
  required: ['name'],
};

const professionalMiniSchema = {
  type: 'object',
  properties: {
    userId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    crp: {
      type: 'string',
      example: '06/123456',
    },
    specialty: nullableStringSchema('Psicologia Clínica'),
    user: userMiniSchema,
  },
  required: ['userId', 'crp', 'user'],
};

const patientMiniSchema = {
  type: 'object',
  properties: {
    userId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    user: userMiniSchema,
  },
  required: ['userId', 'user'],
};

const appointmentBaseProperties = {
  id: uuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
  patientId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
  professionalId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
  status: {
    type: 'string',
    enum: appointmentStatusEnumValues,
    example: 'SCHEDULED',
  },
  startsAt: dateTimeSchema('2026-05-15T14:00:00.000Z'),
  endsAt: dateTimeSchema('2026-05-15T14:50:00.000Z'),
  priceCents: {
    type: 'integer',
    minimum: 0,
    example: 15000,
  },
  confirmedAt: nullableDateTimeSchema('2026-05-10T09:30:00.000Z'),
  canceledBy: {
    type: 'string',
    enum: appointmentCanceledByEnumValues,
    nullable: true,
    example: 'PATIENT',
  },
  cancellationReason: nullableStringSchema('Imprevisto pessoal.'),
  canceledAt: nullableDateTimeSchema('2026-05-12T18:00:00.000Z'),
  completedAt: nullableDateTimeSchema('2026-05-15T14:50:00.000Z'),
  rescheduledFromAppointmentId: nullableUuidSchema(
    'd20e1043-5903-4fa6-c556-3592e7f76c6d',
  ),
  attendanceCertificateUrl: nullableStringSchema(
    'https://cdn.psique.com/certificates/cert-01.pdf',
  ),
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

const appointmentRequiredFields = [
  'id',
  'patientId',
  'professionalId',
  'status',
  'startsAt',
  'endsAt',
  'priceCents',
  'createdAt',
  'updatedAt',
];

export const appointmentResponseSchema = {
  type: 'object',
  properties: appointmentBaseProperties,
  required: appointmentRequiredFields,
};

export const appointmentWithProfessionalSchema = {
  type: 'object',
  properties: {
    ...appointmentBaseProperties,
    professional: professionalMiniSchema,
  },
  required: [...appointmentRequiredFields, 'professional'],
};

export const appointmentWithPatientSchema = {
  type: 'object',
  properties: {
    ...appointmentBaseProperties,
    patient: patientMiniSchema,
  },
  required: [...appointmentRequiredFields, 'patient'],
};

export const appointmentListResponseSchema = {
  type: 'array',
  items: appointmentResponseSchema,
};

export const upcomingAppointmentsListResponseSchema = {
  type: 'array',
  description:
    'Lista de consultas futuras. Vazia quando não há consultas agendadas.',
  items: {
    oneOf: [appointmentWithProfessionalSchema, appointmentWithPatientSchema],
  },
};

export const appointmentHistoryListResponseSchema = {
  type: 'array',
  description: 'Histórico de consultas finalizadas, canceladas ou ausências.',
  items: {
    oneOf: [appointmentWithProfessionalSchema, appointmentWithPatientSchema],
  },
};

export const createAppointmentRequestSchema = {
  type: 'object',
  properties: {
    professionalId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    patientId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    startsAt: dateTimeSchema('2026-05-15T14:00:00.000Z'),
    endsAt: dateTimeSchema('2026-05-15T14:50:00.000Z'),
    priceCents: {
      type: 'integer',
      minimum: 0,
      example: 15000,
    },
  },
  required: ['professionalId', 'startsAt', 'endsAt'],
};

export const createAppointmentResponseSchema = appointmentResponseSchema;

export const updateAppointmentRequestSchema = {
  type: 'object',
  properties: {
    startsAt: dateTimeSchema('2026-05-15T14:00:00.000Z'),
    endsAt: dateTimeSchema('2026-05-15T14:50:00.000Z'),
    priceCents: {
      type: 'integer',
      minimum: 0,
      example: 15000,
    },
  },
};

export const updateAppointmentResponseSchema = appointmentResponseSchema;

export const updateAppointmentStatusRequestSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: appointmentStatusEnumValues,
      example: 'COMPLETED',
    },
  },
  required: ['status'],
};

export const cancelAppointmentRequestSchema = {
  type: 'object',
  properties: {
    canceledBy: {
      type: 'string',
      enum: appointmentCanceledByEnumValues,
      example: 'PATIENT',
    },
    cancellationReason: {
      type: 'string',
      maxLength: 500,
      example: 'Imprevisto pessoal.',
    },
  },
  required: ['canceledBy'],
};