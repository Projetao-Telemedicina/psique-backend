import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import { rescheduleRequestSchema } from './reschedule.schemas';

export function GetRescheduleRequestByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca uma solicitacao de reagendamento por ID',
      description:
        'Retorna os dados completos de uma solicitacao de reagendamento.',
    }),
    ApiUuidParam('id', 'ID da solicitacao de reagendamento.'),
    ApiOkResponse({
      description: 'Solicitacao de reagendamento encontrada com sucesso.',
      schema: rescheduleRequestSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
