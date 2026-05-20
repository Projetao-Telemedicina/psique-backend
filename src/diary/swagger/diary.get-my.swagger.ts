import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DiaryFeeling, DiarySleepQuality } from '@prisma/client';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { diaryEntryListResponseSchema } from './diary.schemas';

export function GetMyDiaryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista registros do meu diario',
      description:
        'Retorna os registros do diario do paciente autenticado com filtros opcionais por sentimento, qualidade do sono e periodo.',
    }),
    ApiQuery({
      name: 'feeling',
      required: false,
      enum: DiaryFeeling,
      description: 'Filtra os registros pelo sentimento informado.',
    }),
    ApiQuery({
      name: 'sleepQuality',
      required: false,
      enum: DiarySleepQuality,
      description: 'Filtra os registros pela qualidade do sono informada.',
    }),
    ApiQuery({
      name: 'startDate',
      required: false,
      type: 'string',
      format: 'date-time',
      example: '2026-05-01T00:00:00.000Z',
      description: 'Data inicial para filtrar os registros (inclusive).',
    }),
    ApiQuery({
      name: 'endDate',
      required: false,
      type: 'string',
      format: 'date-time',
      example: '2026-05-31T23:59:59.999Z',
      description: 'Data final para filtrar os registros (inclusive).',
    }),
    ApiOkResponse({
      description: 'Registros retornados com sucesso.',
      schema: diaryEntryListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
