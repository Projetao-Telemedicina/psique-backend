import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { rescheduleListResponseSchema } from './reschedule.schemas';

export function GetAllRescheduleRequestsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todas as solicitacoes de reagendamento',
      description:
        'Retorna as solicitacoes de reagendamento ordenadas pela data de criacao.',
    }),
    ApiOkResponse({
      description: 'Lista de solicitacoes de reagendamento retornada com sucesso.',
      schema: rescheduleListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}
