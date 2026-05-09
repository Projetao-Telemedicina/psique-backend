import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { authenticatedUserResponseSchema } from './auth.schemas';

export function MeAuthApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Retorna o usuario autenticado',
      description:
        'Resolve o usuario atual a partir do access token enviado no header Authorization.',
    }),
    ApiOkResponse({
      description: 'Usuario autenticado retornado com sucesso.',
      schema: authenticatedUserResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: false,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
    }),
  );
}

