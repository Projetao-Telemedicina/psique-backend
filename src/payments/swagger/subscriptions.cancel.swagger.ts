import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '@/common/swagger';
import { subscriptionResponseSchema } from './payments.schemas';

export function CancelSubscriptionApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancela a renovação da assinatura no fim do período',
      description:
        'Mantém o plano ativo até o fim do ciclo atual e desativa apenas a renovação automática da assinatura.',
    }),
    ApiUuidParam('id', 'ID da assinatura.'),
    ApiOkResponse({
      description: 'Cancelamento agendado com sucesso.',
      schema: subscriptionResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
