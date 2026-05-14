import { applyDecorators } from '@nestjs/common';
import { ProfessionalRequestStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { adminProfessionalValidationRequestListResponseSchema } from './professionals.schemas';

export function GetAdminProfessionalValidationRequestsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Lista solicitacoes de validacao para administradores',
      description:
        'Permite ao administrador consultar as solicitacoes de validacao com filtros por ID da solicitacao, ID do profissional, nome, status e intervalo de envio.',
    }),
    ApiOkResponse({
      description: 'Lista de solicitacoes retornada com sucesso.',
      schema: adminProfessionalValidationRequestListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
    }),
    ApiQuery({
      name: 'requestId',
      required: false,
      description: 'Filtra por ID exato da solicitacao.',
      schema: {
        type: 'string',
        format: 'uuid',
      },
    }),
    ApiQuery({
      name: 'professionalId',
      required: false,
      description: 'Filtra por ID exato do profissional.',
      schema: {
        type: 'string',
        format: 'uuid',
      },
    }),
    ApiQuery({
      name: 'professionalName',
      required: false,
      description: 'Filtra pelo nome do profissional.',
      schema: {
        type: 'string',
      },
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ProfessionalRequestStatus,
      description: 'Filtra pelo status da solicitacao.',
    }),
    ApiQuery({
      name: 'submittedFrom',
      required: false,
      description: 'Data/hora inicial de envio em formato ISO-8601.',
      schema: {
        type: 'string',
        format: 'date-time',
      },
    }),
    ApiQuery({
      name: 'submittedTo',
      required: false,
      description: 'Data/hora final de envio em formato ISO-8601.',
      schema: {
        type: 'string',
        format: 'date-time',
      },
    }),
  );
}
