import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function CanJoinAppointmentApiDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Verificar se é possível entrar na videoconferência',
      description: `
Valida se o usuário autenticado pode acessar a sala de videoconferência da consulta.

**Regras:**
- O usuário deve ser o paciente ou o profissional da consulta
- A consulta deve estar com status \`SCHEDULED\` ou \`RESCHEDULE_REQUESTED\`
- Só é permitido entrar a partir de **10 minutos antes** do horário de início
- Não é permitido entrar após o horário de término

**Retorna o \`meetLink\` quando o acesso é permitido.**
      `,
    }),
    ApiOkResponse({
      description: 'Acesso liberado — retorna o link do Google Meet.',
      schema: {
        example: {
          canJoin: true,
          meetLink: 'https://meet.google.com/abc-defg-hij',
          startsAt: '2026-05-20T14:00:00.000Z',
          endsAt: '2026-05-20T15:00:00.000Z',
          minutesUntilStart: 0,
        },
      },
    }),
    ApiBadRequestResponse({
      description: `
Acesso bloqueado. Possíveis motivos:
- Consulta ainda não iniciada (muito cedo)
- Horário da consulta já encerrado
- Consulta não está com status ativo
- Consulta não possui link de videoconferência
      `,
      schema: {
        example: {
          statusCode: 400,
          message: 'A consulta ainda não foi iniciada. Você poderá acessar a sala 8 minuto(s) antes do início.',
          error: 'Bad Request',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Token JWT ausente ou inválido.',
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'O usuário autenticado não é participante desta consulta.',
      schema: {
        example: {
          statusCode: 403,
          message: 'Você não tem permissão para acessar esta consulta.',
          error: 'Forbidden',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Consulta não encontrada.',
      schema: {
        example: {
          statusCode: 404,
          message: 'Consulta não encontrada.',
          error: 'Not Found',
        },
      },
    }),
  );
}