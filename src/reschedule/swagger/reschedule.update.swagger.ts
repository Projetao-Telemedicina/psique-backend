import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
} from '@nestjs/swagger';
import {
    ApiCommonErrorResponses,
    ApiUuidParam,
} from '../../common/swagger/index';
import {
    rescheduleRequestSchema,
    updateRescheduleRequestSchema,
} from './reschedule.schemas';

export function UpdateRescheduleRequestApiDocs(): MethodDecorator {
    return applyDecorators(
    ApiOperation({
        summary: 'Atualiza uma solicitacao de reagendamento',
        description:
        'Atualiza as datas sugeridas ou o prazo limite de uma solicitacao.',
    }),
    ApiUuidParam('id', 'ID da solicitacao de reagendamento.'),
    ApiBody({
        required: true,
        schema: updateRescheduleRequestSchema,
    }),
    ApiOkResponse({
        description: 'Solicitacao de reagendamento atualizada com sucesso.',
        schema: rescheduleRequestSchema,
    }),
    ApiCommonErrorResponses({
        includeUnauthorized: false,
        includeForbidden: false,
    }),
    );
}
