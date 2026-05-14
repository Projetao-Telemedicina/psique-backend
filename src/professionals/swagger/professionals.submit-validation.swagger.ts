import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  professionalValidationSubmissionRequestSchema,
  professionalValidationSubmissionResponseSchema,
} from './professionals.schemas';

export function SubmitProfessionalValidationApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Envia a solicitacao de validacao do profissional',
      description:
        'Permite que o profissional autenticado envie o RG para analise administrativa.',
    }),
    ApiBody({
      required: true,
      schema: professionalValidationSubmissionRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Solicitacao de validacao enviada com sucesso.',
      schema: professionalValidationSubmissionResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeConflict: true,
    }),
  );
}
