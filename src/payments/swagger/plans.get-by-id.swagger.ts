import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '@/common/swagger';
import { planResponseSchema } from './payments.schemas';

export function GetPlanByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um plano por ID',
      description: 'Retorna os detalhes completos de um plano ativo.',
    }),
    ApiUuidParam('id', 'ID do plano.'),
    ApiOkResponse({
      description: 'Plano encontrado com sucesso.',
      schema: planResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: true,
    }),
  );
}
