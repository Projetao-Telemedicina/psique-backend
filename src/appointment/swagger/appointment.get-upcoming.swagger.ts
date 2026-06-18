import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { upcomingAppointmentsListResponseSchema } from './appointment.schemas';

export function GetUpcomingAppointmentsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Calendário de consultas futuras',
      description:
        'Retorna as consultas futuras do usuário autenticado (paciente ou profissional), ' +
        'ordenadas da mais próxima para a mais distante, com paginação. ' +
        'Considera consultas com status SCHEDULED e RESCHEDULE_REQUESTED. ' +
        'Inclui dados aninhados do paciente e do profissional em cada consulta. ' +
        'Lista vazia indica que não há consultas agendadas (UC15).',
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