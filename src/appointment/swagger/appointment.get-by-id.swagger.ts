import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { appointmentDetailResponseSchema } from './appointment.schemas';

export function GetAppointmentByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca uma consulta pelo ID',
      description:
        'Retorna os detalhes completos de uma consulta específica, ' +
        'incluindo dados aninhados do paciente (nome, avatarUrl) e do profissional (crp, especialidade, nome, avatarUrl).',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiOkResponse({
      description: 'Consulta encontrada com dados do paciente e profissional.',
      schema: appointmentDetailResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}