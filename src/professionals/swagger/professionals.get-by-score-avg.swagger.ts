import { ApiCommonErrorResponses } from '@/common/swagger';
import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { professionalsByScoreAvgResponseSchema } from './professionals.schemas';

export function GetProfessionalsByScoreAvgApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista profissionais da vitrine pública',
      description:
        'Permite listar os profissionais aprovados da vitrine pública, priorizando perfis impulsionados e usando nota média e quantidade de avaliações como critério secundário.',
    }),
    ApiOkResponse({
      description: 'Lista de profissionais retornada com sucesso.',
      schema: professionalsByScoreAvgResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Numero da paginação (padrão: 1).',
      schema: {
        type: 'integer',
        default: 1,
        minimum: 1,
      },
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Quantidade de profissionais por página (padrão: 10).',
      schema: {
        type: 'integer',
        default: 10,
        minimum: 1,
      },
    }),
  );
}
