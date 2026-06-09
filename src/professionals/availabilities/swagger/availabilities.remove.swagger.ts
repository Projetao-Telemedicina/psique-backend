import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../../common/swagger';
import { professionalAvailabilityResponseSchema } from './availabilities.schemas';

export function RemoveAvailabilityApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Remove uma disponibilidade (soft-delete)',
      description:
        'Desativa uma disponibilidade do profissional autenticado. ' +
        'A operação é um soft-delete (isActive = false). ' +
        'Bloqueia a remoção quando existem consultas agendadas que conflitem com o intervalo.',
    }),
    ApiUuidParam('id', 'ID da disponibilidade.'),
    ApiOkResponse({
      description: 'Disponibilidade removida com sucesso.',
      schema: professionalAvailabilityResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
