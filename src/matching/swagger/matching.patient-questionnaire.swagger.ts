import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  patientQuestionnaireRequestSchema,
  patientQuestionnaireRequestExamples,
  patientQuestionnaireResponseSchema,
} from './matching.schemas';

export function UpsertPatientQuestionnaireApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Salva ou atualiza o questionário do paciente',
      description:
        'Cria ou atualiza as respostas do questionário de matching para o paciente autenticado. ' +
        'Este questionário é usado para calcular recomendações de profissionais compatíveis. ' +
        'A operação exige autenticação e perfil de paciente.',
    }),
    ApiBody({
      required: true,
      schema: patientQuestionnaireRequestSchema,
      examples: patientQuestionnaireRequestExamples,
    }),
    ApiCreatedResponse({
      description: 'Questionário salvo com sucesso.',
      schema: patientQuestionnaireResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeConflict: false,
      includeNotFound: false,
    }),
  );
}
