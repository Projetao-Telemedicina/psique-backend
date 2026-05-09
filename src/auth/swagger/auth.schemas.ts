import {
  dateTimeSchema,
  roleEnumValues,
  userStatusEnumValues,
  uuidSchema,
} from '../../common/swagger/index';
import {
  createUserRequestSchema,
  createUserResponseSchema,
  userListItemSchema,
} from '../../users/swagger/index';

export { createUserRequestSchema, createUserResponseSchema, userListItemSchema };

export const loginRequestSchema = {
  type: 'object',
  properties: {
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
  },
  required: ['email', 'password'],
};

export const authTokensResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      example:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token.signature',
    },
    refreshToken: {
      type: 'string',
      example:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token.signature',
    },
  },
  required: ['accessToken', 'refreshToken'],
};

export const refreshAuthorizationHeaderSchema = {
  type: 'string',
  example:
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token.signature',
};

export const authenticatedUserResponseSchema = {
  type: 'object',
  properties: {
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
    status: {
      type: 'string',
      enum: userStatusEnumValues,
      example: 'ACTIVE',
    },
    createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
    updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
  },
  required: ['id', 'name', 'email', 'role', 'status', 'createdAt', 'updatedAt'],
};

export const revokeTokensRequestSchema = {
  type: 'object',
  properties: {
    userId: uuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
  },
  required: ['userId'],
};

export const revokeTokensResponseSchema = {
  type: 'object',
  properties: {
    revoked: {
      type: 'boolean',
      example: true,
    },
  },
  required: ['revoked'],
};

