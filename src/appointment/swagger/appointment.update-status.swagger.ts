import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import {
  appointmentResponseSchema,
  updateAppointmentStatusRequestSchema,
} from './appointment.schemas.js';

export function UpdateAppointmentStatusApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza o status de uma consulta',
      description:
        'Endpoint administrativo para alterar o status de uma consulta diretamente. ' +
        'Para fluxos de negócio comuns, prefira os endpoints específicos: ' +
        'cancelar (POST /:id/cancel), marcar como concluída (PATCH /:id/complete) ou marcar como ausência (PATCH /:id/no-show).',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiBody({
      required: true,
      schema: updateAppointmentStatusRequestSchema,
    }),
    ApiOkResponse({
      description: 'Status atualizado com sucesso.',
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