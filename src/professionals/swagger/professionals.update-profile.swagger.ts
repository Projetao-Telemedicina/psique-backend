import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index.js';
import {
  professionalProfileResponseSchema,
  professionalProfileUpdateRequestSchema,
} from './professionals.schemas.js';

export function UpdateProfessionalProfileApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza o perfil do profissional',
      description:
        'Atualiza os dados específicos do perfil profissional vinculado ao usuário informado.',
    }),
    ApiUuidParam('userId', 'ID do usuário profissional.'),
    ApiBody({
      required: true,
      schema: professionalProfileUpdateRequestSchema,
    }),
    ApiOkResponse({
      description: 'Perfil do profissional atualizado com sucesso.',
      schema: professionalProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
