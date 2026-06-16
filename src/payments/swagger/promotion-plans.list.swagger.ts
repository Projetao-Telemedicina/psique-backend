import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { promotionPlanListResponseSchema } from './payments.schemas';

export function GetPromotionPlansApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista planos de impulsionamento ativos',
      description:
        'Retorna os planos ativos de impulsionamento disponíveis para contratação por profissionais.',
    }),
    ApiOkResponse({
      description: 'Lista de planos de impulsionamento retornada com sucesso.',
      schema: promotionPlanListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
