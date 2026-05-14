import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function GenerateCertificateApiDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Baixar comprovante de comparecimento em PDF',
      description: `
Gera e retorna o comprovante de comparecimento da consulta em formato PDF.

**Regras:**
- Apenas paciente ou profissional da consulta podem acessar
- A consulta deve estar com status \`COMPLETED\`
      `,
    }),
    ApiOkResponse({
      description: 'PDF gerado com sucesso.',
      content: {
        'application/pdf': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Consulta não está concluída.',
      schema: {
        example: {
          statusCode: 400,
          message: 'O certificado só está disponível para consultas concluídas.',
          error: 'Bad Request',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Token JWT ausente ou inválido.',
    }),
    ApiForbiddenResponse({
      description: 'Usuário não é participante da consulta.',
      schema: {
        example: {
          statusCode: 403,
          message: 'Você não tem permissão para acessar este certificado.',
          error: 'Forbidden',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Consulta não encontrada.',
    }),
  );
}