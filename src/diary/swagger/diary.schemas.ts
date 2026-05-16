import {
    dateTimeSchema,
    nullableStringSchema,
    uuidSchema,
} from '../../common/swagger';

export const diaryFeelingEnumValues = [
  'HAPPY',
  'SCARED',
  'SAD',
  'ANXIOUS',
  'ANGRY',
  'CALM',
  'OVERWHELMED',
  'HOPEFUL',
  'EXHAUSTED',
];

export const diarySleepQualityEnumValues = [
  'EIGHT_OR_MORE',
  'SIX_TO_EIGHT',
  'FOUR_TO_FIVE',
  'LESS_THAN_FOUR',
];

export const diaryEntryProperties = {
  id: uuidSchema('5b2a1cf8-8525-4c6e-9d1a-28a92c5d3b7e'),
  patientId: uuidSchema('b08c9e21-3781-4d84-a334-1370c5d54a4b'),
  feeling: {
    type: 'string',
    enum: diaryFeelingEnumValues,
    example: 'CALM',
  },
  sleepQuality: {
    type: 'string',
    enum: diarySleepQualityEnumValues,
    nullable: true,
    example: 'SIX_TO_EIGHT',
  },
  symptom: nullableStringSchema('Ansiedade'),
  content: nullableStringSchema('Dia tranquilo, pratiquei respiracao guiada.'),
  createdAt: dateTimeSchema('2026-05-15T08:30:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-15T08:40:00.000Z'),
};

export const diaryEntryResponseSchema = {
  type: 'object',
  properties: diaryEntryProperties,
  required: ['id', 'patientId', 'feeling', 'createdAt', 'updatedAt'],
};

export const diaryEntryListResponseSchema = {
  type: 'array',
  items: diaryEntryResponseSchema,
};

export const createDiaryRequestSchema = {
  type: 'object',
  properties: {
    feeling: {
      type: 'string',
      enum: diaryFeelingEnumValues,
      example: 'CALM',
    },
    sleepQuality: {
      type: 'string',
      enum: diarySleepQualityEnumValues,
      example: 'SIX_TO_EIGHT',
    },
    symptom: {
      type: 'string',
      maxLength: 100,
      example: 'Ansiedade leve',
    },
    content: {
      type: 'string',
      maxLength: 2000,
      example: 'Senti-me mais calmo apos a sessao de hoje.',
    },
  },
  required: ['feeling'],
};

export const updateDiaryRequestSchema = {
  type: 'object',
  properties: {
    feeling: {
      type: 'string',
      enum: diaryFeelingEnumValues,
      example: 'HOPEFUL',
    },
    sleepQuality: {
      type: 'string',
      enum: diarySleepQualityEnumValues,
      example: 'EIGHT_OR_MORE',
    },
    symptom: {
      type: 'string',
      maxLength: 100,
      example: 'Melhora na ansiedade',
    },
    content: {
      type: 'string',
      maxLength: 2000,
      example: 'Hoje acordei mais disposto e com menos preocupacao.',
    },
  },
};

export const updateDiarySharingRequestSchema = {
  type: 'object',
  properties: {
    shareDiaryWithProfessionals: {
      type: 'boolean',
      example: true,
    },
  },
  required: ['shareDiaryWithProfessionals'],
};
