import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../../common/swagger';
import { availableSlotsResponseSchema } from './availabilities.schemas';

export function GetAvailableSlotsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Consulta os horários disponíveis de um profissional em uma data',
      description:
        'Retorna os slots disponíveis para agendamento com um profissional em uma data específica. ' +
        'Calcula os intervalos com base nas disponibilidades cadastradas, descontando ' +
        'consultas já agendadas e respeitando o intervalo entre consultas configurado no perfil. ' +
        'Não permite consultar datas passadas.',
    }),
    ApiUuidParam('userId', 'ID do usuário profissional.'),
    ApiQuery({
      name: 'date',
      required: true,
      description:
        'Data a ser consultada. ' +
        'Deve ser enviada EXATAMENTE no formato YYYY-MM-DD (ex: 2026-05-15). ' +
        'Não utilize timestamp ISO 8601 nem offset de timezone (ex: 2026-05-15T03:00:00-03:00) — ' +
        'enviar qualquer valor com fuso horário pode deslocar o dia UTC, ' +
        'alterar o weekday considerado na busca e retornar slots incorretos.',
      schema: {
        type: 'string',
        format: 'date',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        example: '2026-05-15',
      },
    }),
    ApiOkResponse({
      description: 'Slots disponíveis retornados com sucesso. Lista vazia quando não há horários livres.',
      schema: availableSlotsResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: true,
      includeConflict: false,
    }),
  );
}
