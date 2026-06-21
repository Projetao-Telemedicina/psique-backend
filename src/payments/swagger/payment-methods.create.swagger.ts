import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { paymentMethodResponseSchema, savePaymentMethodRequestSchema } from './payments.schemas';

export function CreatePaymentMethodApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Salva um método de pagamento',
      description:
        'Vincula ao usuário autenticado um método de pagamento já tokenizado pelo Stripe, sem armazenar dados brutos do cartão.',
    }),
    ApiBody({
      required: true,
      schema: savePaymentMethodRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Método de pagamento salvo com sucesso.',
      schema: paymentMethodResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
