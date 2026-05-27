import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { panicButtonOfferResponseSchema } from './panic-button.schemas';

export function AcceptPanicButtonOfferApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Aceita uma oferta de atendimento do botão do pânico',
      description:
        'Permite que o psicólogo autenticado aceite uma oferta pendente vinculada a um acionamento do botão do pânico.',
    }),
    ApiCreatedResponse({
      description: 'Oferta aceita com sucesso.',
      schema: panicButtonOfferResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
