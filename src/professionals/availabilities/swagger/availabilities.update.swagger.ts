import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../../common/swagger';
import {
  professionalAvailabilityResponseSchema,
  updateAvailabilityRequestSchema,
} from './availabilities.schemas';

export function UpdateAvailabilityApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Atualiza uma disponibilidade',
      description:
        'Atualiza os dados de uma disponibilidade existente do profissional autenticado. ' +
        'Valida sobreposição com outras disponibilidades e conflito com consultas já agendadas ' +
        'quando o horário é alterado.',
    }),
    ApiUuidParam('id', 'ID da disponibilidade.'),
    ApiBody({
      required: true,
      schema: updateAvailabilityRequestSchema,
    }),
    ApiOkResponse({
      description: 'Disponibilidade atualizada com sucesso.',
      schema: professionalAvailabilityResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
