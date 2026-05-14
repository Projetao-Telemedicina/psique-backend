import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import { professionalValidationSubmissionResponseSchema } from './professionals.schemas';

export function ApproveProfessionalValidationApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Aprova uma solicitacao de validacao profissional',
      description:
        'Permite que um administrador aprove uma solicitacao pendente e ative o profissional.',
    }),
    ApiUuidParam('requestId', 'ID da solicitacao de validacao.'),
    ApiCreatedResponse({
      description: 'Solicitacao aprovada com sucesso.',
      schema: professionalValidationSubmissionResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
