import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger/index';
import { confirmRescheduleRequestSchema, rescheduleConfirmationResponseSchema } from './reschedule.schemas';

export function ConfirmRescheduleRequestApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirma ou recusa uma solicitacao de reagendamento',
      description:
        'O paciente ou profissional confirma ou recusa a solicitacao. Quando ambos confirmam, o horario da consulta e atualizado. Se algum recusar, a consulta volta ao status anterior.',
    }),
    ApiUuidParam('id', 'ID da solicitacao de reagendamento.'),
    ApiBody({
      required: true,
      schema: confirmRescheduleRequestSchema,
    }),
    ApiOkResponse({
      description: 'Confirmacao processada com sucesso.',
      schema: rescheduleConfirmationResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}