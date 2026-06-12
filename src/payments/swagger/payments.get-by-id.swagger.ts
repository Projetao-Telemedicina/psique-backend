import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '@/common/swagger';
import { paymentResponseSchema } from './payments.schemas';

export function GetPaymentByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um pagamento por ID',
      description:
        'Retorna os dados de um pagamento da consulta. O usuário autenticado só acessa pagamentos próprios, exceto administradores.',
    }),
    ApiUuidParam('id', 'ID do pagamento.'),
    ApiOkResponse({
      description: 'Pagamento encontrado com sucesso.',
      schema: paymentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
