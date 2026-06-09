import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { upcomingAppointmentsListResponseSchema } from './appointment.schemas';

export function GetAppointmentsByDateApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Lista consultas do dia',
      description:
        'Retorna as consultas ativas (SCHEDULED e RESCHEDULE_REQUESTED) do usuário autenticado ' +
        'para uma data específica. Para paciente, retorna as consultas como paciente; ' +
        'para profissional, retorna as consultas como profissional. ' +
        'Inclui dados aninhados do paciente e do profissional em cada consulta.',
    }),
    ApiQuery({
      name: 'date',
      required: true,
      description:
        'Data a ser consultada. ' +
        'Deve ser enviada EXATAMENTE no formato YYYY-MM-DD (ex: 2026-05-15). ' +
        'Não utilize timestamp ISO 8601 nem offset de timezone — ' +
        'enviar qualquer valor com fuso horário pode deslocar o dia UTC e retornar resultados incorretos.',
      schema: {
        type: 'string',
        format: 'date',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        example: '2026-05-15',
      },
    }),
    ApiOkResponse({
      description:
        'Lista de consultas do dia retornada com sucesso. ' +
        'Lista vazia quando não há consultas na data informada.',
      schema: upcomingAppointmentsListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
