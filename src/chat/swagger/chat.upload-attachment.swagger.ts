import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  chatMessageSchema,
  uploadChatAttachmentRequestSchema,
} from './chat.schemas';

export function UploadChatAttachmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Envia um anexo para a sala de chat',
      description:
        'Aceita apenas PDF, JPG, JPEG e PNG. O backend valida extensão, tipo MIME e assinatura binária do arquivo, ' +
        'bloqueando tentativas de mascarar HTML, SVG, scripts ou outros conteúdos executáveis como imagem ou documento. ' +
        'Após o upload, a mensagem é transmitida em tempo real pelo evento `chat:message-created` no namespace `/chat`.',
    }),
    ApiParam({
      name: 'roomId',
      description: 'Identificador UUID da sala de chat.',
      example: 'f52993d4-344b-4a38-a2e7-f0b063bc5f31',
    }),
    ApiBody({
      required: true,
      schema: uploadChatAttachmentRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Anexo enviado com sucesso.',
      schema: chatMessageSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
