import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';

export function GetHelloApiResponsesOperation(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Retorna mensagem de saúde da API',
      description:
        'Endpoint de verificação simples para confirmar disponibilidade da aplicação.',
    }),
    ApiOkResponse({
      description: 'Mensagem retornada com sucesso.',
      schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['SUCCESS'],
            example: 'SUCCESS',
          },
          message: {
            type: 'string',
            example: 'Hello World!',
          },
        },
        required: ['status', 'message'],
      },
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}
