import {
  dateTimeSchema,
  nullableDateSchema,
  nullableStringSchema,
  roleEnumValues,
  userStatusEnumValues,
  uuidSchema,
} from '../../common/swagger/index';
import { patientProfileRequestSchema, patientProfileResponseSchema } from '../../patients/swagger/index';
import {
  professionalProfileCreateRequestSchema,
  professionalProfileResponseSchema,
  professionalProfileUpdateRequestSchema,
} from '../../professionals/swagger/index';

const userCreateBaseProperties = {
  name: {
    type: 'string',
    maxLength: 120,
    example: 'Maria Oliveira',
  },
  email: {
    type: 'string',
    format: 'email',
    maxLength: 255,
    example: 'maria.oliveira@psique.com',
  },
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 72,
    example: 'SenhaSegura123',
  },
  cpf: {
    type: 'string',
    maxLength: 14,
    example: '12345678901',
  },
  phone: {
    type: 'string',
    maxLength: 20,
    example: '(86) 98888-7777',
  },
  birthDate: {
    type: 'string',
    format: 'date',
    example: '1995-03-14',
  },
  gender: {
    type: 'string',
    example: 'Feminino',
  },
  avatarUrl: {
    type: 'string',
    example: 'https://cdn.psique.com/avatars/user-01.jpg',
  },
  bio: {
    type: 'string',
    maxLength: 500,
    example: 'Perfil criado para acompanhamento psicológico.',
  },
  cep: {
    type: 'string',
    maxLength: 9,
    example: '64000-000',
  },
  state: {
    type: 'string',
    maxLength: 2,
    example: 'PI',
  },
  city: {
    type: 'string',
    maxLength: 100,
    example: 'Teresina',
  },
  neighborhood: {
    type: 'string',
    maxLength: 100,
    example: 'Centro',
  },
  street: {
    type: 'string',
    maxLength: 150,
    example: 'Rua das Flores',
  },
  number: {
    type: 'string',
    maxLength: 20,
    example: '123',
  },
  complement: {
    type: 'string',
    maxLength: 100,
    example: 'Apto 202',
  },
};

const userCreateResponseBaseProperties = {
  id: uuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
  name: {
    type: 'string',
    example: 'Maria Oliveira',
  },
  email: {
    type: 'string',
    format: 'email',
    example: 'maria.oliveira@psique.com',
  },
  role: {
    type: 'string',
    enum: roleEnumValues,
    example: 'PATIENT',
  },
  birthDate: nullableDateSchema('1995-03-14'),
};

export const userListItemProperties = {
  id: uuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
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
  bio: nullableStringSchema('Perfil criado para acompanhamento psicológico.'),
  avatarUrl: nullableStringSchema('https://cdn.psique.com/avatars/user-01.jpg'),
  cep: nullableStringSchema('64000-000'),
  state: nullableStringSchema('PI'),
  city: nullableStringSchema('Teresina'),
  neighborhood: nullableStringSchema('Centro'),
  street: nullableStringSchema('Rua das Flores'),
  number: nullableStringSchema('123'),
  complement: nullableStringSchema('Apto 202'),
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const createUserRequestSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        ...userCreateBaseProperties,
        role: {
          type: 'string',
          enum: ['ADMIN'],
          example: 'ADMIN',
        },
      },
      required: ['name', 'email', 'password', 'role'],
    },
    {
      type: 'object',
      properties: {
        ...userCreateBaseProperties,
        role: {
          type: 'string',
          enum: ['PATIENT'],
          example: 'PATIENT',
        },
        patientProfile: patientProfileRequestSchema,
      },
      required: ['name', 'email', 'password', 'role'],
    },
    {
      type: 'object',
      properties: {
        ...userCreateBaseProperties,
        role: {
          type: 'string',
          enum: ['PROFESSIONAL'],
          example: 'PROFESSIONAL',
        },
        professionalProfile: professionalProfileCreateRequestSchema,
      },
      required: ['name', 'email', 'password', 'role', 'professionalProfile'],
    },
  ],
};

export const createUserResponseSchema = {
  oneOf: [
    {
      type: 'object',
      properties: userCreateResponseBaseProperties,
      required: ['id', 'name', 'email', 'role', 'birthDate'],
    },
    {
      type: 'object',
      properties: {
        ...userCreateResponseBaseProperties,
        patientProfile: patientProfileResponseSchema,
      },
      required: ['id', 'name', 'email', 'role', 'birthDate', 'patientProfile'],
    },
    {
      type: 'object',
      properties: {
        ...userCreateResponseBaseProperties,
        professionalProfile: professionalProfileResponseSchema,
      },
      required: [
        'id',
        'name',
        'email',
        'role',
        'birthDate',
        'professionalProfile',
      ],
    },
  ],
};

export const userListItemSchema = {
  type: 'object',
  properties: userListItemProperties,
  required: [
    'id',
    'name',
    'email',
    'role',
    'status',
    'createdAt',
    'updatedAt',
  ],
};

export const userListResponseSchema = {
  type: 'array',
  items: userListItemSchema,
};

export const updateUserRequestSchema = {
  type: 'object',
  properties: {
    name: userCreateBaseProperties.name,
    phone: userCreateBaseProperties.phone,
    birthDate: userCreateBaseProperties.birthDate,
    gender: userCreateBaseProperties.gender,
    avatarUrl: userCreateBaseProperties.avatarUrl,
    bio: userCreateBaseProperties.bio,
    cep: userCreateBaseProperties.cep,
    state: userCreateBaseProperties.state,
    city: userCreateBaseProperties.city,
    neighborhood: userCreateBaseProperties.neighborhood,
    street: userCreateBaseProperties.street,
    number: userCreateBaseProperties.number,
    complement: userCreateBaseProperties.complement,
    patientProfile: patientProfileRequestSchema,
    professionalProfile: professionalProfileUpdateRequestSchema,
  },
};

