import {
  dateTimeSchema,
  nullableStringSchema,
  uuidSchema,
} from '../../common/swagger';

export const reviewResponseSchema = {
  type: 'object',
  properties: {
    id: uuidSchema('e22b3fd1-4a5c-4f82-8a6f-86f60a2e4c8b'),
    appointmentId: uuidSchema('a97b7a87-2670-4b73-b223-2269b4c43f3a'),
    patientId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
    professionalId: uuidSchema('c19d0f32-4892-4e95-b445-2481d6e65b5c'),
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      example: 5,
    },
    comment: nullableStringSchema('Atendimento excelente e acolhedor.'),
    createdAt: dateTimeSchema('2026-05-15T14:50:00.000Z'),
  },
  required: [
    'id',
    'appointmentId',
    'patientId',
    'professionalId',
    'rating',
    'createdAt',
  ],
};

export const reviewListResponseSchema = {
  type: 'array',
  items: reviewResponseSchema,
};

export const createReviewRequestSchema = {
  type: 'object',
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      example: 5,
    },
    comment: {
      type: 'string',
      maxLength: 1000,
      example: 'Consulta muito positiva, recomendo.',
    },
  },
  required: ['rating'],
};
