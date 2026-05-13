import {
  dateTimeSchema,
  nullableDateSchema,
  nullableStringSchema,
  roleEnumValues,
  userStatusEnumValues,
  uuidSchema,
} from '../../common/swagger/index';

export const patientProfileRequestProperties = {
  emergencyContactName: {
    type: 'string',
    maxLength: 120,
    example: 'Ana Souza',
  },
  emergencyContactPhone: {
    type: 'string',
    maxLength: 20,
    example: '(86) 99999-0000',
  },
  shareDiaryWithProfessionals: {
    type: 'boolean',
    example: true,
  },
};

export const patientProfileRequestSchema = {
  type: 'object',
  properties: patientProfileRequestProperties,
};

export const patientProfileResponseProperties = {
  userId: uuidSchema('fd356e1a-5614-46cf-a870-4bcb4f0f6ed8'),
  emergencyContactName: nullableStringSchema('Ana Souza'),
  emergencyContactPhone: nullableStringSchema('(86) 99999-0000'),
  shareDiaryWithProfessionals: {
    type: 'boolean',
    example: true,
  },
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const patientProfileResponseSchema = {
  type: 'object',
  properties: patientProfileResponseProperties,
  required: [
    'userId',
    'shareDiaryWithProfessionals',
    'createdAt',
    'updatedAt',
  ],
};

const patientUserProperties = {
  name: {
    type: 'string',
    example: 'Maria Oliveira',
  },
  cpf: nullableStringSchema('12345678901'),
  email: {
    type: 'string',
    format: 'email',
    example: 'maria.oliveira@psique.com',
  },
  birthDate: nullableDateSchema('1995-03-14'),
  gender: nullableStringSchema('Feminino'),
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
  phone: nullableStringSchema('(86) 98888-7777'),
  bio: nullableStringSchema('Paciente em acompanhamento psicológico.'),
  avatarUrl: nullableStringSchema('https://cdn.psique.com/avatars/patient-01.jpg'),
  cep: nullableStringSchema('64000-000'),
  state: nullableStringSchema('PI'),
  city: nullableStringSchema('Teresina'),
  neighborhood: nullableStringSchema('Centro'),
  street: nullableStringSchema('Rua das Flores'),
  number: nullableStringSchema('123'),
  complement: nullableStringSchema('Apto 202'),
};

export const patientProfileWithUserResponseSchema = {
  type: 'object',
  properties: {
    ...patientProfileResponseProperties,
    user: {
      type: 'object',
      properties: patientUserProperties,
      required: ['name', 'email', 'role', 'status'],
    },
  },
  required: [
    'userId',
    'shareDiaryWithProfessionals',
    'createdAt',
    'updatedAt',
    'user',
  ],
};

