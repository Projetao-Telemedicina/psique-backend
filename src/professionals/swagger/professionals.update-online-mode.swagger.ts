import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
} from '@nestjs/swagger';
import {
    ApiCommonErrorResponses,
    ApiUuidParam,
} from '../../common/swagger/index.js';
import {
    professionalProfileResponseSchema,
    professionalProfileUpdateRequestSchema,
} from './professionals.schemas.js';

export function UpdateProfessionalOnlineModeApiDocs(): MethodDecorator {
    return applyDecorators(
        ApiOperation({
            summary: 'Atualiza o status online do profissional',
            description: 'Atualiza o status online do profissional vinculado ao usuário informado.',
        }),
        ApiUuidParam(
            'userId', 'ID do usuário profissional.'
        ),
        ApiParam({
            name: 'onlineMode',
            description: 'Novo status online do profissional. Valores possíveis: ONLINE, OFFLINE.',
            required: true,
            enum: ['ONLINE', 'OFFLINE'],
        }),
        ApiBody({
            required: true,
            schema: professionalProfileUpdateRequestSchema,
        }),
        ApiOkResponse({
            description: 'Status online do profissional atualizado com sucesso.',
            schema: professionalProfileResponseSchema,
        }),
        ApiCommonErrorResponses({
            includeUnauthorized: false,
            includeForbidden: false,
        }),
    );
}
