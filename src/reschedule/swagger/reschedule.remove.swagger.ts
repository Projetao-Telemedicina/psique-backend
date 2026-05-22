import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import { rescheduleRequestSchema } from './reschedule.schemas';

export function RemoveRescheduleRequestApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove uma solicitacao de reagendamento',
      description:
        'Remove uma solicitacao de reagendamento existente pelo ID informado.',
    }),
    ApiUuidParam('id', 'ID da solicitacao de reagendamento.'),
    ApiOkResponse({
      description: 'Solicitacao de reagendamento removida com sucesso.',
      schema: rescheduleRequestSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
