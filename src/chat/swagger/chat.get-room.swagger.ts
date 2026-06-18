import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { chatRoomSchema } from './chat.schemas';

export function GetChatRoomApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtém uma sala de chat pelo identificador',
      description:
        'Retorna os dados da sala de chat apenas se o usuário autenticado for participante dela.',
    }),
    ApiParam({
      name: 'roomId',
      description: 'Identificador UUID da sala de chat.',
      example: 'f52993d4-344b-4a38-a2e7-f0b063bc5f31',
    }),
    ApiOkResponse({
      description: 'Sala de chat encontrada com sucesso.',
      schema: chatRoomSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
