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
  professionalProfileResponseSchema,
  professionalProfileUpdateRequestSchema,
} from './professionals.schemas';

type UpdateProfessionalProfileApiDocsOptions = {
  admin?: boolean;
};

export function UpdateProfessionalProfileApiDocs(
  options: UpdateProfessionalProfileApiDocsOptions = {},
): MethodDecorator {
  const isAdmin = options.admin ?? false;

  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: isAdmin
        ? 'Atualiza o perfil de um profissional como administrador'
        : 'Atualiza o próprio perfil do profissional',
      description: isAdmin
        ? 'Atualiza os dados específicos do perfil de qualquer profissional. Esta operação exige autenticação e perfil de administrador.'
        : 'Atualiza os dados específicos do perfil do profissional autenticado.',
    }),
    ...(isAdmin
      ? [ApiUuidParam('userId', 'ID do usuário profissional.')]
      : []),
    ApiBody({
      required: true,
      schema: professionalProfileUpdateRequestSchema,
    }),
    ApiOkResponse({
      description: 'Perfil do profissional atualizado com sucesso.',
      schema: professionalProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
