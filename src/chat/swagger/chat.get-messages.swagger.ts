import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { chatMessageListSchema } from './chat.schemas';

export function GetChatMessagesApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista as mensagens de uma sala de chat',
      description:
        'Carrega o histórico da sala. As novas mensagens devem ser acompanhadas em tempo real pelo namespace WebSocket `/chat`.',
    }),
    ApiParam({
      name: 'roomId',
      description: 'Identificador UUID da sala de chat.',
      example: 'f52993d4-344b-4a38-a2e7-f0b063bc5f31',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 50,
    }),
    ApiOkResponse({
      description: 'Mensagens carregadas com sucesso.',
      schema: chatMessageListSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
