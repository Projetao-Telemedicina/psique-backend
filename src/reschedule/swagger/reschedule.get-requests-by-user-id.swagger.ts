// get-my-reschedule-requests.docs.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { rescheduleListResponseSchema } from './reschedule.schemas';

export function GetMyRescheduleRequestsApiDocs(): MethodDecorator {
    return applyDecorators(
    ApiOperation({
        summary: 'Lista as solicitacoes de reagendamento do usuario autenticado',
        description:
        'Retorna todas as solicitacoes de reagendamento em que o usuario autenticado e participante, seja como paciente ou profissional.',
    }),
    ApiOkResponse({
        description: 'Lista de solicitacoes retornada com sucesso.',
        schema: rescheduleListResponseSchema,
    }),
    ApiCommonErrorResponses({
        includeBadRequest: false,
        includeForbidden: false,
        includeNotFound: false,
    }),
    );
}