import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { appointmentResponseSchema } from './appointment.schemas';

export function GetAppointmentByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca uma consulta pelo ID',
      description: 'Retorna os detalhes completos de uma consulta específica.',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiOkResponse({
      description: 'Consulta encontrada.',
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