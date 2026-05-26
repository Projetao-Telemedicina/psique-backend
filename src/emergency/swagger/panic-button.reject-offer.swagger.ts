import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
  panicButtonOfferResponseSchema,
  rejectPanicButtonOfferSchema,
} from './panic-button.schemas';

export function RejectPanicButtonOfferApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Rejeita uma oferta de atendimento do botão do pânico',
      description:
        'Permite que o psicólogo autenticado rejeite uma oferta pendente para que o sistema tente o próximo profissional elegível.',
    }),
    ApiBody({
      required: false,
      schema: rejectPanicButtonOfferSchema,
    }),
    ApiCreatedResponse({
      description: 'Oferta rejeitada com sucesso.',
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
