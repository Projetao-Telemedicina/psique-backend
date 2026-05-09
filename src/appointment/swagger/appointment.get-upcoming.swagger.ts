import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import { upcomingAppointmentsListResponseSchema } from './appointment.schemas.js';

export function GetUpcomingAppointmentsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Calendário de consultas futuras',
      description:
        'Retorna as consultas futuras do usuário autenticado (paciente ou profissional), ' +
        'ordenadas da mais próxima para a mais distante. Considera consultas com status ' +
        'SCHEDULED e RESCHEDULE_REQUESTED. Quando o usuário é paciente, inclui dados do profissional; ' +
        'quando é profissional, inclui dados do paciente. Lista vazia indica que não há consultas agendadas (UC15).',
    }),
    ApiOkResponse({
      description: 'Lista de consultas futuras retornada com sucesso.',
      schema: upcomingAppointmentsListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}