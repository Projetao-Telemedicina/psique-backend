import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { setupIntentResponseSchema } from './payments.schemas';

export function CreateSetupIntentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um SetupIntent para cartão',
      description:
        'Inicia o fluxo seguro de cadastro de método de pagamento via Stripe para pacientes e profissionais.',
    }),
    ApiCreatedResponse({
      description: 'SetupIntent criado com sucesso.',
      schema: setupIntentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
