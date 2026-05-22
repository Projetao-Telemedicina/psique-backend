import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger/index';
import { rescheduleListResponseSchema } from './reschedule.schemas';

export function GetRescheduleRequestsByAppointmentIdApiDocs(): MethodDecorator {
    return applyDecorators(
    ApiOperation({
        summary: 'Lista as solicitacoes de reagendamento de uma consulta',
        description:
        'Retorna todas as solicitacoes de reagendamento vinculadas a uma consulta especifica.',
    }),
    ApiUuidParam('appointmentId', 'ID da consulta.'),
    ApiOkResponse({
        description: 'Lista de solicitacoes retornada com sucesso.',
        schema: rescheduleListResponseSchema,
    }),
    ApiCommonErrorResponses({
        includeUnauthorized: false,
        includeForbidden: false,
        includeBadRequest: false,
    }),
    );
}