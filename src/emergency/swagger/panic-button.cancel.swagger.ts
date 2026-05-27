import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
  cancelPanicButtonActivationSchema,
  panicButtonActivationResponseSchema,
} from './panic-button.schemas';

export function CancelPanicButtonActivationApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancela um acionamento do botão do pânico',
      description:
        'Permite que o paciente autenticado cancele um acionamento do botão do pânico ainda não concluído.',
    }),
    ApiBody({
      required: false,
      schema: cancelPanicButtonActivationSchema,
    }),
    ApiCreatedResponse({
      description: 'Acionamento do botão do pânico cancelado com sucesso.',
      schema: panicButtonActivationResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
