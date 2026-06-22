import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  subscribePlanRequestSchema,
  subscribePlanResponseSchema,
} from './payments.schemas';

export function SubscribeToPlanApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Assina um plano',
      description:
        'Cria a assinatura de um plano para o paciente autenticado, aplica cupom de assinatura quando elegível, ' +
        'processa a primeira cobrança e agenda as renovações automáticas no Stripe.',
    }),
    ApiBody({
      required: true,
      schema: subscribePlanRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Checkout da assinatura iniciado com sucesso.',
      schema: subscribePlanResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
