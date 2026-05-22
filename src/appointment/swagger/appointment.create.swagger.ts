import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
    createAppointmentRequestSchema,
    createAppointmentResponseSchema,
} from './appointment.schemas';

export function CreateAppointmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Agenda uma nova consulta',
      description:
        'Registra uma consulta entre um paciente e um profissional em um horário disponível. ' +
        'Valida sobreposição de horários considerando consultas com status SCHEDULED e RESCHEDULE_REQUESTED, ' +
        'impedindo o agendamento quando o horário já estiver ocupado (UC12).',
    }),
    ApiBody({
      required: true,
      schema: createAppointmentRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Consulta agendada com sucesso.',
      schema: createAppointmentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: true,
    }),
  );
}