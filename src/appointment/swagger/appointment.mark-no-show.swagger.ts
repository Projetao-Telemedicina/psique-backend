import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import { appointmentResponseSchema } from './appointment.schemas.js';

export function MarkAppointmentAsNoShowApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Marca a consulta como ausência',
      description:
        'Registra que o paciente não compareceu à consulta, alterando o status para NO_SHOW. ' +
        'Só é permitido após o término do horário previsto (endsAt) e apenas para consultas com status SCHEDULED.',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiOkResponse({
      description: 'Consulta marcada como ausência com sucesso.',
      schema: appointmentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}