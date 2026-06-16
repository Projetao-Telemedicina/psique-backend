import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { promotionPlanResponseSchema } from './payments.schemas';

export function GetPromotionPlanByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um plano de impulsionamento',
      description:
        'Retorna um plano de impulsionamento ativo pelo identificador informado.',
    }),
    ApiOkResponse({
      description: 'Plano de impulsionamento encontrado com sucesso.',
      schema: promotionPlanResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
