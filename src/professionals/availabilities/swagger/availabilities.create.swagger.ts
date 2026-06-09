import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../../common/swagger';
import {
  createAvailabilityRequestSchema,
  professionalAvailabilityResponseSchema,
} from './availabilities.schemas';

export function CreateAvailabilityApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Cria uma nova disponibilidade semanal',
      description:
        'Registra uma faixa de horário recorrente para o profissional autenticado. ' +
        'Valida que o horário inicial é anterior ao final e que não há sobreposição ' +
        'com disponibilidades já existentes para o mesmo dia da semana.',
    }),
    ApiBody({
      required: true,
      schema: createAvailabilityRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Disponibilidade criada com sucesso.',
      schema: professionalAvailabilityResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: true,
    }),
  );
}
