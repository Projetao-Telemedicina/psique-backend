import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { createPlanRequestSchema, planResponseSchema } from './payments.schemas';

export function CreatePlanApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um plano',
      description:
        'Cadastra um plano disponível para assinatura de pacientes, vinculando o preço recorrente já configurado no Stripe.',
    }),
    ApiBody({
      required: true,
      schema: createPlanRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Plano criado com sucesso.',
      schema: planResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
