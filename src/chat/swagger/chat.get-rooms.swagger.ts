import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import { chatRoomListSchema } from './chat.schemas';

export function GetMyChatRoomsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista as salas de chat do usuário autenticado',
      description:
        'Retorna as salas de chat em que o paciente ou profissional participa, ordenadas pela atividade mais recente.',
    }),
    ApiOkResponse({
      description: 'Salas de chat carregadas com sucesso.',
      schema: chatRoomListSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
