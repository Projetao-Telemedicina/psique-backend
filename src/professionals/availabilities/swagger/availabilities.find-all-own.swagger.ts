import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../../common/swagger';
import { professionalAvailabilityListResponseSchema } from './availabilities.schemas';

export function FindOwnAvailabilitiesApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Lista as próprias disponibilidades',
      description:
        'Retorna todas as disponibilidades ativas do profissional autenticado, ' +
        'ordenadas por dia da semana e horário inicial.',
    }),
    ApiOkResponse({
      description: 'Lista de disponibilidades retornada com sucesso.',
      schema: professionalAvailabilityListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
