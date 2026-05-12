import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import {
  confirmRescheduleRequestSchema,
  rescheduleConfirmationResponseSchema,
} from './reschedule.schemas';

export function UpdateUserConfirmationRescheduleApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirma ou recusa solicitacao de reagendamento',
      description:
        'Permite ao paciente ou profissional confirmar ou recusar. Quando ambos confirmam, a consulta e atualizada; se algum recusar, a consulta volta ao status anterior.',
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
