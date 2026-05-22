import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { appointmentResponseSchema } from './appointment.schemas';

export function MarkAppointmentAsCompletedApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Marca a consulta como concluída',
      description:
        'Encerra uma consulta com status SCHEDULED, alterando o status para COMPLETED ' +
        'e registrando a data de conclusão (completedAt). ' +
        'Apenas consultas com status SCHEDULED podem ser concluídas.',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiOkResponse({
      description: 'Consulta marcada como concluída com sucesso.',
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