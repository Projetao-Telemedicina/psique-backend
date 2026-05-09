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
  professionalOnlineModeUpdateRequestSchema,
  professionalProfileResponseSchema,
} from './professionals.schemas';

type UpdateProfessionalOnlineModeApiDocsOptions = {
  admin?: boolean;
};

export function UpdateProfessionalOnlineModeApiDocs(
  options: UpdateProfessionalOnlineModeApiDocsOptions = {},
): MethodDecorator {
  const isAdmin = options.admin ?? false;

  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: isAdmin
        ? 'Atualiza o status online de um profissional como administrador'
        : 'Atualiza o próprio status online do profissional',
      description: isAdmin
        ? 'Atualiza o status online de qualquer profissional. Esta operação exige autenticação e perfil de administrador.'
        : 'Atualiza o status online do profissional autenticado.',
    }),
    ...(isAdmin
      ? [ApiUuidParam('userId', 'ID do usuário profissional.')]
      : []),
    ApiBody({
      required: true,
      schema: professionalOnlineModeUpdateRequestSchema,
    }),
    ApiOkResponse({
      description: 'Status online do profissional atualizado com sucesso.',
      schema: professionalProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
