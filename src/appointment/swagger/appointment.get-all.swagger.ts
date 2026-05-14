import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { appointmentListResponseSchema } from './appointment.schemas';

export function GetAllAppointmentsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todas as consultas',
      description:
        'Retorna todas as consultas do sistema, opcionalmente filtradas por status. ' +
        'Endpoint administrativo, ordenado da mais próxima para a mais distante.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: AppointmentStatus,
      description: 'Filtra as consultas pelo status informado.',
    }),
    ApiOkResponse({
      description: 'Lista de consultas retornada com sucesso.',
      schema: appointmentListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}