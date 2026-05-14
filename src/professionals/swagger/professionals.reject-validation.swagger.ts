import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import {
  professionalValidationDecisionRequestSchema,
  professionalValidationSubmissionResponseSchema,
} from './professionals.schemas';

export function RejectProfessionalValidationApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Rejeita uma solicitacao de validacao profissional',
      description:
        'Permite que um administrador rejeite uma solicitacao pendente e mantenha o profissional inativo.',
    }),
    ApiUuidParam('requestId', 'ID da solicitacao de validacao.'),
    ApiBody({
      required: true,
      schema: professionalValidationDecisionRequestSchema,
    }),
    ApiOkResponse({
      description: 'Solicitacao rejeitada com sucesso.',
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
