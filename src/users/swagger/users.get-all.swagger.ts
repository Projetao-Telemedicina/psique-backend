import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { userListResponseSchema } from './users.schemas';
import { UserStatus } from '@prisma/client';

export function GetAllUsersApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todos os usuários',
      description:
        'Retorna todos os usuários cadastrados com os campos públicos e administrativos disponíveis na listagem.',
    }),
    ApiOkResponse({
      description: 'Lista de usuários retornada com sucesso.',
      schema: userListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
    ApiQuery({
      name: 'status',
      enum: UserStatus,
      required: false, // Indica que não é obrigatório
      description: 'Filtra os usuários por status (ex: ACTIVE, INACTIVE)',
    }),
  );
}

