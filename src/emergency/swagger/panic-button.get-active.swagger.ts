import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { panicButtonActivationResponseSchema } from './panic-button.schemas';

export function GetMyActivePanicButtonApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca o acionamento ativo do botão do pânico do paciente autenticado',
      description:
        'Retorna o acionamento do botão do pânico em andamento do paciente autenticado, incluindo o histórico de ofertas.',
    }),
    ApiOkResponse({
      description: 'Acionamento ativo retornado com sucesso.',
      schema: panicButtonActivationResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
