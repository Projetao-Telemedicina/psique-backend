import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { appointmentHistoryListResponseSchema } from './appointment.schemas';

export function GetAppointmentHistoryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Histórico de consultas',
      description:
        'Retorna o histórico de consultas finalizadas (COMPLETED, CANCELED, NO_SHOW) do usuário autenticado, ' +
        'ordenadas da mais recente para a mais antiga, com paginação. ' +
        'Inclui nome do profissional e especialidade quando o usuário é paciente (UC17).',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: 'integer',
      example: 1,
      description: 'Número da página (padrão: 1).',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: 'integer',
      example: 20,
      description: 'Quantidade de registros por página (padrão: 20).',
    }),
    ApiOkResponse({
      description: 'Histórico retornado com sucesso.',
      schema: appointmentHistoryListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}