import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '@/common/swagger';
import { removePaymentMethodResponseSchema } from './payments.schemas';

export function RemovePaymentMethodApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove um método de pagamento salvo',
      description:
        'Desvincula do usuário autenticado um método de pagamento salvo no Stripe e atualiza o padrão quando necessário.',
    }),
    ApiUuidParam('id', 'ID do método de pagamento salvo.'),
    ApiOkResponse({
      description: 'Método de pagamento removido com sucesso.',
      schema: removePaymentMethodResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
