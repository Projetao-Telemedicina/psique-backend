import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  createPromotionPlanRequestSchema,
  promotionPlanResponseSchema,
} from './payments.schemas';

export function CreatePromotionPlanApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um plano de impulsionamento',
      description:
        'Cadastra um plano avulso de impulsionamento para profissionais, definindo preço e duração do destaque.',
    }),
    ApiBody({
      required: true,
      schema: createPromotionPlanRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Plano de impulsionamento criado com sucesso.',
      schema: promotionPlanResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
