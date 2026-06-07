import {
  dateTimeSchema,
  uuidSchema,
} from '../../../common/swagger';

const recurrenceTypeEnumValues = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

const weekdaySchema = {
  type: 'integer',
  minimum: 0,
  maximum: 6,
  description: 'Dia da semana (0 = domingo, 6 = sábado)',
  example: 1,
};

const timeSchema = (example: string) => ({
  type: 'string',
  pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
  description: 'Horário no formato HH:MM',
  example,
});

export const professionalAvailabilityResponseProperties = {
  id: uuidSchema('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  professionalId: uuidSchema('1ff7c594-8447-4f93-855d-236d7369a7eb'),
  weekday: weekdaySchema,
  startTime: timeSchema('08:00'),
  endTime: timeSchema('12:00'),
  slotDurationMinutes: {
    type: 'integer',
    minimum: 30,
    maximum: 120,
    example: 50,
  },
  recurrence: {
    type: 'string',
    enum: recurrenceTypeEnumValues,
    example: 'WEEKLY',
  },
  isActive: {
    type: 'boolean',
    example: true,
  },
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const professionalAvailabilityResponseSchema = {
  type: 'object',
  properties: professionalAvailabilityResponseProperties,
  required: [
    'id',
    'professionalId',
    'weekday',
    'startTime',
    'endTime',
    'slotDurationMinutes',
    'recurrence',
    'isActive',
    'createdAt',
    'updatedAt',
  ],
};

export const professionalAvailabilityListResponseSchema = {
  type: 'array',
  description: 'Lista de disponibilidades ativas, ordenadas por dia da semana e horário inicial.',
  items: professionalAvailabilityResponseSchema,
};

export const createAvailabilityRequestSchema = {
  type: 'object',
  properties: {
    weekday: weekdaySchema,
    startTime: timeSchema('08:00'),
    endTime: timeSchema('12:00'),
    recurrence: {
      type: 'string',
      enum: recurrenceTypeEnumValues,
      example: 'WEEKLY',
    },
    slotDurationMinutes: {
      type: 'integer',
      minimum: 30,
      maximum: 120,
      default: 60,
      example: 50,
    },
  },
  required: ['weekday', 'startTime', 'endTime', 'recurrence'],
};

export const updateAvailabilityRequestSchema = {
  type: 'object',
  properties: {
    startTime: timeSchema('09:00'),
    endTime: timeSchema('13:00'),
    slotDurationMinutes: {
      type: 'integer',
      minimum: 30,
      maximum: 120,
      example: 60,
    },
    recurrence: {
      type: 'string',
      enum: recurrenceTypeEnumValues,
      example: 'BIWEEKLY',
    },
  },
};

export const availableSlotsResponseSchema = {
  type: 'array',
  description: 'Slots disponíveis para a data solicitada, já descontando consultas agendadas e o intervalo entre consultas.',
  items: {
    type: 'object',
    properties: {
      startsAt: dateTimeSchema('2026-05-15T08:00:00.000Z'),
      endsAt: dateTimeSchema('2026-05-15T08:50:00.000Z'),
    },
    required: ['startsAt', 'endsAt'],
  },
};
