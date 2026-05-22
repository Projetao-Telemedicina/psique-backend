import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { reviewListResponseSchema } from './review.schemas';

export function GetProfessionalReviewsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista avaliacoes do profissional',
      description:
        'Retorna as avaliacoes de um profissional ordenadas da mais recente para a mais antiga, ' +
        'com paginação.',
    }),
    ApiUuidParam('userId', 'ID do profissional.'),
    ApiQuery({
      name: 'page',
      required: false,
      type: 'integer',
      example: 1,
      description: 'Numero da pagina (padrao: 1).',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: 'integer',
      example: 10,
      description: 'Quantidade de registros por pagina (padrao: 10).',
    }),
    ApiOkResponse({
      description: 'Avaliacoes retornadas com sucesso.',
      schema: reviewListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}

export function GetOwnProfessionalReviewsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista avaliacoes do profissional autenticado',
      description:
        'Retorna as avaliacoes do profissional autenticado ordenadas da mais recente para a mais antiga, ' +
        'com paginação.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: 'integer',
      example: 1,
      description: 'Numero da pagina (padrao: 1).',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: 'integer',
      example: 10,
      description: 'Quantidade de registros por pagina (padrao: 10).',
    }),
    ApiOkResponse({
      description: 'Avaliacoes retornadas com sucesso.',
      schema: reviewListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
