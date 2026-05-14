import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
    appointmentResponseSchema,
    cancelAppointmentRequestSchema,
} from './appointment.schemas';

export function CancelAppointmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancela uma consulta',
      description:
        'Cancela uma consulta em aberto. Pacientes só podem cancelar com mais de 24 horas de antecedência; ' +
        'caso contrário, o sistema bloqueia a ação e exibe a política de taxas. ' +
        'Registra quem cancelou (canceledBy), motivo (cancellationReason) e data do cancelamento (canceledAt). ' +
        'Não permite cancelar consultas já finalizadas ou previamente canceladas (UC14).',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta a ser cancelada',
    }),
    ApiBody({
      required: true,
      schema: cancelAppointmentRequestSchema,
    }),
    ApiOkResponse({
      description: 'Consulta cancelada com sucesso.',
      schema: appointmentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}