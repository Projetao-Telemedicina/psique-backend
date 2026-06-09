import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';

export function DownloadChatAttachmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiProduces('application/pdf', 'image/jpeg', 'image/png'),
    ApiOperation({
      summary: 'Baixa um anexo do chat',
      description:
        'Faz o download seguro do anexo apenas para participantes da sala. O arquivo é sempre retornado com `Content-Disposition: attachment` e `X-Content-Type-Options: nosniff`.',
    }),
    ApiParam({
      name: 'attachmentId',
      description: 'Identificador UUID do anexo.',
      example: '274cf869-c30e-4039-9383-7642fcfd89d8',
    }),
    ApiOkResponse({
      description: 'Anexo retornado com sucesso.',
      schema: {
        type: 'string',
        format: 'binary',
      },
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
