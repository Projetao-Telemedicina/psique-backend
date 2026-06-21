import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { paymentMethodListResponseSchema } from './payments.schemas';

export function ListPaymentMethodsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista meus métodos de pagamento',
      description:
        'Retorna os métodos de pagamento salvos pelo usuário autenticado em ordem de padrão e criação.',
    }),
    ApiOkResponse({
      description: 'Lista de métodos de pagamento do usuário.',
      schema: paymentMethodListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
    }),
  );
}
