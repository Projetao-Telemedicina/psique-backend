import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { mySubscriptionResponseSchema } from './payments.schemas';

export function GetMySubscriptionApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Consulta minha assinatura',
      description:
        'Retorna a assinatura mais relevante do paciente autenticado, incluindo plano e último pagamento registrado.',
    }),
    ApiOkResponse({
      description: 'Assinatura consultada com sucesso.',
      schema: mySubscriptionResponseSchema,
    }),
    ApiCommonErrorResponses(),
  );
}
