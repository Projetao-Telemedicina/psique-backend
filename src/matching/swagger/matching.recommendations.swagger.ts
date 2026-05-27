import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  matchRecommendationsResponseSchema,
} from './matching.schemas';

export function GetRecommendationsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Obtém recomendações de profissionais para o paciente',
      description:
        'Retorna uma lista ordenada (top-N) de profissionais compatíveis com o perfil do paciente autenticado, ' +
        'usando o algoritmo de score híbrido (Cosine Similarity + Hamming Ponderado). ' +
        'Cada recomendação inclui o score normalizado (0-100), métricas detalhadas e explicações do match. ' +
        'Os dados do profissional (nome, avatar, especialidade, avaliações) já vêm hidratados na resposta.',
    }),
    ApiOkResponse({
      description: 'Lista de recomendações retornada com sucesso.',
      schema: matchRecommendationsResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeConflict: false,
      includeNotFound: false,
      includeInternalServerError: true,
    }),
  );
}
