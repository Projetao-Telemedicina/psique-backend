import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  chatRoomSchema,
  createChatRoomRequestSchema,
} from './chat.schemas';

export function CreateChatRoomApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria ou recupera uma sala de chat',
      description:
        'Cria uma sala única entre paciente e profissional quando já existe uma consulta vinculando os dois usuários. ' +
        'Se a sala já existir, retorna a mesma sala. A troca de mensagens em tempo real ocorre pelo namespace WebSocket `/chat`, ' +
        'com os eventos `chat:join-room` e `chat:send-message`.',
    }),
    ApiBody({
      required: true,
      schema: createChatRoomRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Sala de chat criada ou recuperada com sucesso.',
      schema: chatRoomSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
