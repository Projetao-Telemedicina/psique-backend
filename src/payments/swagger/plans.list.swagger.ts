import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { planListResponseSchema } from './payments.schemas';

export function GetPlansApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista os planos ativos',
      description:
        'Retorna os planos ativos disponíveis para contratação na área de planos do paciente.',
    }),
    ApiOkResponse({
      description: 'Planos listados com sucesso.',
      schema: planListResponseSchema,
    }),
    ApiCommonErrorResponses(),
  );
}
