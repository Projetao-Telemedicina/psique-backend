import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../../common/swagger';
import { professionalAvailabilityListResponseSchema } from './availabilities.schemas';

export function FindAvailabilitiesByProfessionalApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista as disponibilidades de um profissional',
      description:
        'Retorna todas as disponibilidades ativas de um profissional específico, ' +
        'ordenadas por dia da semana e horário inicial. Endpoint público.',
    }),
    ApiUuidParam('userId', 'ID do usuário profissional.'),
    ApiOkResponse({
      description: 'Lista de disponibilidades retornada com sucesso.',
      schema: professionalAvailabilityListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
