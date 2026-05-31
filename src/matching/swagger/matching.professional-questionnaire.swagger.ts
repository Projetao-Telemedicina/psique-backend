import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  professionalQuestionnaireRequestSchema,
  professionalQuestionnaireRequestExamples,
  professionalQuestionnaireResponseSchema,
} from './matching.schemas';

export function UpsertProfessionalQuestionnaireApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Salva ou atualiza o questionário do profissional',
      description:
        'Cria ou atualiza as respostas do questionário de matching para o profissional autenticado. ' +
        'Este questionário é usado pelo algoritmo de recomendação para calcular a compatibilidade com pacientes. ' +
        'A operação exige autenticação e perfil de profissional.',
    }),
    ApiBody({
      required: true,
      schema: professionalQuestionnaireRequestSchema,
      examples: professionalQuestionnaireRequestExamples,
    }),
    ApiCreatedResponse({
      description: 'Questionário salvo com sucesso.',
      schema: professionalQuestionnaireResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeConflict: false,
      includeNotFound: false,
    }),
  );
}
