import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { panicButtonActivationResponseSchema } from './panic-button.schemas';

export function GetPanicButtonByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um acionamento do botão do pânico por ID',
      description:
        'Retorna os detalhes completos de um acionamento do botão do pânico, incluindo paciente, profissional vinculado, ' +
        'histórico de ofertas e a consulta provisória associada ao acionamento.',
    }),
    ApiOkResponse({
      description: 'Acionamento do botão do pânico retornado com sucesso.',
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
