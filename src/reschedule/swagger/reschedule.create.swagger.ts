import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  createRescheduleRequestSchema,
  rescheduleRequestSchema,
} from './reschedule.schemas';

export function CreateRescheduleApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Solicita o reagendamento de uma consulta',
      description:
        'Cria uma solicitacao de reagendamento com data sugerida e prazo de resposta.',
    }),
    ApiBody({
      required: true,
      schema: createRescheduleRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Solicitacao de reagendamento criada com sucesso.',
      schema: rescheduleRequestSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
