import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
    updateAppointmentRequestSchema,
    updateAppointmentResponseSchema,
} from './appointment.schemas';

export function UpdateAppointmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza dados de uma consulta',
      description:
        'Atualiza horário ou preço de uma consulta existente. ' +
        'Para fluxos de reagendamento iniciados pelo paciente ou profissional, utilize o módulo de reschedule.',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiBody({
      required: true,
      schema: updateAppointmentRequestSchema,
    }),
    ApiOkResponse({
      description: 'Consulta atualizada com sucesso.',
      schema: updateAppointmentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}