import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  revokeTokensRequestSchema,
  revokeTokensResponseSchema,
} from './auth.schemas';

export function RevokeAuthApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Revoga todos os tokens de um usuario',
      description:
        'Remove os tokens persistidos de um usuario especifico e invalida a sessao ativa associada. Esta operacao exige autenticacao e role administrativa.',
    }),
    ApiBody({
      required: true,
      schema: revokeTokensRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Tokens revogados com sucesso.',
      schema: revokeTokensResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: false,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
    }),
  );
}

